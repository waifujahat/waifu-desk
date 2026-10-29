use axum::{Json, Router, routing::get};
use serde::Serialize;
use sqlx::{
    SqlitePool,
    sqlite::{SqliteConnectOptions, SqlitePoolOptions},
};
use std::path::PathBuf;

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
    version: &'static str,
}

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "waifudesk-api",
        version: env!("CARGO_PKG_VERSION"),
    })
}

fn create_app() -> Router {
    Router::new().route("/api/health", get(health_check))
}

// Menghubungkan SQLite dan menjalankan migrasi database.
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
    let _database = initialize_database().await?;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;

    println!("WaifuDesk API: http://127.0.0.1:3001");
    println!("SQLite: database initialized");

    axum::serve(listener, create_app()).await?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn health_response_contains_expected_values() {
        let response = health_check().await;

        assert_eq!(response.0.status, "ok");
        assert_eq!(response.0.service, "waifudesk-api");
        assert_eq!(response.0.version, env!("CARGO_PKG_VERSION"));
    }

    #[tokio::test]
    async fn migrations_create_required_tables() {
        let options = SqliteConnectOptions::new()
            .in_memory(true)
            .foreign_keys(true);

        // Satu koneksi agar database in-memory tetap konsisten.
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect_with(options)
            .await
            .expect("Gagal membuat database pengujian");

        sqlx::migrate!("./migrations")
            .run(&pool)
            .await
            .expect("Migrasi gagal");

        let count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master
             WHERE type = 'table'
             AND name IN (
                 'users',
                 'roles',
                 'permissions',
                 'user_roles',
                 'role_permissions',
                 'sessions'
             )",
        )
        .fetch_one(&pool)
        .await
        .expect("Gagal membaca skema database");

        assert_eq!(count, 6);
    }
}
