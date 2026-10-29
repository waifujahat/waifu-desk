use axum::{Json, Router, routing::get};
use serde::Serialize;

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

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let app = create_app();

    let listener = tokio::net::TcpListener::bind("127.0.0.1:3001").await?;

    println!("WaifuDesk API : http://127.0.0.1:3001");

    axum::serve(listener, app).await?;

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
}
