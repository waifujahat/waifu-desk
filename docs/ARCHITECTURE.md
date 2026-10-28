# WaifuDesk — Architecture

## Tujuan

WaifuDesk adalah aplikasi desktop Tauri 2 dengan frontend React + TypeScript dan backend Rust. Metrik Codex berasal dari berkas lokal; GitHub mengambil data publik menggunakan API GitHub. Pemisahan ini menjaga dependensi agar satu fitur tidak perlu mengetahui detail jaringan atau implementasi backend fitur lain.

## Struktur frontend

```text
src/
  App.tsx                           application shell, routing, shared state
  pages/                            composition/layout halaman, tidak memanggil API mentah
  features/
    github/
      index.ts                       public API untuk React pages
      hooks/useGithub.ts            lifecycle, refresh, state
      services/githubService.ts     fetch/cache/validasi data GitHub
      domain/githubPolicy.ts        throttling dan rate-limit policy
      domain/githubStatus.ts        status / pemberitahuan ke UI
    codex/
      index.ts                       public API untuk React pages
      hooks/useCodex.ts             load + queued refresh
      services/queuedRefresh.ts     menjamin refresh tidak bertabrakan
      domain/codexAnalytics.ts      transformasi data untuk heatmap
      components/UsageHeatmap.tsx   visualisasi khusus Codex
  components/                        komponen tampilan lintas fitur
  design-system/components/         Button, Panel, Badge
  lib/                               formatters dan boundary Tauri umum
  types.ts                           tipe data bersama (migrasi bertahap)
  styles/                            tokens + modul CSS
```

## Dependency rules

1. `App.tsx` dan halaman `pages/` mengakses fitur melalui `features/<nama>/index.ts` ketika membutuhkan hook/status/komponen khusus fitur.
2. Hook boleh mengakses `services/` dan `domain/` dalam fitur yang sama. Komponen visual tidak melakukan `fetch` langsung.
3. GitHub `services/` mengelola permintaan, validasi response, cooldown, dan cache. Hook mengelola state React dan pembatalan request.
4. Codex hook menggunakan `lib/desktop.ts` sebagai adapter pemanggilan command Tauri; logika pembacaan log tetap di backend Rust.
5. `types.ts` masih menyediakan tipe bersama untuk menjaga kompatibilitas. Pemecahan ke `features/*/types.ts` perlu dilakukan pada commit terpisah.
6. Tidak menambahkan data token, autentikasi, atau isi percakapan ke log, Git, ataupun laporan tes.

## Aliran data

- GitHub: `pages -> features/github -> hook -> service (fetch + local cache) -> API`. Perubahan username membatalkan respons lama.
- Codex: `pages -> features/codex -> hook -> desktop adapter -> Tauri command -> parser Rust`. Pembacaan menggunakan direktori yang dipilih atau `CODEX_HOME` / `~/.codex`.
- Semua error dibedakan dari status kosong, agar pengguna tidak mengira kegagalan fetch sebagai angka nol.

## Pengujian

```powershell
npm.cmd run verify
cd src-tauri
cargo fmt --all -- --check
cargo test
cargo clippy --all-targets -- -D warnings
```

CI `.github/workflows/quality.yml` menjalankan pemeriksaan frontend `npm run verify`, pemeriksaan import boundary `node scripts/check-architecture.mjs`, serta Rust fmt/test/Clippy. CI hanya aktif apabila source tersedia di GitHub; menjalankan script ini tidak mengunggah kode.

## Keputusan migrasi Sprint 3

Refaktor hanya memindahkan modul, memperbarui import, dan menyusun ulang aturan CSS density berdasarkan kepemilikan. Tidak ada perubahan pada protokol/API, tipe publik, command Rust, atau layout. Jangan mencampurkan migrasi ini dengan perubahan fitur saat review; bandingkan keluaran build dan screenshot sebelum/sesudah.
