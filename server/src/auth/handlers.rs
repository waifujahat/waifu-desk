use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode, header::AUTHORIZATION},
};
use serde::{Deserialize, Serialize};

use super::{
    password::{hash_password, verify_password},
    permissions::has_permission,
    session::{create_session, get_session_user, revoke_session},
};
use crate::AppState;

#[derive(Deserialize)]
pub struct RegisterRequest {
    email: String,
    password: String,
    display_name: String,
}

#[derive(Serialize)]
pub struct RegisterResponse {
    id: i64,
    message: &'static str,
}

#[derive(Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    token: String,
    token_type: &'static str,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    error: &'static str,
}

#[derive(Serialize)]
pub struct ProfileResponse {
    id: i64,
    email: String,
    display_name: String,
    roles: Vec<String>,
}

#[derive(Serialize)]
pub struct UserSummary {
    id: i64,
    email: String,
    display_name: String,
}

type ApiError = (StatusCode, Json<ErrorResponse>);

fn api_error(status: StatusCode, message: &'static str) -> ApiError {
    (status, Json(ErrorResponse { error: message }))
}

async fn hash_password_async(password: String) -> Result<String, ApiError> {
    let result = tokio::task::spawn_blocking(move || hash_password(&password))
        .await
        .map_err(|_| {
            api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Terjadi kesalahan server",
            )
        })?;

    result.map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Terjadi kesalahan server",
        )
    })
}

async fn verify_password_async(password: String, hash: String) -> Result<bool, ApiError> {
    tokio::task::spawn_blocking(move || verify_password(&password, &hash))
        .await
        .map_err(|_| {
            api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Terjadi kesalahan server",
            )
        })
}

fn bearer_token(headers: &HeaderMap) -> Result<&str, ApiError> {
    let authorization = headers
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| api_error(StatusCode::UNAUTHORIZED, "Token autentikasi diperlukan"))?;

    let (scheme, token) = authorization
        .split_once(' ')
        .ok_or_else(|| api_error(StatusCode::UNAUTHORIZED, "Format token tidak valid"))?;

    if !scheme.eq_ignore_ascii_case("Bearer")
        || token.len() != 64
        || !token.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Err(api_error(
            StatusCode::UNAUTHORIZED,
            "Format token tidak valid",
        ));
    }

    Ok(token)
}

async fn authenticated_user_id(state: &AppState, headers: &HeaderMap) -> Result<i64, ApiError> {
    let token = bearer_token(headers)?;

    let user_id = get_session_user(&state.db, token).await.map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Terjadi kesalahan server",
        )
    })?;

    user_id.ok_or_else(|| {
        api_error(
            StatusCode::UNAUTHORIZED,
            "Sesi tidak valid atau sudah kedaluwarsa",
        )
    })
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<RegisterResponse>), ApiError> {
    let email = payload.email.trim().to_lowercase();
    let display_name = payload.display_name.trim();

    if email.is_empty()
        || email.len() > 254
        || !email.contains('@')
        || email.contains(char::is_whitespace)
        || display_name.is_empty()
        || display_name.len() > 100
        || payload.password.len() < 12
        || payload.password.len() > 128
    {
        return Err(api_error(
            StatusCode::BAD_REQUEST,
            "Data registrasi tidak valid",
        ));
    }

    let password_hash = hash_password_async(payload.password).await?;

    let mut tx = state.db.begin().await.map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Terjadi kesalahan server",
        )
    })?;

    let result = sqlx::query(
        r#"
        INSERT INTO users (
            email,
            password_hash,
            display_name
        )
        VALUES (?, ?, ?)
        "#,
    )
    .bind(&email)
    .bind(&password_hash)
    .bind(display_name)
    .execute(&mut *tx)
    .await;

    let user_id = match result {
        Ok(result) => result.last_insert_rowid(),

        Err(error)
            if error
                .as_database_error()
                .is_some_and(|db| db.is_unique_violation()) =>
        {
            return Err(api_error(StatusCode::CONFLICT, "Email sudah terdaftar"));
        }

        Err(_) => {
            return Err(api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Terjadi kesalahan server",
            ));
        }
    };

    let viewer_role_id: i64 = sqlx::query_scalar("SELECT id FROM roles WHERE name = 'Viewer'")
        .fetch_one(&mut *tx)
        .await
        .map_err(|_| {
            api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Role Viewer tidak tersedia",
            )
        })?;

    sqlx::query(
        r#"
        INSERT INTO user_roles (user_id, role_id)
        VALUES (?, ?)
        "#,
    )
    .bind(user_id)
    .bind(viewer_role_id)
    .execute(&mut *tx)
    .await
    .map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Gagal menetapkan role pengguna",
        )
    })?;

    tx.commit()
        .await
        .map_err(|_| api_error(StatusCode::INTERNAL_SERVER_ERROR, "Gagal menyimpan akun"))?;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            id: user_id,
            message: "Akun berhasil dibuat",
        }),
    ))
}

pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, ApiError> {
    let email = payload.email.trim().to_lowercase();

    if email.is_empty()
        || email.len() > 254
        || payload.password.is_empty()
        || payload.password.len() > 128
    {
        return Err(api_error(
            StatusCode::UNAUTHORIZED,
            "Email atau password salah",
        ));
    }

    let user: Option<(i64, Option<String>)> = sqlx::query_as(
        r#"
            SELECT id, password_hash
            FROM users
            WHERE email = ?
            "#,
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Terjadi kesalahan server",
        )
    })?;

    let Some((user_id, Some(password_hash))) = user else {
        return Err(api_error(
            StatusCode::UNAUTHORIZED,
            "Email atau password salah",
        ));
    };

    let valid = verify_password_async(payload.password, password_hash).await?;

    if !valid {
        return Err(api_error(
            StatusCode::UNAUTHORIZED,
            "Email atau password salah",
        ));
    }

    let token = create_session(&state.db, user_id)
        .await
        .map_err(|_| api_error(StatusCode::INTERNAL_SERVER_ERROR, "Gagal membuat sesi"))?;

    Ok(Json(LoginResponse {
        token,
        token_type: "Bearer",
    }))
}

pub async fn me(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<ProfileResponse>, ApiError> {
    let user_id = authenticated_user_id(&state, &headers).await?;

    let user: Option<(i64, String, String)> = sqlx::query_as(
        r#"
            SELECT id, email, display_name
            FROM users
            WHERE id = ?
            "#,
    )
    .bind(user_id)
    .fetch_optional(&state.db)
    .await
    .map_err(|_| api_error(StatusCode::INTERNAL_SERVER_ERROR, "Gagal membaca profil"))?;

    let Some((id, email, display_name)) = user else {
        return Err(api_error(
            StatusCode::UNAUTHORIZED,
            "Pengguna tidak ditemukan",
        ));
    };

    let roles: Vec<String> = sqlx::query_scalar(
        r#"
        SELECT roles.name
        FROM roles
        JOIN user_roles
            ON user_roles.role_id = roles.id
        WHERE user_roles.user_id = ?
        ORDER BY roles.name
        "#,
    )
    .bind(user_id)
    .fetch_all(&state.db)
    .await
    .map_err(|_| api_error(StatusCode::INTERNAL_SERVER_ERROR, "Gagal membaca role"))?;

    Ok(Json(ProfileResponse {
        id,
        email,
        display_name,
        roles,
    }))
}

pub async fn logout(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<StatusCode, ApiError> {
    // Token wajib valid sebelum melakukan logout.
    authenticated_user_id(&state, &headers).await?;

    let token = bearer_token(&headers)?;

    revoke_session(&state.db, token)
        .await
        .map_err(|_| api_error(StatusCode::INTERNAL_SERVER_ERROR, "Gagal menghapus sesi"))?;

    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_users(
    State(state): State<AppState>,
    headers: HeaderMap,
) -> Result<Json<Vec<UserSummary>>, ApiError> {
    let user_id = authenticated_user_id(&state, &headers).await?;

    // Memeriksa permission dari database.
    let allowed = has_permission(&state.db, user_id, "users.read")
        .await
        .map_err(|_| {
            api_error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Gagal memeriksa permission",
            )
        })?;

    if !allowed {
        return Err(api_error(
            StatusCode::FORBIDDEN,
            "Tidak memiliki permission users.read",
        ));
    }

    let users: Vec<(i64, String, String)> = sqlx::query_as(
        r#"
            SELECT id, email, display_name
            FROM users
            ORDER BY id
            LIMIT 100
            "#,
    )
    .fetch_all(&state.db)
    .await
    .map_err(|_| {
        api_error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Gagal membaca data pengguna",
        )
    })?;

    let result = users
        .into_iter()
        .map(|(id, email, display_name)| UserSummary {
            id,
            email,
            display_name,
        })
        .collect();

    Ok(Json(result))
}
