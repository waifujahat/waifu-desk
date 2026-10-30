use std::time::Duration;

use reqwest::{Client, Method};
use serde::Serialize;
use serde_json::Value;
use tauri::{AppHandle, Manager};

use crate::SidecarSecret;

#[derive(Serialize)]
pub struct ApiReply {
    status: u16,
    body: Value,
}

fn is_allowed(method: &str, path: &str) -> bool {
    matches!(
        (method, path),
        ("POST", "/auth/register")
            | ("POST", "/auth/login")
            | ("GET", "/auth/me")
            | ("POST", "/auth/logout")
            | ("GET", "/users")
    )
}

#[tauri::command]
pub async fn auth_api_request(
    app: AppHandle,
    method: String,
    path: String,
    body: Option<Value>,
    token: Option<String>,
) -> Result<ApiReply, String> {
    if !is_allowed(&method, &path) {
        return Err("Endpoint API tidak diizinkan".into());
    }

    if let Some(ref payload) = body {
        if payload.to_string().len() > 16 * 1024 {
            return Err("Ukuran request terlalu besar".into());
        }
    }

    let secret = app
        .try_state::<SidecarSecret>()
        .ok_or("API sidecar belum siap")?;

    let client = Client::builder()
        .timeout(Duration::from_secs(10))
        .redirect(reqwest::redirect::Policy::none())
        .no_proxy()
        .build()
        .map_err(|_| "Gagal membuat HTTP client")?;

    let http_method =
        Method::from_bytes(method.as_bytes()).map_err(|_| "Metode HTTP tidak valid")?;

    let url = format!("http://127.0.0.1:3001/api{path}");

    let mut request = client
        .request(http_method, url)
        .header("x-waifudesk-bridge-key", &secret.0);

    if let Some(token) = token {
        request = request.bearer_auth(token);
    }

    if let Some(body) = body {
        request = request.json(&body);
    }

    let response = request
        .send()
        .await
        .map_err(|_| "Rust API belum dapat dihubungi")?;

    let status = response.status().as_u16();

    let text = response
        .text()
        .await
        .map_err(|_| "Gagal membaca respons API")?;

    let body = if text.is_empty() {
        Value::Null
    } else {
        serde_json::from_str(&text).map_err(|_| "Respons API bukan JSON")?
    };

    Ok(ApiReply { status, body })
}
