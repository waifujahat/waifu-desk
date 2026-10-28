# WaifuDesk

> Dashboard desktop Windows untuk memantau penggunaan Codex lokal dan aktivitas publik GitHub
![Platform Windows](https://img.shields.io/badge/platform-Windows%20desktop-8076e8)

**Teknologi :** React 19 · TypeScript 5 · Vite 7 · Tauri 2 · Rust · CSS

Live Demo : https://waifujahat.github.io/waifu-desk/

Repository : https://github.com/waifujahat/waifu-desk

## Fitur

### Pemantauan

- Membaca ringkasan penggunaan dari berkas sesi Codex lokal (`.jsonl`) melalui backend Rust
- Menampilkan token input, output, dan cache, serta ringkasan penggunaan per model
- Menampilkan grafik penggunaan, heatmap 30 hari, dan daftar sesi terbaru
- Menampilkan laporan batas penggunaan terakhir apabila tersedia di log. **Informasi ini bukan kuota real-time**
- Memilih folder data Codex dari Pengaturan atau kembali ke lokasi otomatis (`CODEX_HOME` / `~/.codex`)
- Membuka mini widget desktop yang dapat ditampilkan di atas jendela lain

### Integrasi GitHub

- Menampilkan profil, repositori publik, dan sampel aktivitas publik GitHub
- Mencari, memfilter, dan mengurutkan repositori yang berhasil dimuat
- Menampilkan ringkasan aktivitas dan grafik berdasarkan data API yang tersedia
- Menyimpan cache data untuk mengurangi permintaan berulang, mempertahankan data valid saat sebagian permintaan gagal serta menangani batas API (*rate limit*)

### Anime Edition dan desktop

- Tema gelap dan terang, pilihan palet visual Classic/Sakura/Tsuki, navigasi responsif, dan preferensi lokal
- Maskot **Hana** (enam ekspresi) pada halaman Ringkasan, menggunakan sprite PNG, bukan Live2D
- Wallpaper semi-transparan dan panel bergaya glass sesuai preferensi aplikasi
- Wallpaper video **Sakura Blade Elegance** dari MotionBGS
- Antarmuka React dengan modul GitHub dan Codex yang terpisah
- Pemeriksaan otomatis melalui ESLint, Prettier, TypeScript, Vitest, Rustfmt, Clippy dan Cargo Test

## Menjalankan di Windows

### Persyaratan

- Windows 10/11 dan Node.js yang kompatibel dengan Vite 7 (misalnya Node.js 24)
- Untuk aplikasi desktop: Rust dengan toolchain `stable-x86_64-pc-windows-msvc`, Microsoft C++ Build Tools/Visual Studio dengan komponen **Desktop development with C++**, serta Microsoft Edge WebView2 Runtime
- Koneksi internet diperlukan untuk pemasangan dependency dan pengambilan data publik GitHub

Panduan prasyarat resmi: [Tauri untuk Windows](https://v2.tauri.app/start/prerequisites/)

### Instalasi dan pratinjau browser

Buka PowerShell atau terminal VS Code di folder proyek:

```powershell
cd E:\developer-cockpit
npm.cmd ci
npm.cmd run dev
```

Buka `http://127.0.0.1:1420/` di browser

### Menjalankan aplikasi desktop

```powershell
npm.cmd run tauri dev
```

### Membuat installer Windows

```powershell
npm.cmd run tauri build
```

Jika target NSIS diaktifkan pada konfigurasi Tauri, hasil installer biasanya tersedia di `src-tauri/target/release/bundle/nsis/`
Repository sumber tidak otomatis menyertakan installer siap pakai

> Pada PowerShell yang memblokir `npm.ps1`, gunakan `npm.cmd` seperti contoh

## Pemeriksaan kualitas

Jalankan seluruh pemeriksaan frontend :

```powershell
npm.cmd run verify
node .\scripts\check-architecture.mjs
```

`verify` menjalankan ESLint, pengecekan format Prettier, pemeriksaan TypeScript dan build Vite, serta Vitest

Pemeriksaan backend Rust :

```powershell
cd .\src-tauri
cargo fmt --all -- --check
cargo test
cargo clippy --all-targets -- -D warnings
cd ..
```

## Struktur proyek

```text
waifudesk/
├── .github/workflows/       # Pemeriksaan kualitas otomatis saat workflow dijalankan
├── docs/                    # Dokumentasi arsitektur dan catatan perubahan
├── scripts/                 # Pemeriksaan batas antarmodul
├── src/
│   ├── App.tsx              # Shell aplikasi dan navigasi
│   ├── components/          # Komponen tampilan umum
│   ├── design-system/       # Komponen UI dan pedoman gaya
│   ├── features/
│   │   ├── appearance/      # Wallpaper, maskot, dan preferensi tampilan
│   │   ├── codex/           # Hook, analitik, dan komponen Codex
│   │   └── github/          # Hook, layanan API, cache, dan logika GitHub
│   ├── pages/              # Ringkasan, Codex, Repositori, Aktivitas, Pengaturan
│   ├── styles/             # Token desain, layout, halaman, dan responsif
│   └── styles.css          # Titik masuk stylesheet
├── src-tauri/
│   ├── src/
│   │   ├── usage.rs         # Pembacaan dan agregasi catatan sesi Codex
│   │   ├── codex_directory.rs # Pengaturan folder Codex
│   │   └── lib.rs           # Perintah dan integrasi Tauri
│   ├── capabilities/        # Izin aplikasi desktop
│   └── tauri.conf.json      # Konfigurasi aplikasi dan bundling
├── CONTRIBUTING.md
├── LICENSE
├── package.json
└── README.md
```

Penjelasan lebih lanjut tersedia pada `docs/ARCHITECTURE.md`, `docs/CSS-ARCHITECTURE.md`, [`docs/ANIME-ASSETS.md`](docs/ANIME-ASSETS.md), [`docs/ASSET-PROVENANCE.md`](docs/ASSET-PROVENANCE.md), dan [`docs/PUBLISHING.md`](docs/PUBLISHING.md)

## Akurasi data dan privasi

**Data GitHub** berasal dari API publik
Riwayat aktivitas yang ditampilkan merupakan sampel terbatas dan mungkin terlambat diperbarui, grafik tersebut **bukan** ukuran keseluruhan commit atau produktivitas developer
GitHub juga menerapkan pembatasan permintaan API
**Data Codex** dihitung dari catatan sesi lokal yang tersedia
Hasil dapat tidak lengkap karena sesi yang hilang, perubahan format log atau reset penghitung
Informasi persentase kuota dan waktu reset yang berasal dari log harus dipahami sebagai **laporan terakhir** bukan pemeriksaan langsung terhadap kuota akun
Jangan menambahkan file kredensial, `.env`, token akses atau catatan percakapan pribadi ke repository

## Keterbatasan

- Integrasi GitHub saat ini menggunakan informasi publik, repositori privat dan autentikasi akun GitHub belum didukung
- Cache mengurangi frekuensi permintaan, tetapi tidak menghilangkan batas API GitHub
- Format log Codex bukan antarmuka data yang dijamin stabil dan mungkin memerlukan penyesuaian parser
- Estimasi biaya token belum tersedia; aplikasi tidak menampilkan nilai biaya yang tidak dapat diverifikasi
- Fitur native seperti pembacaan log lokal dan mini widget tidak berjalan pada pratinjau browser
- Bundling dan pengujian desktop difokuskan pada Windows
- Mode Live2D belum tersedia, ekspresi Hana berupa sprite statis

## Kontribusi dan pengembangan

Publikasi dan rilis dilakukan setelah audit source, pemeriksaan hak pakai aset, serta build desktop
Pedoman struktur kode, pengujian, dan kontribusi dapat dibaca dalam [`CONTRIBUTING.md`](CONTRIBUTING.md)
Perubahan sebaiknya dilakukan pada branch tersendiri, diuji, lalu ditinjau sebelum digabungkan ke `main`

**Lisensi:** Lihat [`LICENSE`](LICENSE) untuk ketentuan source code setelah lisensinya diverifikasi

## Kredit dan Aset Pihak Ketiga

**Wallpaper :** [Sakura Blade Elegance — MotionBGS](https://motionbgs.com/sakura-blade-elegance)
