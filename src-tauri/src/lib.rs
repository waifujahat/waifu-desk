mod codex_directory;
mod git_tools;
mod usage;

use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

#[tauri::command]
fn toggle_compact_window(app: AppHandle) -> Result<String, String> {
    if let Some(window) = app.get_webview_window("widget") {
        if window.is_visible().map_err(|e| e.to_string())? {
            window.hide().map_err(|e| e.to_string())?;
            Ok("hidden".to_string())
        } else {
            window.show().map_err(|e| e.to_string())?;
            window.set_focus().map_err(|e| e.to_string())?;
            Ok("visible".to_string())
        }
    } else {
        WebviewWindowBuilder::new(
            &app,
            "widget",
            WebviewUrl::App("index.html?widget=1".into()),
        )
        .title("WaifuDesk · Mini")
        .inner_size(386.0, 500.0)
        .min_inner_size(330.0, 390.0)
        .always_on_top(true)
        .resizable(true)
        .build()
        .map_err(|e| e.to_string())?;
        Ok("visible".to_string())
    }
}

#[tauri::command]
fn get_local_codex_usage() -> Result<usage::CodexSnapshot, String> {
    usage::scan_codex_usage()
}

#[tauri::command]
fn get_codex_directory() -> Result<codex_directory::DirectorySettings, String> {
    codex_directory::get_directory()
}

#[tauri::command]
fn set_codex_directory(path: String) -> Result<codex_directory::DirectorySettings, String> {
    codex_directory::set_directory(path)
}

#[tauri::command]
fn reset_codex_directory() -> Result<codex_directory::DirectorySettings, String> {
    codex_directory::reset_directory()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            get_local_codex_usage,
            get_codex_directory,
            set_codex_directory,
            reset_codex_directory,
            toggle_compact_window,
            git_tools::inspect_local_repository,
            git_tools::generate_release_notes
        ])
        .run(tauri::generate_context!())
        .expect("error running WaifuDesk");
}
