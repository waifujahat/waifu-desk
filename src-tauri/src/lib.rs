mod api_bridge;
mod codex_directory;
mod git_tools;
mod usage;

use std::{error::Error, io, net::TcpListener, sync::Mutex};

use tauri::{App, AppHandle, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

use tauri_plugin_shell::{
    process::{CommandChild, CommandEvent},
    ShellExt,
};

struct BackendProcess(Mutex<Option<CommandChild>>);
struct SidecarSecret(String);

fn start_backend(app: &mut App) -> Result<(), Box<dyn Error>> {
    let port_probe = TcpListener::bind("127.0.0.1:3001").map_err(|error| {
        io::Error::new(
            io::ErrorKind::AddrInUse,
            format!(
                "WaifuDesk API tidak dapat dimulai. \
                 Port 3001 sedang digunakan: {error}"
            ),
        )
    })?;

    drop(port_probe);
    let data_directory = app.path().app_local_data_dir()?;

    std::fs::create_dir_all(&data_directory)?;

    let database_path = data_directory.join("waifudesk.db");

    let random_bytes: [u8; 32] = rand::random();

    let secret: String = random_bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect();

    let command = app
        .shell()
        .sidecar("waifudesk-api")?
        .env("WAIFUDESK_DATABASE_PATH", database_path.as_os_str())
        .env("WAIFUDESK_API_SECRET", &secret);

    app.manage(SidecarSecret(secret));

    let (mut receiver, child) = command.spawn()?;

    println!("WaifuDesk API sidecar started (PID {})", child.pid());

    app.manage(BackendProcess(Mutex::new(Some(child))));

    tauri::async_runtime::spawn(async move {
        while let Some(event) = receiver.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    println!("[WaifuDesk API] {}", String::from_utf8_lossy(&line));
                }

                CommandEvent::Stderr(line) => {
                    eprintln!("[WaifuDesk API] {}", String::from_utf8_lossy(&line));
                }

                CommandEvent::Error(error) => {
                    eprintln!("[WaifuDesk API] {error}");
                }

                CommandEvent::Terminated(status) => {
                    println!(
                        "[WaifuDesk API] Process terminated: \
                         {:?}",
                        status.code
                    );
                    break;
                }

                _ => {}
            }
        }
    });

    Ok(())
}

fn stop_backend(app: &AppHandle) {
    let Some(state) = app.try_state::<BackendProcess>() else {
        return;
    };

    let child = match state.0.lock() {
        Ok(mut process) => process.take(),

        Err(error) => {
            eprintln!("Cannot lock backend process: {error}");
            return;
        }
    };

    if let Some(child) = child {
        if let Err(error) = child.kill() {
            eprintln!("Cannot stop backend: {error}");
        } else {
            println!("WaifuDesk API sidecar stopped");
        }
    }
}

#[tauri::command]
fn toggle_compact_window(app: AppHandle) -> Result<String, String> {
    if let Some(window) = app.get_webview_window("widget") {
        if window.is_visible().map_err(|error| error.to_string())? {
            window.hide().map_err(|error| error.to_string())?;

            Ok("hidden".to_string())
        } else {
            window.show().map_err(|error| error.to_string())?;

            window.set_focus().map_err(|error| error.to_string())?;

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
        .map_err(|error| error.to_string())?;

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
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            start_backend(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_local_codex_usage,
            get_codex_directory,
            set_codex_directory,
            reset_codex_directory,
            toggle_compact_window,
            git_tools::inspect_local_repository,
            git_tools::generate_release_notes,
            api_bridge::auth_api_request,
        ])
        .build(tauri::generate_context!())
        .expect("Failed to build WaifuDesk");

    app.run(|app_handle, event| {
        if let RunEvent::Exit = event {
            stop_backend(app_handle);
        }
    });
}
