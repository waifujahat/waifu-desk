# WaifuDesk — Panduan Prapublikasi dan GitHub

Panduan ini disiapkan untuk source WaifuDesk di Windows (`E:\developer-cockpit`). **Jangan langsung menjalankan perintah push** sebelum semua pemeriksaan selesai dan hak pakai aset terverifikasi. Script audit bersifat **read-only**.

## A. Wallpaper MotionBGS yang telah mendapat izin

Pengelola proyek menyampaikan bahwa `Sakura Blade Elegance` boleh digunakan dengan kewajiban kredit. Untuk rilis ini, **pertahankan import MP4 dan file sumber yang sudah bekerja** pada `src/features/appearance/components/WallpaperLayer.tsx`. Tidak perlu beralih ke fallback-only atau mengeluarkan video dari bundle.

1. Simpan bukti izin di luar repository (jangan unggah pesan/email pribadi). Cocokkan cakupannya dengan repository publik, Pages, dan installer yang direncanakan.
2. Pastikan `src/assets/anime/wallpapers/sakura-blade-elegance.mp4` tersedia dan di-*track* oleh Git. Jangan duplikasi dalam `public/`.
3. Masukkan kredit MotionBGS pada `README.md` dan `docs/ASSET-PROVENANCE.md` (lihat berkas pembaruan dalam kit ini). Video tidak termasuk lisensi kode.
4. Pastikan `.gitignore` tidak lagi mengecualikan **file MP4 khusus ini**. File video lain tetap diabaikan/ditinjau.
5. Gunakan `scripts/audit-publication.ps1` versi **approved-video** yang memeriksa kredit, file Git, dan output build untuk satu MP4 yang diizinkan.

Jika `.gitignore` lama berisi `/src/assets/anime/wallpapers/*.mp4` atau path video yang spesifik, tambahkan **di akhir** `.gitignore`:

```gitignore
!/src/assets/anime/wallpapers/sakura-blade-elegance.mp4
```

Lalu, jika `git check-ignore` menyatakan file masih diabaikan, tinjau urutan aturan ignore sebelum staging.

## B. Pembersihan aman

Jangan menghapus apa pun hanya berdasarkan nama file. Tinjau apakah setiap file masih di-import, dirujuk oleh package script, dipakai build/CI, atau diperlukan dokumentasi.

**Tetap simpan dan unggah:**

- `src/`, `src-tauri/` (termasuk `build.rs`, `tauri.conf.json`, `capabilities/`, `icons/`, dan `Cargo.lock` jika ada), `public/` untuk aset yang memang boleh dibundel.
- `package.json`, `package-lock.json`, konfigurasi Vite/TS/ESLint/Prettier, `index.html`, `scripts/check-architecture.mjs`, pemeriksaan Pages jika ada, serta unit test.
- `README.md`, `LICENSE` yang sudah disetujui, `CONTRIBUTING.md` jika ada, `.gitignore`, `docs/`, dan workflow `.github/workflows/` yang relevan.

**Pindahkan keluar project setelah direview:** `apply-waifudesk-*.mjs` migrator sekali-pakai, installer `.ps1` eksperimen, `README-SPRINT*.md` bila sudah ada ringkasan final, patch ZIP, screenshots eksperimen, source ZIP lama, backup, file `*-copy`, dan video pihak ketiga lain yang belum diizinkan.

**Jangan simpan di Git:** `node_modules`, `dist`, `src-tauri/target`, `.env` berisi secret, autentikasi/riwayat Codex, token, atau cache pribadi.

Untuk migrator yang sudah ditinjau, **lebih aman pindahkan** ke `E:\WaifuDesk-Archive\` daripada langsung menghapusnya. Jangan memindahkan `scripts/check-architecture.mjs` atau `src-tauri/build.rs`.

## C. Audit repository lokal (belum mengubah file)

Dari root project:

```powershell
cd E:\developer-cockpit
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\audit-publication.ps1 -ProjectPath E:\developer-cockpit

git status --short
git branch --show-current
git remote -v
git ls-files
```

Pastikan MP4 **ter-track** untuk build clone publik:

```powershell
git check-ignore -v src/assets/anime/wallpapers/sakura-blade-elegance.mp4
git add -- src/assets/anime/wallpapers/sakura-blade-elegance.mp4
git ls-files -- src/assets/anime/wallpapers/sakura-blade-elegance.mp4
```

Jika `git check-ignore` mengembalikan path/aturan pengecualian, periksa `.gitignore` dan tambahkan exception khusus di akhir. Jangan memaksa `git add -f` tanpa memahami aturan exclude. Cek juga status seluruh file lain sebelum commit.

## D. Quality gate sebelum commit

```powershell
cd E:\developer-cockpit
npm.cmd ci
npm.cmd run format
npm.cmd run verify
node .\scripts\check-architecture.mjs

cd .\src-tauri
cargo fmt --all -- --check
cargo test
cargo clippy --all-targets -- -D warnings
cd ..
```

Saat menguji build rilis, pastikan video **berizin** yang digunakan source tersedia, dan tidak ada duplikat dalam `public/`, kemudian jalankan:

```powershell
npm.cmd run build
npm.cmd run tauri build
```

Periksa output `dist/` secara manual (juga dijalankan oleh script audit); hanya MP4 berizin itu yang diharapkan. Pada GitHub Pages, fitur Tauri seperti pembacaan sesi lokal dan mini widget tidak tersedia.

## E. Commit profesional, tanpa push otomatis

Gunakan perintah berikut **setelah** dokumen rilis selesai, audit bersih, dan semua kualitas lolos:

```powershell
cd E:\developer-cockpit

git status --short
git add .gitignore README.md docs scripts src src-tauri .github package.json package-lock.json index.html
# Tambahkan LICENSE / CONTRIBUTING.md / berkas konfigurasi root yang ada secara eksplisit.
# Tinjau sebelum commit:
git diff --cached --stat
git diff --cached --name-only
git diff --cached --check
```

Jangan commit jika ada MP4 lain yang belum diizinkan, ZIP migrasi, kunci rahasia, cache, atau file pribadi. MP4 Sakura Blade Elegance berizin justru perlu di-commit agar clone dapat build. Barulah:

```powershell
git commit -m "chore: prepare WaifuDesk Anime Edition for public release"
```

Periksa apakah Git remote sudah dikonfigurasi:

```powershell
git remote -v
```

Jika repo GitHub **belum dibuat**, buat repo kosong di GitHub tanpa README/LICENSE tambahan (karena source lokal sudah memilikinya). Setelah memastikan nama repo, remote, dan branch, jalankan `git remote add origin <URL-REPO>` jika belum ada remote; jangan menimpa remote yang sudah ada tanpa pemeriksaan.

**Push pertama kali, hanya ketika sudah siap dan kamu memutuskan untuk mempublikasikan:**

```powershell
git push -u origin main
```

Jika GitHub sudah punya commit lain, atau branch lokal bukan `main`, evaluasi histori terlebih dahulu. **Jangan otomatis melakukan force-push**.

## F. Sesudah push

- Pastikan GitHub Actions lint/test/build berhasil.
- Aktifkan Pages bila dibutuhkan; gunakan workflow Pages yang ada dengan `workflow_dispatch` dan `base=/waifu-desk/` bila konfigurasi itu memang sesuai nama repo.
- Tinjau README dan screenshot: tidak boleh menampilkan token, kredensial, chat pribadi, atau data yang mengidentifikasi orang lain.
- Buat GitHub Release terpisah setelah menguji installer Windows. Sertakan video berizin bila format release tersebut tercakup dalam izin; cantumkan kredit MotionBGS dalam README dan catatan rilis.
- Sematkan versi (`v0.x.y`), catatan perubahan, sistem operasi yang didukung, keterbatasan, dan checksum installer bila dibutuhkan.

## G. Hal yang harus dipastikan sebelum menyebut proyek open-source

- Lisensi **kode** benar-benar sesuai sejarah kode dan dependensi yang digunakan.
- Lisensi/izin **artwork original** telah ditentukan dengan jelas.
- Pengakuan/atribusi proyek inspirasi akurat, tanpa menyatakan afiliasi.
- Tidak ada kredensial atau data sensitif, termasuk dalam commit lama.
- Build bersih di checkout baru **dengan** file MotionBGS berizin yang ter-track.
