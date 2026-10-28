# Live Demo WaifuDesk — GitHub Pages

Dokumen ini **menyiapkan** web preview. Tidak ada deployment otomatis saat push: workflow `.github/workflows/pages-demo.yml` hanya mendukung **Run workflow** secara manual.

## Alamat yang direncanakan

- **Repository:** https://github.com/waifujahat/waifu-desk
- **Live Demo (setelah diterbitkan):** https://waifujahat.github.io/waifu-desk/

URL Live Demo di atas **belum diklaim aktif** sampai workflow berhasil dijalankan dan GitHub Pages diaktifkan.

## Perbedaan versi browser dan Windows

| Fitur | Browser (GitHub Pages) | Windows (Tauri) |
| --- | --- | --- |
| Navigasi dan tema | Ya | Ya |
| Profil dan repositori GitHub publik | Ya, bergantung rate limit jaringan | Ya, bergantung rate limit jaringan |
| Membaca data sesi Codex di komputer | Tidak | Ya |
| Dialog pilih direktori Codex | Tidak | Ya |
| Mini widget native | Tidak | Ya |

GitHub Pages hanya meng-host file statis HTML/CSS/JS. Browser tidak memiliki akses ke filesystem dan Rust command Tauri. **Jangan menambahkan dummy data seolah-olah merupakan statistik Codex asli.** Kode aplikasi sudah memeriksa ketersediaan desktop; tetap lakukan QA browser sebelum publikasi.

## Uji lokal (PowerShell, di root proyek)

```powershell
npm.cmd run verify
npm.cmd exec -- vite build --base /waifu-desk/
node .\scripts\check-pages-build.mjs
npm.cmd run preview -- --host 127.0.0.1
```

**Catatan:** `vite preview` biasanya menyajikan build dengan base `/waifu-desk/`; buka URL yang ditunjukkan Vite dan akhiri dengan `/waifu-desk/`. Jika preview lokal memerlukan path berbeda, cek Network tab browser. Perintah `npm.cmd run tauri dev` tetap tidak berubah; tidak perlu mengganti `vite.config.ts` atau `src-tauri/tauri.conf.json`.

## Saat pengguna memutuskan untuk publish

1. Pastikan semua source telah ditinjau dan tidak memuat token, `.env`, `auth.json`, atau isi sesi Codex privat.
2. Upload/push repository ke GitHub atas keputusan pemilik proyek.
3. Buka repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Buka **Actions → WaifuDesk Web Demo → Run workflow**, pilih branch `main` dan jalankan secara manual.
5. Periksa GitHub Pages: https://waifujahat.github.io/waifu-desk/ dan uji navigasi, gambar, tema, fitur GitHub, serta status fitur native yang nonaktif.
6. Hanya setelah URL berhasil diuji, tambahkan tautan **Live Demo** sebagai tautan aktif di README utama.

## Jika terjadi masalah

- **Halaman putih / asset 404**: cek `/waifu-desk/` pada hasil build. Workflow menjalankan `npm exec -- vite build --base /waifu-desk/` dan validator asset.
- **Tombol native tidak berfungsi di web**: ini batasan browser, bukan masalah GitHub Pages. Tombol native harus tersembunyi atau disabled dengan penjelasan singkat.
- **GitHub API rate limit**: browser demo tetap menggunakan API publik dan tunduk pada limit GitHub; cache tidak menghilangkan limit.
- **404 saat refresh**: gunakan navigasi berbasis hash yang sekarang dipakai WaifuDesk; hindari direct path routes tanpa fallback.

Workflow ini tidak berisi trigger `push`, `pull_request`, atau `schedule`; tidak ada publikasi dari perubahan lokal dan tidak ada publikasi otomatis saat melakukan push pertama.
