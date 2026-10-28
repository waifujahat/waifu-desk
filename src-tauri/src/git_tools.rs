use git2::{Repository, Sort, Status, StatusOptions};
use serde::Serialize;
use std::io::Write;
use std::io::{Read, Seek, SeekFrom};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::process::Stdio;
use std::thread;
use std::time::{Duration, Instant};

const MAX_FILES: usize = 100;
const MAX_COMMITS: usize = 20;
const MAX_NOTES_BYTES: usize = 96_000;
const GIT_CLIFF_TIMEOUT: Duration = Duration::from_secs(30);
const MAX_ERROR_BYTES: usize = 4_096;
const PROCESS_POLL_INTERVAL: Duration = Duration::from_millis(50);

#[derive(Debug, Serialize)]
pub struct ChangedFile {
    path: String,
    status: String,
}

#[derive(Debug, Serialize)]
pub struct LocalCommit {
    hash: String,
    summary: String,
    author: String,
    date: String,
}

#[derive(Debug, Serialize)]
pub struct LocalGitSnapshot {
    path: String,
    name: String,
    branch: String,
    head: Option<String>,
    total_changes: usize,
    files: Vec<ChangedFile>,
    commits: Vec<LocalCommit>,
}

fn open_selected_repo(path: &str) -> Result<(Repository, PathBuf), String> {
    let selected = Path::new(path)
        .canonicalize()
        .map_err(|_| "Folder tidak ditemukan atau tidak dapat dibaca.".to_string())?;
    if !selected.is_dir() {
        return Err("Pilih folder repository Git, bukan sebuah file.".to_string());
    }
    // Do not walk upwards and accidentally inspect some unrelated parent repository.
    let repo = Repository::open(&selected).map_err(|_| {
        "Folder ini bukan root repository Git. Pilih folder yang memiliki .git.".to_string()
    })?;
    let workdir = repo
        .workdir()
        .ok_or_else(|| "Bare repository belum didukung.".to_string())?
        .canonicalize()
        .map_err(|error| format!("Tidak dapat membaca working directory: {error}"))?;
    if selected != workdir {
        return Err("Pilih root working directory repository Git.".to_string());
    }
    Ok((repo, workdir))
}

fn status_name(status: Status) -> &'static str {
    if status.contains(Status::CONFLICTED) {
        "Conflict"
    } else if status.intersects(Status::INDEX_NEW | Status::WT_NEW) {
        "New"
    } else if status.intersects(Status::INDEX_DELETED | Status::WT_DELETED) {
        "Deleted"
    } else if status.intersects(Status::INDEX_RENAMED | Status::WT_RENAMED) {
        "Renamed"
    } else if status.intersects(Status::INDEX_MODIFIED | Status::WT_MODIFIED) {
        "Modified"
    } else {
        "Changed"
    }
}

#[tauri::command]
pub async fn inspect_local_repository(path: String) -> Result<LocalGitSnapshot, String> {
    tauri::async_runtime::spawn_blocking(move || inspect_repository(&path))
        .await
        .map_err(|error| format!("Gagal menjalankan pemeriksaan Git: {error}"))?
}

fn inspect_repository(path: &str) -> Result<LocalGitSnapshot, String> {
    let (repo, workdir) = open_selected_repo(path)?;
    let branch = repo
        .head()
        .ok()
        .and_then(|head| head.shorthand().ok().map(str::to_owned))
        .unwrap_or_else(|| "(belum ada branch)".to_owned());
    let head = repo
        .head()
        .ok()
        .and_then(|reference| reference.target())
        .map(|oid| oid.to_string());

    let mut options = StatusOptions::new();
    options
        .include_untracked(true)
        .recurse_untracked_dirs(true)
        .renames_head_to_index(true);
    let statuses = repo
        .statuses(Some(&mut options))
        .map_err(|error| format!("Tidak dapat membaca status Git: {error}"))?;
    let total_changes = statuses.len();
    let files = statuses
        .iter()
        .take(MAX_FILES)
        .map(|entry| ChangedFile {
            path: entry
                .path()
                .unwrap_or("(nama file tidak tersedia)")
                .to_owned(),
            status: status_name(entry.status()).to_owned(),
        })
        .collect();

    let mut commits = Vec::new();
    if !repo.is_empty().map_err(|error| error.to_string())? {
        let mut walk = repo.revwalk().map_err(|error| error.to_string())?;
        walk.push_head().map_err(|error| error.to_string())?;
        walk.set_sorting(Sort::TIME)
            .map_err(|error| error.to_string())?;
        for oid in walk.take(MAX_COMMITS) {
            let commit = repo
                .find_commit(oid.map_err(|error| error.to_string())?)
                .map_err(|error| error.to_string())?;
            let author = commit.author();
            commits.push(LocalCommit {
                hash: commit.id().to_string(),
                summary: commit
                    .summary()
                    .ok()
                    .flatten()
                    .unwrap_or("(tanpa pesan)")
                    .to_owned(),
                author: author.name().unwrap_or("Unknown").to_owned(),
                date: chrono::DateTime::from_timestamp(commit.time().seconds(), 0)
                    .map(|date| date.to_rfc3339())
                    .unwrap_or_default(),
            });
        }
    }
    let name = workdir
        .file_name()
        .map(|name| name.to_string_lossy().into_owned())
        .unwrap_or_else(|| "Repository".to_owned());
    Ok(LocalGitSnapshot {
        path: workdir.to_string_lossy().into_owned(),
        name,
        branch,
        head,
        total_changes,
        files,
        commits,
    })
}

#[tauri::command]
pub async fn generate_release_notes(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || build_release_notes(&path))
        .await
        .map_err(|error| format!("Gagal menjalankan git-cliff: {error}"))?
}

fn build_release_notes(path: &str) -> Result<String, String> {
    let (repo, workdir) = open_selected_repo(path)?;

    if repo.is_empty().map_err(|error| error.to_string())? {
        return Err("Repository belum memiliki commit untuk dibuatkan release notes.".to_string());
    }

    let mut config = tempfile::Builder::new()
        .suffix(".toml")
        .tempfile()
        .map_err(|error| format!("Tidak bisa membuat konfigurasi sementara: {error}"))?;

    config
        .write_all(include_str!("git_tools_cliff.toml").as_bytes())
        .map_err(|error| format!("Tidak bisa menulis konfigurasi sementara: {error}"))?;

    let mut stdout_file = tempfile::tempfile()
        .map_err(|error| format!("Tidak bisa membuat output sementara: {error}"))?;

    let mut stderr_file = tempfile::tempfile()
        .map_err(|error| format!("Tidak bisa membuat error log sementara: {error}"))?;

    let stdout = stdout_file
        .try_clone()
        .map_err(|error| format!("Tidak bisa menyiapkan stdout: {error}"))?;

    let stderr = stderr_file
        .try_clone()
        .map_err(|error| format!("Tidak bisa menyiapkan stderr: {error}"))?;

    let mut child = Command::new("git-cliff")
        .arg("--config")
        .arg(config.path())
        .arg("--repository")
        .arg(&workdir)
        .arg("--no-exec")
        .arg("--offline")
        .env_remove("GIT_CLIFF_OUTPUT")
        .env_remove("GIT_CLIFF_PREPEND")
        .current_dir(&workdir)
        .stdin(Stdio::null())
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr))
        .spawn()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "git-cliff belum terinstal. Jalankan `cargo install git-cliff --locked`, lalu restart aplikasi.".to_owned()
            } else {
                format!("Tidak bisa menjalankan git-cliff: {error}")
            }
        })?;

    let started = Instant::now();

    let status = loop {
        let status = match child.try_wait() {
            Ok(status) => status,
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("Gagal memeriksa proses git-cliff: {error}"));
            }
        };

        let stdout_size = stdout_file.metadata().map(|metadata| metadata.len());
        let stderr_size = stderr_file.metadata().map(|metadata| metadata.len());

        let (stdout_size, stderr_size) = match (stdout_size, stderr_size) {
            (Ok(stdout_size), Ok(stderr_size)) => (stdout_size, stderr_size),
            _ => {
                let _ = child.kill();
                let _ = child.wait();
                return Err("Tidak bisa memeriksa ukuran output git-cliff.".to_owned());
            }
        };

        if stdout_size > MAX_NOTES_BYTES as u64 || stderr_size > MAX_ERROR_BYTES as u64 {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Output git-cliff melewati batas pratinjau.".to_owned());
        }

        if let Some(status) = status {
            break status;
        }

        if started.elapsed() >= GIT_CLIFF_TIMEOUT {
            let _ = child.kill();
            let _ = child.wait();
            return Err("Proses git-cliff melewati batas waktu 30 detik.".to_owned());
        }

        thread::sleep(PROCESS_POLL_INTERVAL);
    };

    if !status.success() {
        stderr_file
            .seek(SeekFrom::Start(0))
            .map_err(|error| format!("Tidak bisa membaca error log: {error}"))?;

        let mut error_bytes = Vec::new();

        stderr_file
            .take(MAX_ERROR_BYTES as u64)
            .read_to_end(&mut error_bytes)
            .map_err(|error| format!("Tidak bisa membaca error git-cliff: {error}"))?;

        let message = String::from_utf8_lossy(&error_bytes);

        return Err(format!("git-cliff gagal: {}", message.trim()));
    }

    stdout_file
        .seek(SeekFrom::Start(0))
        .map_err(|error| format!("Tidak bisa membaca release notes: {error}"))?;

    let mut output = Vec::new();

    stdout_file
        .take(MAX_NOTES_BYTES as u64 + 1)
        .read_to_end(&mut output)
        .map_err(|error| format!("Gagal membaca release notes: {error}"))?;

    if output.len() > MAX_NOTES_BYTES {
        return Err("Release notes terlalu panjang untuk pratinjau.".to_owned());
    }

    let notes = String::from_utf8(output)
        .map_err(|_| "Output git-cliff bukan UTF-8 yang valid.".to_owned())?;

    if notes.trim().is_empty() {
        return Err("git-cliff tidak menghasilkan catatan rilis untuk histori ini.".to_owned());
    }

    Ok(notes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn status_priority_handles_conflicts_and_untracked_files() {
        assert_eq!(
            status_name(Status::CONFLICTED | Status::WT_MODIFIED),
            "Conflict"
        );
        assert_eq!(status_name(Status::WT_NEW), "New");
        assert_eq!(status_name(Status::INDEX_DELETED), "Deleted");
    }

    #[test]
    fn rejects_non_repository_folder() {
        let temporary = tempfile::tempdir().expect("temp dir");
        let result = open_selected_repo(temporary.path().to_str().expect("valid path"));
        assert!(result.is_err());
    }
}
