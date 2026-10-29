mod auth;
#[cfg(test)]
mod http_tests;

use std::path::PathBuf;

use axum::{
    Json, Router,
    extract::State,
    http::StatusCode,
    routing::{get, post},
};
use serde::Serialize;
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};

#[derive(Clone)]
struct AppState {
    db: SqlitePool,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

#[derive(Serialize)]
struct DatabaseResponse {
    status: &'static str,
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "waifudesk-api",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn database_check(
    State(state): State<AppState>,
) -> Result<Json<DatabaseResponse>, StatusCode> {
    let result: i64 = sqlx::query_scalar("SELECT 1")
        .fetch_one(&state.db)
        .await
        .map_err(|_| StatusCode::SERVICE_UNAVAILABLE)?;

    if result != 1 {
        return Err(StatusCode::SERVICE_UNAVAILABLE);
    }

    Ok(Json(DatabaseResponse { status: "ok" }))
}

fn create_app(state: AppState) -> Router {
    Router::new()
        // Health
        .route("/api/health", get(health_check))
        .route("/api/health/database", get(database_check))
        .route("/api/auth/register", post(auth::handlers::register))
        .route("/api/auth/login", post(auth::handlers::login))
        .route("/api/auth/me", get(auth::handlers::me))
        .route("/api/auth/logout", post(auth::handlers::logout))
        .route("/api/users", get(auth::handlers::list_users))
        .with_state(state)
}

async fn initialize_database() -> Result<SqlitePool, Box<dyn std::error::Error>> {
    let database_path = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("waifudesk.db");

    let options = SqliteConnectOptions::new()
        .filename(database_path)
        .create_if_missing(true)
        .foreign_keys(true);

    let pool = SqlitePoolOptions::new()
        .max_connections(5)
        .connect_with(options)
        .await?;

    sqlx::migrate!("./migrations").run(&pool).await?;

    Ok(pool)
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Database harus siap sebelum API menerima request.
    let database = initialize_database().await?;

    let state = AppState { db: database };

    // Backend masih berjalan secara lokal.
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;

    println!("WaifuDesk API: http://127.0.0.1:3001");
    println!("SQLite: database initialized");

    axum::serve(listener, create_app(state)).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    async fn test_database() -> SqlitePool {
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
            .expect("Migrasi database gagal");

        pool
    }

    #[tokio::test]
    async fn health_response_contains_expected_values() {
        let response = health_check().await;

        assert_eq!(response.0.status, "ok");
        assert_eq!(response.0.service, "waifudesk-api");
        assert_eq!(response.0.version, env!("CARGO_PKG_VERSION"));
    }

    #[tokio::test]
    async fn database_check_returns_ok() {
        let pool = test_database().await;

        let state = AppState { db: pool };

        let response = database_check(State(state))
            .await
            .expect("Database seharusnya tersedia");

        assert_eq!(response.0.status, "ok");
    }

    #[tokio::test]
    async fn migrations_create_required_tables() {
        let pool = test_database().await;

        let count: i64 = sqlx::query_scalar(
            r#"
            SELECT COUNT(*)
            FROM sqlite_master
            WHERE type = 'table'
              AND name IN (
                  'users',
                  'roles',
                  'permissions',
                  'user_roles',
                  'role_permissions',
                  'sessions'
              )
            "#,
        )
        .fetch_one(&pool)
        .await
        .expect("Gagal membaca skema database");

        assert_eq!(count, 6);
    }

    #[tokio::test]
    async fn migrations_seed_roles_and_permissions() {
        let pool = test_database().await;

        let expected = [("Admin", 5_i64), ("Operator", 3_i64), ("Viewer", 1_i64)];

        for (role, expected_count) in expected {
            let actual_count: i64 = sqlx::query_scalar(
                r#"
                SELECT COUNT(*)
                FROM role_permissions rp
                JOIN roles r
                    ON r.id = rp.role_id
                WHERE r.name = ?
                "#,
            )
            .bind(role)
            .fetch_one(&pool)
            .await
            .expect("Gagal membaca permission");

            assert_eq!(
                actual_count, expected_count,
                "Jumlah permission untuk role {role} tidak sesuai"
            );
        }
    }
}
