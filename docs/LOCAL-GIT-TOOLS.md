# WaifuDesk Local Git Intelligence (MVP)

A **read-only** local Git tool for Tauri Desktop, inspired by [GitUI](https://github.com/gitui-org/gitui), with an optional [git-cliff](https://github.com/orhun/git-cliff) CLI integration.

- Pick the root directory of a local Git working tree.
- View active branch, first 100 changed files, and up to 20 commits.
- Generate Markdown release notes from Git history through `git-cliff`.
- Copy the preview to the clipboard; no auto-write, no commit, no push.
- Web demo: displays a desktop-only notice; existing GitHub repository cards remain intact.

## Requirements

1. Rust/Tauri toolchain and existing WaifuDesk dependencies.
2. New Rust crates `git2` and `tempfile`; `cargo test` will resolve them and update `src-tauri/Cargo.lock`.
3. For *Generate notes*, install `git-cliff` on the machine running the desktop application:

   ```powershell
   cargo install git-cliff --locked
   git-cliff --version
   ```

   Restart VS Code/Tauri dev terminal if the command isn't found immediately. The inspector works without git-cliff.

## Test

```powershell
cd E:\developer-cockpit
npm.cmd run format
npm.cmd run verify
node .\scripts\check-architecture.mjs
cargo test --manifest-path .\src-tauri\Cargo.toml
cargo fmt --manifest-path .\src-tauri\Cargo.toml -- --check
cargo clippy --manifest-path .\src-tauri\Cargo.toml --all-targets -- -D warnings
npm.cmd run tauri dev
```

From the Repositori page, pick the local WaifuDesk project (or another Git repo). Do not select `.git` itself. The release-note generator uses an embedded configuration that also includes non-Conventional commit messages, such as `WaifuDesk`.

### Safety and limits

- No shell interpolation or Git writes, no `git reset`, no `commit`, no `push`.
- Uses `git2` to inspect files and commits locally.
- `git-cliff` is run with `--no-exec` and `--offline`, and config is embedded in the Rust binary, not taken from the selected repo.
- A trusted local executable is still required: install git-cliff from a reliable source.
- A very large repository may take longer to inspect; MVP is on-demand rather than continuously polling.
- No storage of selected paths in browser localStorage.

### Credits

The GitUI UX concept and git-cliff release-note generator inspired this feature. Their repositories are **not copied or bundled**. See their upstream licensing and documentation for redistribution requirements if you ever vendor either implementation.
