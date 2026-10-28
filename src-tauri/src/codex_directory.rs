//! Read-only Codex data source preference for WaifuDesk.
//! Only the chosen directory path is stored; no Codex log or credentials are copied.
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize, Deserialize)]
struct StoredSource {
    path: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DirectorySettings {
    pub path: String,
    pub source: String,
    pub available: bool,
}

fn settings_file() -> Result<PathBuf, String> {
    dirs::config_dir()
        .map(|path| path.join("waifudesk").join("codex-source.json"))
        .ok_or_else(|| "Tidak dapat menemukan folder pengaturan Windows.".to_string())
}

fn stored_home() -> Option<PathBuf> {
    let raw = fs::read_to_string(settings_file().ok()?).ok()?;
    let entry: StoredSource = serde_json::from_str(&raw).ok()?;
    if entry.path.trim().is_empty() {
        None
    } else {
        Some(PathBuf::from(entry.path))
    }
}

fn environment_home() -> Option<PathBuf> {
    std::env::var_os("CODEX_HOME")
        .filter(|value| !value.is_empty())
        .map(PathBuf::from)
}

pub fn codex_home() -> Option<PathBuf> {
    stored_home()
        .or_else(environment_home)
        .or_else(|| dirs::home_dir().map(|home| home.join(".codex")))
}

fn valid_data_directory(path: &Path) -> bool {
    path.is_dir() && (path.join("sessions").is_dir() || path.join("archived_sessions").is_dir())
}

pub fn get_directory() -> Result<DirectorySettings, String> {
    let (directory, source) = if let Some(path) = stored_home() {
        (path, "Dipilih pengguna")
    } else if let Some(path) = environment_home() {
        (path, "CODEX_HOME")
    } else {
        (
            dirs::home_dir()
                .ok_or("Folder home tidak ditemukan")?
                .join(".codex"),
            "Otomatis",
        )
    };
    Ok(DirectorySettings {
        path: directory.to_string_lossy().into_owned(),
        source: source.to_string(),
        available: valid_data_directory(&directory),
    })
}

pub fn set_directory(path: String) -> Result<DirectorySettings, String> {
    let requested = PathBuf::from(path.trim());
    let canonical = requested
        .canonicalize()
        .map_err(|_| "Folder yang dipilih tidak ditemukan atau tidak dapat diakses.".to_string())?;
    if !valid_data_directory(&canonical) {
        return Err(
            "Pilih folder Codex yang berisi subfolder sessions atau archived_sessions.".into(),
        );
    }
    let target = settings_file()?;
    if let Some(parent) = target.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Gagal menyiapkan pengaturan: {e}"))?;
    }
    let source = StoredSource {
        path: canonical.to_string_lossy().into_owned(),
    };
    let json = serde_json::to_vec_pretty(&source).map_err(|e| e.to_string())?;
    fs::write(target, json).map_err(|e| format!("Gagal menyimpan pengaturan: {e}"))?;
    get_directory()
}

pub fn reset_directory() -> Result<DirectorySettings, String> {
    let target = settings_file()?;
    if target.exists() {
        fs::remove_file(target).map_err(|e| format!("Gagal mereset pengaturan: {e}"))?;
    }
    get_directory()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_only_codex_session_directories() {
        let stamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::env::temp_dir().join(format!(
            "waifudesk-source-test-{}-{stamp}",
            std::process::id()
        ));
        fs::create_dir_all(&root).unwrap();
        assert!(!valid_data_directory(&root));
        fs::create_dir_all(root.join("sessions")).unwrap();
        assert!(valid_data_directory(&root));
        fs::remove_dir_all(&root).unwrap();
        assert!(!valid_data_directory(&root));
    }
}
