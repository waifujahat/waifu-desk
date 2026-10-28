/**
 * Pastikan hasil Vite benar-benar menggunakan base path GitHub Pages.
 * Memeriksa file build saja; tidak mengakses jaringan atau mengubah source.
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const indexPath = resolve(process.cwd(), 'dist', 'index.html');
const expectedBase = '/waifu-desk/';

function fail(message) {
  console.error(`WaifuDesk Pages check gagal: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(indexPath)) {
  fail('dist/index.html tidak ditemukan. Bangun demo terlebih dahulu.');
} else {
  const html = readFileSync(indexPath, 'utf8');
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((value) => value.includes('/assets/'));

  if (assets.length === 0) {
    fail('Tidak ada asset bundle Vite di dist/index.html.');
  } else {
    const invalid = assets.filter((asset) => !asset.startsWith(`${expectedBase}assets/`));
    if (invalid.length > 0) {
      fail(`Base path salah: ${invalid.join(', ')}`);
    } else {
      console.log(`WaifuDesk Pages check OK: ${assets.length} asset memakai ${expectedBase}`);
    }
  }
}
