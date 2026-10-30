# Asal-usul dan izin aset WaifuDesk

> Inventaris pra-rilis. Lengkapi pemeriksaan hak pakai dan lisensi final sebelum membuat repository publik. Jangan menganggap lisensi kode (misalnya MIT) otomatis memberikan lisensi untuk setiap gambar dan video.

| Aset | Asal / referensi | Penggunaan | Kebijakan rilis | Review |
| --- | --- | --- | --- | --- |
| Hana `hana-*.png` (6 ekspresi) | Ilustrasi karakter original yang dibuat untuk WaifuDesk, termasuk tahap perbaikan artefak | Maskot halaman Ringkasan | Boleh dipertimbangkan masuk repo setelah tinjauan visual dan kebijakan lisensi artwork | Belum dikonfirmasi final |
| Wallpaper `sakura-evening.svg` dan `tsuki-night.svg` | Komposisi SVG yang dibuat khusus untuk WaifuDesk | Fallback wallpaper statis | Kandidat masuk repo | Belum dikonfirmasi final |
| Ikon SVG Sakura/Tsuki/Neko/W | Dibuat khusus untuk proyek | Tema dan identitas visual | Kandidat masuk repo | Belum dikonfirmasi final |
| Portrait tema & wallpaper konsep JPG | Olahan ilustrasi konsep Anime Edition | Preview, jika masih digunakan | Opsional, pastikan masih dipakai sebelum commit | Belum dikonfirmasi final |
| `sakura-blade-elegance.mp4` | [MotionBGS — Sakura Blade Elegance](https://motionbgs.com/sakura-blade-elegance), karya pihak ketiga | Wallpaper video utama untuk semua tema | **Disertakan di repository dan build** dengan kredit, sesuai izin yang dilaporkan pengelola proyek; tidak termasuk lisensi kode | Pengelola proyek menyatakan izin telah diperoleh; audit otomatis tidak memverifikasi bukti |
| Runtime/model Live2D | Belum ada | Rencana fitur masa depan | Tidak termasuk rilis ini | Tidak berlaku |

## Keputusan lisensi yang diperlukan

1. **Kode:** pastikan teks `LICENSE` benar-benar tersedia, sesuai kepemilikan dan ketentuan semua dependency/kode turunan.
2. **Artwork:** putuskan secara eksplisit izin penggunaan ulang artwork original WaifuDesk (misalnya izin terbatas untuk asset visual); jangan menempel label lisensi bebas pada aset pihak ketiga.
3. **Atribusi:** tulis kredit bagi sumber atau contributor yang memang digunakan; bila berbasis konsep/inspirasi, jelaskan secara akurat tanpa menyiratkan afiliasi.
4. **Publikasi:** untuk aset berizin, cocokkan setiap target distribusi (repository publik, GitHub Pages, dan installer Windows) dengan cakupan izin. Jika ada target di luar cakupan izin, jangan distribusikan aset melalui target tersebut.

Dokumen ini adalah inventaris dan pemeriksaan, bukan nasihat hukum atau bukti kepemilikan atas suatu karya.

## Kredit resmi wallpaper video

- **Judul:** Sakura Blade Elegance
- **Sumber / kredit:** [MotionBGS](https://motionbgs.com/sakura-blade-elegance)
- **File di proyek:** `src/assets/anime/wallpapers/sakura-blade-elegance.mp4`
- **Status:** pemilik proyek telah menyampaikan bahwa izin diperoleh dengan kewajiban kredit, bukti asli tidak disertakan dalam repositori
- **Pembatasan lisensi:** wallpaper bukan bagian dari lisensi kode WaifuDesk, penggunaan ulang atau redistribusi secara terpisah memerlukan hak masing-masing
- **Checklist internal pengelola:** pastikan bukti izin mencakup repo source, GitHub Pages (bila digunakan) dan installer/release Windows (bila digunakan)