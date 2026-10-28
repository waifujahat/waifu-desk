# Berkontribusi pada WaifuDesk

WaifuDesk dikembangkan secara lokal terlebih dahulu. **Dokumen ini tidak berarti proyek sudah dipublikasikan.** Saat repository nanti dibagikan, gunakan prosedur berikut

## Alur kerja

1. Buat branch dari `main`, misalnya `refactor/clean-architecture` atau `fix/github-cache`
2. Satu perubahan logika/fungsi per commit. Pisahkan perubahan formatting dari implementasi
3. Tambahkan tes ketika memperbaiki bug (red -> green), terutama untuk cache/race condition dan parser Rust
4. Jalankan quality checks sebelum commit:

```powershell
npm.cmd run verify
node scripts/check-architecture.mjs
cd src-tauri
cargo fmt --all -- --check
cargo test
cargo clippy --all-targets -- -D warnings
```

5. Tinjau `git diff --check`, file yang staged, dan keluaran tes
6. Jika nanti proyek dipublikasikan, buat pull request dengan ringkasan perubahan, alasan, risiko, dan bukti pengujian

## Aturan desain dan keamanan

- Jangan menulis isi percakapan Codex atau token ke unit test, output log, issue, maupun commit
- Jangan melakukan commit `.env`, auth.json, `CODEX_HOME`, folder sessions/arsip, data pengguna, atau hasil build
- Perubahan command Tauri harus memvalidasi input dan tetap mengikuti prinsip least privilege
- Hindari perubahan lint rule untuk menutupi error; perbaiki kode atau dokumentasikan pengecualian yang benar-benar diperlukan
- Pertahankan UI ringkas dan aksesibel. Tambahan komponen harus menyelesaikan kebutuhan pengguna nyata

## Review checklist

- [ ] Ada alasan dan ruang lingkup perubahan yang jelas
- [ ] Test berhasil; failure state, loading, dan empty state diperiksa
- [ ] Tidak ada secret / cache / hasil build di Git
- [ ] Fitur desktop diuji bila memodifikasi Tauri atau alur Codex
- [ ] Dokumentasi di `docs/ARCHITECTURE.md` diperbarui bila batas modul berubah
