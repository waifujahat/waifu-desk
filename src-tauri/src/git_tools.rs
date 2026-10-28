//! Local Git read-only inspection and git-cliff release note previews.
//! Never stages, commits, resets, pushes, or writes into the selected repository.

use git2::{Repository, Sort, Status, StatusOptions};
use serde::Serialize;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::process::Command;

const MAX_FILES: usize = 100;
const MAX_COMMITS: usize = 20;
const MAX_NOTES_BYTES: usize = 96_000;

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
pub fn inspect_local_repository(path: String) -> Result<LocalGitSnapshot, String> {
    let (repo, workdir) = open_selected_repo(&path)?;
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
pub fn generate_release_notes(path: String) -> Result<String, String> {
    let (repo, workdir) = open_selected_repo(&path)?;
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

    // CLI arguments are passed directly (no cmd.exe / PowerShell interpolation).
    // No -o/--output: git-cliff writes the preview to stdout only.
    let output = Command::new("git-cliff")
        .arg("--config")
        .arg(config.path())
        .arg("--repository")
        .arg(&workdir)
        .arg("--no-exec")
        .arg("--offline")
        .env_remove("GIT_CLIFF_OUTPUT")
        .env_remove("GIT_CLIFF_PREPEND")
        .current_dir(&workdir)
        .output()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "git-cliff belum terinstal. Jalankan `cargo install git-cliff --locked`, lalu restart terminal/aplikasi.".to_owned()
            } else {
                format!("Tidak bisa menjalankan git-cliff: {error}")
            }
        })?;
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!(
            "git-cliff gagal: {}",
            stderr.trim().chars().take(500).collect::<String>()
        ));
    }
    let notes = String::from_utf8(output.stdout)
        .map_err(|_| "Output git-cliff bukan UTF-8 yang valid.".to_string())?;
    if notes.trim().is_empty() {
        return Err("git-cliff tidak menghasilkan catatan rilis untuk histori ini.".to_string());
    }
    if notes.len() > MAX_NOTES_BYTES {
        return Err("Release notes terlalu panjang untuk pratinjau. Gunakan git-cliff CLI untuk ekspor penuh.".to_string());
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
