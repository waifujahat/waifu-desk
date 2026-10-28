# WaifuDesk Anime Edition — Aset Visual dan Status Integrasi

Dokumen ini menggantikan deskripsi lama **“Paket bahan visual”** yang dibuat sebelum aset diintegrasikan. Dokumentasi ini menjelaskan **kondisi yang direncanakan untuk rilis publik**. Pastikan isi dan berkas aktual telah dicocokkan dengan checkout lokal sebelum commit.

## Ringkasan

WaifuDesk Anime Edition adalah lapisan visual di atas aplikasi desktop React, TypeScript, dan Tauri: tema Classic/Sakura/Tsuki, panel semi-transparan, maskot **Hana**, dan wallpaper. Pengaturan maskot di halaman Pengaturan telah dihilangkan pada versi lokal terbaru, tetapi maskot di Beranda tetap ada. Mode gelap/terang tetap tersedia. Tidak ada perubahan konsep pada pembacaan sesi Codex atau API GitHub.

**Penting:** Video `Sakura Blade Elegance` berasal dari [MotionBGS](https://motionbgs.com/sakura-blade-elegance), **bukan aset original WaifuDesk**. Pengelola proyek telah menyatakan memperoleh izin penggunaan dan meminta agar kredit diberikan. Pastikan izin tersebut mencakup redistribusi file di repository, build web, dan installer sesuai cakupan rilis.

## Struktur aset yang relevan

| Direktori / file | Fungsi | Status untuk repository publik |
| --- | --- | --- |
| `src/assets/anime/mascot/hana-*.png` | Enam ekspresi maskot Hana: idle, happy, working, thinking, sleepy, surprised | **Review** kualitas dan hak pakai; gunakan versi perbaikan terbaru, bukan sprite lama |
| `src/assets/anime/wallpapers/sakura-evening.svg` dan `tsuki-night.svg` | Wallpaper statis original, dapat dipakai sebagai fallback | **Kandidat disertakan**, setelah review aset |
| `src/assets/anime/wallpapers/*-character-wallpaper.jpg` | Wallpaper karakter konsep lama | **Opsional**; hapus dari repo jika tidak direferensikan; lihat hak pakai |
| `src/assets/anime/theme-previews/` | Portrait kartu pilihan tema | **Opsional**; hanya simpan jika digunakan UI |
| `src/assets/anime/icons/` | Ikon Sakura, Tsuki, Neko, monogram W | **Kandidat disertakan** jika digunakan UI |
| `public/local-wallpaper.mp4` | Percobaan wallpaper lokal dari panduan lama | **Jangan digunakan** untuk rilis ini; hapus duplikat setelah dicek |
| `src/assets/anime/wallpapers/sakura-blade-elegance.mp4` | Wallpaper video MotionBGS berizin | **Masukkan ke repository dan build** dengan atribusi eksplisit; pisahkan dari lisensi kode |
| File lembar konsep, crop percobaan, source ZIP patch | Bahan kerja sementara | **Jangan commit** kecuali ada alasan jelas dan hak pakainya diperiksa |

Enam sprite PNG berukuran 384 × 384 pada paket awal merupakan potongan dari lembar ilustrasi konsep. Versi **Hana Mascot Fixed v2** dibuat sebagai pengganti untuk mengurangi artefak. Penilaian visual final tetap perlu dilakukan pada resolusi dan latar yang digunakan aplikasi; jangan mengklaim semua sprite pasti sempurna.

## Penggunaan wallpaper video

Aplikasi saat ini mengimpor `src/assets/anime/wallpapers/sakura-blade-elegance.mp4` melalui `WallpaperLayer.tsx`. Karena izin rilis telah dikonfirmasi oleh pengelola proyek, file tersebut **dipertahankan** sebagai dependency build, ikut Git, dan dipaketkan oleh Vite/Tauri. Clone publik akan berhasil build selama MP4 benar-benar ter-track.

Sumber dan kredit: **[Sakura Blade Elegance — MotionBGS](https://motionbgs.com/sakura-blade-elegance)**. Video bukan karya original WaifuDesk dan tidak ikut lisensi kode proyek. Simpan bukti izin secara privat; cukup dokumentasikan ringkasan ruang lingkupnya di `ASSET-PROVENANCE.md`. Jangan mengunggah percakapan pribadi atau identitas pemberi izin.

Jika izin terbatas pada penggunaan tertentu, jangan menerbitkan format distribusi di luar izin tersebut. `public/local-wallpaper.mp4` dari panduan sebelumnya sebaiknya tidak dipakai supaya tidak menduplikasi video.

## Hak pakai, atribusi, dan batasan

- Ilustrasi Hana, ikon, dan wallpaper SVG dibuat sebagai aset konsep WaifuDesk dengan bantuan generasi grafis. Tidak menggunakan karakter franchise anime bernama yang disengaja. **Sebelum publikasi, penanggung jawab proyek tetap perlu meninjau kemiripan, atribusi, dan hak pakai aset final.**
- Lisensi kode aplikasi dan hak penggunaan gambar dapat berbeda. Jangan otomatis menyatakan semua artwork mengikuti lisensi kode tanpa keputusan eksplisit.
- Artwork konsep bukan sumber `.psd`, berkas rig, atau model Live2D. **Live2D, rigging, ekspresi berbasis model, serta animasi real-time belum disertakan.**
- Video MotionBGS dan aset eksternal lainnya tidak tercakup dalam klaim aset original.
- Angka, status, dan grafik pada gambar mockup hanyalah contoh visual, bukan data pengguna atau pengukuran nyata.

Catat sumber, kreator, tipe lisensi, tautan bukti izin, dan penggunaan setiap aset pada [`ASSET-PROVENANCE.md`](ASSET-PROVENANCE.md) sebelum rilis.

## Checklist review aset

- [ ] Lihat semua PNG Hana di dark/light mode dan pada ukuran UI sebenarnya.
- [ ] Periksa sprite yang benar-benar dipakai aplikasi, hapus duplikat/varian eksperimen yang tidak terpakai.
- [ ] Pastikan file MP4 MotionBGS di-*stage* tepat satu kali pada jalur `src/assets/anime/wallpapers/sakura-blade-elegance.mp4`.
- [ ] Pastikan video ikut hasil build (jika scope izin mencakup installer/web) dan tidak ada duplikat MP4 lain.
- [ ] Pastikan kredit MotionBGS tampil di README dan dokumentasi aset, sesuai syarat izin.
- [ ] Pastikan tampilan dan keterbacaan tetap baik dengan dan tanpa video.
- [ ] Pastikan atribusi dan lisensi kode/aset konsisten dalam README dan LICENSE.
