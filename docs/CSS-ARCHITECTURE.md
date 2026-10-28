# WaifuDesk — CSS Architecture

## Aturan dasar

- `01-tokens.css` adalah sumber warna, jarak, radius, dan alias kompatibilitas dark/light mode.
- `02-base.css` untuk reset dan tipografi; `03-shell.css` untuk shell/sidebar/topbar.
- `04-dashboard.css` s.d. `09-mini-widget.css` mengatur komponen/halaman spesifik.
- `10-responsive.css` adalah breakpoint dasar.
- `11-density-{shell,dashboard,github,settings,responsive}.css` mengelompokkan *compact density layer* yang sebelumnya seluruhnya berada di `11-density.css`.
- `12-primitives.css` untuk elemen design system.
- `13-overview.css` dan `14-codex-analytics.css` untuk modul baru.

## Mengapa density masih muncul sesudah responsive?

Aturan density adalah keputusan desain WaifuDesk yang dibuat setelah stylesheet awal. Sprint 3 **tidak mengubah posisi cascade atau nilai** supaya tampilan tidak bergeser. Yang dibenahi sekarang adalah kepemilikan dan navigasi file: setiap aturan density punya modul tujuan dan breakpoint density terkumpul.

### Follow-up CSS cleanup (commit terpisah)

Migrasikan aturan base density ke modul pemilik (`shell`, `dashboard`, `repositories`, `settings`), lalu satukan breakpoint dasar/density dan lakukan visual regression testing desktop/mobile. Hilangkan layer compatibility baru setelah visual QA. Jangan menghapus override sekaligus tanpa screenshot dan ukuran viewport pembanding.

## Konvensi

- Gunakan design tokens, bukan menambah warna hardcode di halaman.
- Utamakan class komponen (`.wd-*`) dan selector pendek dibanding selector bertingkat dengan specificity tinggi.
- Hindari `!important` kecuali accessibility/preferences.
- Setiap perubahan CSS diuji di dark/light, lebar normal, serta jendela sempit.
