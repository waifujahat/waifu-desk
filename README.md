# WaifuDesk
By Nurwidhi Maulana Nugraha

> Dashboard desktop Windows untuk memantau penggunaan Codex lokal, aktivitas publik GitHub dan mengelola akses pengguna melalui backend Rust

![Platform Windows](https://img.shields.io/badge/platform-Windows%20desktop-8076e8)
![Version](https://img.shields.io/badge/version-0.1.0-blue)
![Tauri](https://img.shields.io/badge/Tauri-2-24C8DB)
![Rust](https://img.shields.io/badge/backend-Rust%20%2B%20Axum-orange)

**Teknologi:** React 19 · TypeScript 5 · Vite 7 · Tailwind CSS 4 · Tauri 2 · Rust · Axum · SQLite · SQLx

**Live Demo :** https://waifujahat.github.io/waifu-desk/

**Repository :** https://github.com/waifujahat/waifu-desk

**Development Branch :** [feature/fullstack](https://github.com/waifujahat/waifu-desk/tree/feature/fullstack)

## Tentang WaifuDesk

WaifuDesk merupakan aplikasi dashboard desktop berbasis Windows yang dikembangkan menggunakan React, TypeScript, Tauri dan Rust

- **Frontend :** React dan TypeScript untuk antarmuka, navigasi, visualisasi data, dan autentikasi pengguna
- **Desktop Runtime :** Tauri dan Rust untuk mengakses fitur sistem lokal, membaca sesi Codex, mengelola Git dan menjalankan Mini Widget
- **Backend API :** Rust Axum dengan SQLite untuk registrasi akun, autentikasi, sesi, role dan permission

Pengembangan saat ini difokuskan pada Windows dengan arsitektur fullstack yang masih terus disempurnakan sebelum rilis publik

## Fitur

### Pemantauan Codex

- Membaca data penggunaan dari berkas sesi Codex lokal (`.jsonl`) menggunakan Rust
- Menampilkan token input, output dan cache
- Menampilkan ringkasan penggunaan berdasarkan model
- Menyediakan grafik penggunaan, heatmap 30 hari dan daftar sesi terbaru
- Membaca laporan batas penggunaan terakhir apabila tersedia dalam log
- Mendukung pemilihan direktori Codex melalui Pengaturan
- Mendukung lokasi otomatis menggunakan `CODEX_HOME` atau `~/.codex`
- Menyediakan Mini Widget desktop yang dapat ditampilkan di atas jendela lain

**Catatan :** Informasi kuota dan waktu reset yang dibaca dari log merupakan laporan terakhir yang tersedia, bukan pemeriksaan kuota akun secara real-time

### Integrasi GitHub

- Menampilkan profil GitHub berdasarkan informasi publik
- Menampilkan repositori publik pengguna
- Mencari, memfilter, dan mengurutkan repositori yang dimuat
- Menampilkan sampel aktivitas publik dan ringkasan dalam bentuk grafik
- Menggunakan cache untuk mengurangi permintaan API berulang
- Mempertahankan data valid ketika sebagian permintaan API gagal
- Menangani pembatasan API GitHub (*rate limit*)

Integrasi ini menggunakan data publik GitHub dan belum menyediakan akses ke repositori privat melalui autentikasi akun GitHub

### Authentication dan Authorization

- Registrasi pengguna menggunakan nama, email dan password
- Login menggunakan email dan password
- Logout dengan pencabutan sesi aktif
- Validasi sesi menggunakan Bearer Token
- Password hashing menggunakan Argon2
- Penyimpanan hash token sesi pada database
- Pemeriksaan akses berdasarkan role dan permission (*Role-Based Access Control* atau RBAC)
- Perlindungan endpoint API dari request tanpa autentikasi
- Penolakan akses ketika pengguna tidak memiliki permission yang diperlukan

Sistem menyediakan tiga role dasar :

| Role | Keterangan |
|---|---|
| Admin | Role dengan permission administratif yang didefinisikan dalam database |
| Operator | Role dengan permission operasional terbatas |
| Viewer | Role dengan permission baca terbatas |

Pengguna yang melakukan registrasi akan memperoleh role **Viewer** secara default

Role dan permission sudah tersedia pada backend, tetapi belum seluruh operasi pengelolaannya disediakan melalui antarmuka aplikasi

Autentikasi saat ini berbasis akun lokal WaifuDesk **Single Sign-On (SSO), OAuth GitHub dan manajemen role melalui dashboard belum tersedia**


### Rust API Sidecar Otomatis

WaifuDesk menggunakan script `scripts/prepare-sidecar.mjs`
untuk menyiapkan executable Rust API secara otomatis

Persiapan dilakukan otomatis melalui konfigurasi
`beforeDevCommand` dan `beforeBuildCommand` Tauri

Untuk menjalankan persiapan secara manual jika diperlukan :

**Mode development :**

```powershell
node scripts/prepare-sidecar.mjs
```

**Mode release :**

```powershell
node scripts/prepare-sidecar.mjs --release
```

Perintah desktop utama tetap :

```powershell
npm.cmd run tauri dev
```

Untuk membuat installer Windows :

```powershell
npm.cmd run tauri build
```

### Rust API dan SQLite

Backend HTTP dibangun menggunakan Rust, Axum dan SQLx dengan SQLite sebagai penyimpanan lokal

Endpoint yang tersedia :

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Memeriksa status layanan |
| GET | `/api/health/database` | Memeriksa koneksi database |
| POST | `/api/auth/register` | Registrasi pengguna |
| POST | `/api/auth/login` | Login dan pembuatan sesi |
| GET | `/api/auth/me` | Mengambil profil pengguna aktif |
| POST | `/api/auth/logout` | Mengakhiri sesi |
| GET | `/api/users` | Mengambil daftar pengguna dengan permission `users.read` |

Database diinisialisasi secara otomatis dan migrasi SQL dijalankan saat backend dimulai

Pada mode desktop, lokasi database diarahkan ke folder data lokal aplikasi melalui `WAIFUDESK_DATABASE_PATH`

Pada mode backend mandiri, lokasi default database adalah `server/waifudesk.db`

Database berisi informasi akun, role, permission, serta sesi pengguna

### Tauri IPC dan Rust Sidecar

WaifuDesk menggunakan Tauri IPC untuk menghubungkan frontend desktop dengan backend Rust Axum

Alur komunikasinya:

```text
React + TypeScript
        |
        v
Tauri IPC (invoke)
        |
        v
Rust API Bridge (reqwest)
        |
        v
Rust Axum Sidecar
        |
        v
SQLite Database
```

Integrasi ini memungkinkan aplikasi desktop berkomunikasi dengan backend tanpa membutuhkan server pengembangan Vite

Fitur yang telah diimplementasikan :

- Menjalankan Rust API Sidecar secara otomatis saat aplikasi desktop dibuka
- Mengarahkan database ke folder data lokal aplikasi
- Menggunakan kunci internal untuk komunikasi antara Tauri dan Axum
- Membatasi endpoint yang dapat dipanggil melalui Authentication API Bridge
- Menolak request HTTP tanpa kunci internal ketika backend berjalan sebagai sidecar
- Menghentikan proses backend ketika aplikasi Tauri ditutup secara normal
- Mengemas executable Rust API bersama aplikasi desktop menggunakan konfigurasi `externalBin`

Backend saat ini menggunakan alamat loopback `127.0.0.1:3001`

Perlindungan kunci internal bukan pengganti seluruh mekanisme keamanan sistem operasi. Pengamanan tambahan masih diperlukan sebelum distribusi publik

### Anime Edition dan Desktop

- Tema terang dan gelap
- Navigasi responsif dan preferensi tampilan lokal
- Maskot **Hana** dengan enam ekspresi menggunakan sprite PNG
- Wallpaper semi-transparan dan panel bergaya glass
- Wallpaper video **Sakura Blade Elegance** dari MotionBGS
- Mini Widget desktop dengan dukungan *always on top*
- Integrasi dengan fitur native Windows melalui Tauri

Maskot Hana saat ini menggunakan gambar statis bukan Live2D

## Arsitektur Aplikasi

WaifuDesk menggunakan pemisahan antara frontend, desktop runtime dan backend API

```text
                  WaifuDesk
                      |
        +-------------+-------------+
        |                           |
        v                           v
  React Frontend               Tauri Desktop
  TypeScript                   Rust Native
  Vite                         System Commands
  Tailwind CSS                 Codex & Git Tools
        |                           |
        +-------------+-------------+
                      |
                      v
                Tauri IPC
                      |
                      v
               Rust API Bridge
                      |
                      v
                Axum Server
                      |
            +---------+---------+
            |                   |
            v                   v
       Authentication          SQLite
       Sessions                Users
       Authorization           Roles
       RBAC                    Permissions
```

Frontend memisahkan fitur ke dalam direktori masing-masing agar komponen tampilan, logika domain, dan layanan API tidak bercampur

Backend HTTP berada pada direktori `server/`, sedangkan implementasi Tauri berada pada `src-tauri/`

Pembacaan log Codex dan operasi Git lokal ditangani oleh command native Tauri. Authentication menggunakan API Axum melalui bridge yang terpisah

## Menjalankan di Windows

### Persyaratan

- Windows 10/11
- Node.js yang kompatibel dengan Vite 7, misalnya Node.js 24
- Rust dengan toolchain `stable-x86_64-pc-windows-msvc`
- Microsoft Visual Studio atau Build Tools dengan komponen **Desktop development with C++**
- Microsoft Edge WebView2 Runtime
- Git untuk mengunduh dan mengelola source code
- Koneksi internet untuk instalasi dependency dan pengambilan data publik GitHub

Panduan persyaratan resmi tersedia di [Tauri Windows Prerequisites](https://v2.tauri.app/start/prerequisites/)

### 1. Clone Repository

Buka PowerShell atau terminal Visual Studio Code

```powershell
git clone https://github.com/waifujahat/waifu-desk.git
cd waifu-desk
git switch feature/fullstack
```

Untuk pengembangan fullstack terbaru, gunakan branch `feature/fullstack`

Jika proyek sudah tersedia secara lokal, cukup buka terminal pada folder proyek yang ada tanpa melakukan clone ulang

### 2. Instal Dependency Frontend

```powershell
npm.cmd ci
```

Perintah ini menggunakan dependency yang tercatat dalam `package-lock.json`

> Jika PowerShell memblokir `npm.ps1`, gunakan `npm.cmd` seperti contoh pada dokumentasi ini

### 3. Menjalankan Backend Rust

Untuk pengembangan melalui browser, jalankan backend terlebih dahulu pada terminal pertama :

```powershell
cargo run --manifest-path server/Cargo.toml
```

Backend tersedia di :

```text
http://127.0.0.1:3001
```

Periksa status layanan :

```powershell
Invoke-RestMethod http://127.0.0.1:3001/api/health
```

Pada mode mandiri tanpa `WAIFUDESK_API_SECRET`, backend tidak mengaktifkan pemeriksaan kunci internal sidecar. Endpoint pengguna tetap menggunakan mekanisme autentikasi dan permission yang berlaku

Jalankan backend hanya pada lingkungan pengembangan lokal yang dipercaya

### 4. Menjalankan Frontend di Browser

Buka terminal kedua pada folder proyek

```powershell
npm.cmd run dev
```

Kemudian buka:

```text
http://127.0.0.1:1420/
```

Vite akan meneruskan request `/api` ke backend Rust lokal melalui development proxy

**Penting:** Halaman login membutuhkan backend Axum yang berjalan

Menjalankan frontend saja tidak cukup untuk menyelesaikan registrasi atau login

Fitur native seperti pembacaan Codex lokal dan Mini Widget hanya tersedia pada aplikasi desktop

### 5. Menyiapkan Rust API Sidecar

Sebelum menjalankan atau membangun aplikasi Tauri dari fresh clone, executable Rust API harus dikompilasi dan ditempatkan pada lokasi yang digunakan oleh Tauri

Jalankan dari direktori utama proyek :

```powershell
cargo build --manifest-path server/Cargo.toml --release
```

Siapkan folder binary Tauri dan salin hasil build :

```powershell
$targetTriple = (rustc --print host-tuple).Trim()

New-Item `
    -ItemType Directory `
    -Force `
    -Path "src-tauri/binaries" | Out-Null

Copy-Item `
    "server/target/release/server.exe" `
    "src-tauri/binaries/waifudesk-api-$targetTriple.exe" `
    -Force
```

Periksa executable :

```powershell
Get-Item "src-tauri/binaries/waifudesk-api-$targetTriple.exe"
```

Untuk target Windows MSVC x64, nama binary yang digunakan adalah :

```text
waifudesk-api-x86_64-pc-windows-msvc.exe
```

File executable ini diabaikan oleh `.gitignore`, sehingga tidak otomatis tersedia ketika repository di-clone

**Catatan:** Proses persiapan sidecar masih dilakukan secara manual

Otomatisasi build sidecar direncanakan pada tahap pengembangan berikutnya

### 6. Menjalankan Aplikasi Desktop

Pastikan backend Rust yang dijalankan secara manual sudah dihentikan sehingga port `3001` tidak digunakan

Kemudian jalankan :

```powershell
npm.cmd run tauri dev
```

Tauri akan membuka jendela WaifuDesk dan menjalankan Rust API Sidecar secara otomatis

Aplikasi dapat digunakan untuk melakukan registrasi akun, login, membuka dashboard dan menggunakan fitur native desktop

### 7. Membuat Installer Windows

Pastikan executable sidecar sudah dibuat menggunakan langkah sebelumnya

Kemudian jalankan :

```powershell
npm.cmd run tauri build
```

Konfigurasi bundling saat ini menggunakan NSIS untuk menghasilkan installer Windows

Hasil build tersedia pada :

```text
src-tauri/target/release/bundle/nsis/
```

Contoh nama installer versi 0.1.0 :

```text
WaifuDesk_0.1.0_x64-setup.exe
```

Installer tersebut dapat digunakan untuk menguji aplikasi desktop tanpa menjalankan Vite atau Cargo secara manual

Repository source code tidak otomatis menyertakan installer siap pakai. Publikasi installer melalui GitHub Releases dilakukan secara terpisah

## Pemeriksaan Kualitas

WaifuDesk menggunakan pemeriksaan otomatis untuk frontend, Rust API dan Tauri

### Frontend

Jalankan :

```powershell
npm.cmd run verify
node .\scripts\check-architecture.mjs
```

Perintah `verify` menjalankan :

- ESLint
- Pemeriksaan format Prettier
- Pemeriksaan TypeScript
- Build Vite
- Pengujian Vitest

Pengujian frontend terakhir yang telah dijalankan pada tahap integrasi fullstack menghasilkan **51 test berhasil**

### Backend Rust Axum

Jalankan :

```powershell
cargo fmt --manifest-path server/Cargo.toml --all -- --check

cargo test --manifest-path server/Cargo.toml

cargo clippy --manifest-path server/Cargo.toml --all-targets -- -D warnings
```

Pengujian backend mencakup :

- Password hashing dan verification
- Session token
- Registrasi dan login
- Logout dan session revocation
- Duplicate registration
- Authentication dan authorization
- Role dan permission
- Migrasi database
- Health check
- Perlindungan kunci internal sidecar

Pada pengujian integrasi terakhir, **28 pengujian backend Rust berhasil** dan Clippy selesai tanpa warning

### Tauri Rust

Jalankan :

```powershell
cargo fmt --manifest-path src-tauri/Cargo.toml --all -- --check

cargo test --manifest-path src-tauri/Cargo.toml --lib

cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
```

Pengujian Rust Tauri dilakukan terpisah dari backend Axum karena keduanya memiliki manifest Cargo masing-masing

### Pengujian Installer

Versi Windows `0.1.0` telah diuji secara lokal dengan hasil **9 dari 9 skenario berhasil**, mencakup :

- Instalasi aplikasi
- Startup aplikasi tanpa Vite dan Cargo
- Startup otomatis Rust API Sidecar
- Registrasi dan login
- Navigasi dashboard
- Mini Widget
- Logout dan login kembali
- Penolakan request tanpa kunci internal (`401 Unauthorized`)
- Penghentian backend saat aplikasi ditutup

Hasil tersebut merupakan pengujian lokal dan tidak menggantikan pemeriksaan keamanan serta pengujian pada komputer Windows lainnya

## Struktur Proyek

```text
waifu-desk/
├── .github/
│   └── workflows/           # GitHub Actions
│
├── docs/                    # Dokumentasi proyek
├── scripts/                 # Pemeriksaan arsitektur
│
├── server/                  # Backend HTTP Rust Axum
│   ├── migrations/          # Migrasi database SQLite
│   ├── src/
│   │   ├── auth/            # Password, session, permission, handler
│   │   ├── http_tests.rs    # Pengujian HTTP dan keamanan API
│   │   └── main.rs          # Router dan startup server
│   └── Cargo.toml
│
├── src/                     # Frontend React + TypeScript
│   ├── App.tsx              # Shell aplikasi dan navigasi
│   ├── components/          # Komponen UI bersama
│   ├── design-system/       # Design system dan komponen
│   ├── features/
│   │   ├── appearance/      # Tema, maskot, dan wallpaper
│   │   ├── auth/            # Login, registrasi, dan API client
│   │   ├── codex/           # Pemantauan Codex
│   │   ├── github/          # GitHub API dan cache
│   │   └── local-git/       # Fitur Git lokal
│   ├── pages/               # Halaman aplikasi
│   ├── styles/              # CSS dan layout
│   └── styles.css
│
├── src-tauri/               # Desktop runtime Tauri
│   ├── binaries/            # Executable API sidecar lokal
│   ├── capabilities/        # Konfigurasi permission Tauri
│   ├── src/
│   │   ├── api_bridge.rs    # Tauri IPC ke Rust Axum
│   │   ├── codex_directory.rs
│   │   ├── git_tools.rs
│   │   ├── lib.rs           # Startup dan lifecycle Tauri
│   │   └── usage.rs         # Parser penggunaan Codex
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── CONTRIBUTING.md
├── LICENSE
├── package.json
├── package-lock.json
├── vite.config.ts
└── README.md
```

Direktori `server/target/`, `src-tauri/target/`, `node_modules/` dan file executable hasil build tidak dimaksudkan untuk dimasukkan ke Git

Dokumentasi tambahan :

- [Architecture](docs/ARCHITECTURE.md)
- [CSS Architecture](docs/CSS-ARCHITECTURE.md)
- [Anime Assets](docs/ANIME-ASSETS.md)
- [Asset Provenance](docs/ASSET-PROVENANCE.md)
- [Publishing](docs/PUBLISHING.md)
- [Contributing](CONTRIBUTING.md)

## Akurasi Data dan Privasi

### Data GitHub

Informasi GitHub diambil dari API publik

Riwayat aktivitas yang ditampilkan merupakan sampel terbatas dan tidak boleh dianggap sebagai ukuran keseluruhan commit atau produktivitas developer

Data dapat terlambat diperbarui karena cache dan batas permintaan GitHub API

### Data Codex

Ringkasan penggunaan Codex dihitung dari catatan sesi lokal yang tersedia

Hasil dapat tidak lengkap akibat berkas sesi yang hilang, perubahan format log atau reset penghitung penggunaan

Informasi kuota yang muncul dari log bukan pemeriksaan langsung terhadap kuota akun

### Data Authentication

Akun pengguna WaifuDesk disimpan pada database SQLite lokal

Password disimpan menggunakan hash Argon2, sedangkan token sesi disimpan pada database dalam bentuk hash

Dalam implementasi desktop saat ini, frontend berkomunikasi dengan Axum melalui Tauri IPC dan API Bridge

Backend tidak memerlukan layanan database cloud untuk menyimpan akun lokal

Jangan mengunggah file database, kredensial, token, `.env` atau catatan percakapan pribadi ke repository

## Status Pengembangan dan Keterbatasan

WaifuDesk masih dalam tahap pengembangan aktif

Fitur utama desktop, Authentication API, Rust Sidecar dan installer Windows telah berhasil diuji secara lokal

- Integrasi GitHub masih terbatas pada data publik
- OAuth GitHub dan Single Sign-On belum didukung
- Belum tersedia halaman administrasi lengkap untuk pengelolaan role dan permission
- Sistem login masih memerlukan rate limiting dan pengamanan tambahan
- Content Security Policy Tauri masih perlu dikonfigurasi
- Pembatasan akses IPC berdasarkan jendela masih perlu diselesaikan
- Backend saat ini menggunakan port loopback tetap `3001`
- GitHub Pages hanya menyediakan frontend statis dan tidak menjalankan Rust API
- Format log Codex dapat berubah dan memerlukan penyesuaian parser
- Estimasi biaya token belum tersedia
- Live2D belum tersedia; Hana masih menggunakan sprite PNG
- Dukungan build dan pengujian desktop saat ini difokuskan pada Windows

**WaifuDesk belum dinyatakan siap untuk distribusi produksi atau penggunaan publik yang memerlukan jaminan keamanan**

## Live Demo dan Desktop

GitHub Pages digunakan sebagai pratinjau frontend statis. Layanan ini tidak menjalankan backend Rust Axum maupun database SQLite WaifuDesk

Karena itu, registrasi dan login pada halaman statis tidak dapat berfungsi tanpa backend yang sesuai

Untuk mencoba sistem Authentication, fitur native, dan integrasi Rust Sidecar, jalankan aplikasi desktop atau lingkungan development lokal sesuai panduan instalasi

**Source Code :** https://github.com/waifujahat/waifu-desk/tree/feature/fullstack

## Kontribusi dan Pengembangan

Pengembangan dilakukan secara bertahap dengan pemisahan fitur dan pengujian sebelum perubahan digabungkan ke branch utama

Panduan kontribusi tersedia pada [CONTRIBUTING.md](CONTRIBUTING.md)

## Lisensi

Ketentuan lisensi source code dapat dilihat pada [LICENSE](LICENSE)

## Kredit dan Aset Pihak Ketiga

**Wallpaper Video :** [Sakura Blade Elegance — MotionBGS](https://motionbgs.com/sakura-blade-elegance)

Informasi aset anime dan sumbernya tersedia pada [ANIME-ASSETS.md](docs/ANIME-ASSETS.md) serta [ASSET-PROVENANCE.md](docs/ASSET-PROVENANCE.md)

---

**WaifuDesk** — React · TypeScript · Tauri · Rust · Axum · SQLite

Developed by [waifujahat](https://github.com/waifujahat) - Nurwidhi Maulana Nugraha
