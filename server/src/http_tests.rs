use axum::{
    Router,
    body::{Body, to_bytes},
    http::{
        Method, Request, StatusCode,
        header::{AUTHORIZATION, CONTENT_TYPE},
    },
    response::Response,
};

use serde_json::{Value, json};

use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};

use tower::ServiceExt;

use crate::{AppState, auth::session::create_session, create_app_with_secret};

// ==========================================
// TEST DATABASE & APPLICATION
// ==========================================

async fn test_app() -> (Router, SqlitePool) {
    let options = SqliteConnectOptions::new()
        .in_memory(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect_with(options)
        .await
        .expect("Gagal membuat database pengujian");

    sqlx::migrate!("./migrations")
        .run(&pool)
        .await
        .expect("Gagal menjalankan migrasi");

    let state = AppState { db: pool.clone() };

    // Pengujian HTTP biasa tidak memerlukan kunci sidecar.
    // Mode ini dipilih eksplisit agar tidak bergantung
    // pada environment variable komputer.
    let app = create_app_with_secret(state, None);

    (app, pool)
}

// ==========================================
// HTTP REQUEST HELPER
// ==========================================

async fn send_request(
    app: &Router,
    method: Method,
    uri: &str,
    payload: Option<Value>,
    token: Option<&str>,
) -> Response {
    let mut request = Request::builder().method(method).uri(uri);

    if let Some(token) = token {
        request = request.header(AUTHORIZATION, format!("Bearer {token}"));
    }

    let body = if let Some(payload) = payload {
        request = request.header(CONTENT_TYPE, "application/json");

        Body::from(serde_json::to_vec(&payload).expect("Gagal membuat JSON request"))
    } else {
        Body::empty()
    };

    app.clone()
        .oneshot(request.body(body).expect("Gagal membuat HTTP request"))
        .await
        .expect("HTTP request gagal")
}

// ==========================================
// RESPONSE HELPER
// ==========================================

async fn response_json(response: Response) -> Value {
    let bytes = to_bytes(response.into_body(), 1024 * 1024)
        .await
        .expect("Gagal membaca HTTP response");

    serde_json::from_slice(&bytes).expect("Response bukan JSON valid")
}

// ==========================================
// AUTHENTICATION TEST HELPERS
// ==========================================

async fn register_viewer(app: &Router) {
    let response = send_request(
        app,
        Method::POST,
        "/api/auth/register",
        Some(json!({
            "email": "viewer@test.local",
            "password": "WaifuDesk-Test-2026!",
            "display_name": "Test Viewer"
        })),
        None,
    )
    .await;

    assert_eq!(response.status(), StatusCode::CREATED);
}

async fn login_viewer(app: &Router) -> String {
    let response = send_request(
        app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "email": "viewer@test.local",
            "password": "WaifuDesk-Test-2026!"
        })),
        None,
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);

    let body = response_json(response).await;

    assert_eq!(body["token_type"], "Bearer");

    let token = body["token"].as_str().expect("Token login tidak tersedia");

    assert_eq!(token.len(), 64);

    token.to_string()
}

// ==========================================
// TEST 1: UNAUTHORIZED
// ==========================================

#[tokio::test]
async fn protected_routes_reject_missing_or_invalid_token() {
    let (app, _pool) = test_app().await;

    // Endpoint terproteksi wajib menggunakan token.
    for uri in ["/api/auth/me", "/api/users"] {
        let response = send_request(&app, Method::GET, uri, None, None).await;

        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "Endpoint {uri} harus memerlukan login"
        );
    }

    // Token dengan format tidak valid harus ditolak.
    let response = send_request(
        &app,
        Method::GET,
        "/api/auth/me",
        None,
        Some("invalid-token"),
    )
    .await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ==========================================
// TEST 2: FULL AUTHENTICATION FLOW
// ==========================================

#[tokio::test]
async fn viewer_authentication_flow_works() {
    let (app, _pool) = test_app().await;

    // Register akun baru.
    register_viewer(&app).await;

    // Login dengan akun yang baru dibuat.
    let token = login_viewer(&app).await;

    // GET /api/auth/me
    let response = send_request(&app, Method::GET, "/api/auth/me", None, Some(&token)).await;

    assert_eq!(response.status(), StatusCode::OK);

    let profile = response_json(response).await;

    assert_eq!(profile["email"], "viewer@test.local");

    assert_eq!(profile["display_name"], "Test Viewer");

    assert_eq!(profile["roles"], json!(["Viewer"]));

    // GET /api/users
    // Viewer memiliki permission users.read.
    let response = send_request(&app, Method::GET, "/api/users", None, Some(&token)).await;

    assert_eq!(response.status(), StatusCode::OK);

    let users = response_json(response).await;

    assert_eq!(users.as_array().unwrap().len(), 1);

    // POST /api/auth/logout
    let response = send_request(&app, Method::POST, "/api/auth/logout", None, Some(&token)).await;

    assert_eq!(response.status(), StatusCode::NO_CONTENT);

    // Token yang dicabut tidak boleh digunakan lagi.
    let response = send_request(&app, Method::GET, "/api/auth/me", None, Some(&token)).await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
}

// ==========================================
// TEST 3: INVALID LOGIN
// ==========================================

#[tokio::test]
async fn wrong_password_and_unknown_email_are_rejected() {
    let (app, _pool) = test_app().await;

    register_viewer(&app).await;

    // Password salah.
    let wrong_password = send_request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "email": "viewer@test.local",
            "password": "Password-Salah-2026!"
        })),
        None,
    )
    .await;

    assert_eq!(wrong_password.status(), StatusCode::UNAUTHORIZED);

    let wrong_body = response_json(wrong_password).await;

    // Email tidak terdaftar.
    let unknown_email = send_request(
        &app,
        Method::POST,
        "/api/auth/login",
        Some(json!({
            "email": "unknown@test.local",
            "password": "Password-Salah-2026!"
        })),
        None,
    )
    .await;

    assert_eq!(unknown_email.status(), StatusCode::UNAUTHORIZED);

    let unknown_body = response_json(unknown_email).await;

    // Pesan error tidak boleh membocorkan
    // apakah email terdaftar atau tidak.
    assert_eq!(wrong_body, unknown_body);
}

// ==========================================
// TEST 4: DUPLICATE REGISTRATION
// ==========================================

#[tokio::test]
async fn duplicate_registration_is_rejected() {
    let (app, pool) = test_app().await;

    register_viewer(&app).await;

    // Mencoba mendaftarkan email yang sama.
    let response = send_request(
        &app,
        Method::POST,
        "/api/auth/register",
        Some(json!({
            "email": "viewer@test.local",
            "password": "Password-Baru-2026!",
            "display_name": "Duplicate Viewer"
        })),
        None,
    )
    .await;

    assert_eq!(response.status(), StatusCode::CONFLICT);

    // Database harus tetap memiliki satu pengguna.
    let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM users")
        .fetch_one(&pool)
        .await
        .unwrap();

    assert_eq!(count, 1);
}

// ==========================================
// TEST 5: FORBIDDEN (RBAC)
// ==========================================

#[tokio::test]
async fn authenticated_user_without_role_is_forbidden() {
    let (app, pool) = test_app().await;

    // Membuat akun tanpa role untuk pengujian.
    let user_id = sqlx::query(
        r#"
        INSERT INTO users (email, display_name)
        VALUES (?, ?)
        "#,
    )
    .bind("no-role@test.local")
    .bind("No Role User")
    .execute(&pool)
    .await
    .unwrap()
    .last_insert_rowid();

    // Token dibuat secara internal untuk tes.
    // Endpoint publik tidak menerima user_id bebas.
    let token = create_session(&pool, user_id).await.unwrap();

    let response = send_request(&app, Method::GET, "/api/users", None, Some(&token)).await;

    // Sudah login, tetapi tidak memiliki izin.
    assert_eq!(response.status(), StatusCode::FORBIDDEN);
}

// ==========================================
// TEST 6: SIDECAR BRIDGE SECURITY
// ==========================================

#[tokio::test]
async fn sidecar_bridge_requires_correct_secret() {
    let (_app, pool) = test_app().await;

    let secret = "waifudesk-test-bridge-key";

    let app = create_app_with_secret(AppState { db: pool }, Some(secret.to_string()));

    // Tanpa kunci internal harus ditolak.
    let no_key = Request::builder()
        .method(Method::GET)
        .uri("/api/health")
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(no_key).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Kunci salah harus ditolak.
    let wrong_key = Request::builder()
        .method(Method::GET)
        .uri("/api/health")
        .header("x-waifudesk-bridge-key", "wrong-key")
        .body(Body::empty())
        .unwrap();

    let response = app.clone().oneshot(wrong_key).await.unwrap();

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    // Kunci benar harus diterima.
    let correct_key = Request::builder()
        .method(Method::GET)
        .uri("/api/health")
        .header("x-waifudesk-bridge-key", secret)
        .body(Body::empty())
        .unwrap();

    let response = app.oneshot(correct_key).await.unwrap();

    assert_eq!(response.status(), StatusCode::OK);
}
