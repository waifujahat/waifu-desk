import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

const isRelease = process.argv.includes('--release');
const profile = isRelease ? 'release' : 'debug';

function prepareSidecar() {
  if (process.platform !== 'win32') {
    throw new Error(
      'Otomatisasi sidecar ini khusus untuk Windows.',
    );
  }

  const hostTriple = execFileSync(
    'rustc',
    ['--print', 'host-tuple'],
    {
      cwd: projectRoot,
      encoding: 'utf8',
    },
  ).trim();

  const targetTriple =
    process.env.TAURI_ENV_TARGET_TRIPLE?.trim() ||
    hostTriple;

  if (targetTriple !== hostTriple) {
    throw new Error(
      `Cross-compilation belum didukung: ${targetTriple}`,
    );
  }

  console.log(`[Sidecar] Building Rust API (${profile})...`);

  const args = [
    'build',
    '--manifest-path',
    path.join(projectRoot, 'server', 'Cargo.toml'),
    '--locked',
  ];

  if (isRelease) {
    args.push('--release');
  }

  const result = spawnSync('cargo', args, {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  const source = path.join(
    projectRoot,
    'server',
    'target',
    profile,
    'server.exe',
  );

  if (!existsSync(source)) {
    throw new Error(`Executable tidak ditemukan: ${source}`);
  }

  const binaryDirectory = path.join(
    projectRoot,
    'src-tauri',
    'binaries',
  );

  mkdirSync(binaryDirectory, { recursive: true });

  const destination = path.join(
    binaryDirectory,
    `waifudesk-api-${targetTriple}.exe`,
  );

  copyFileSync(source, destination);

  console.log(`[Sidecar] Ready: ${destination}`);
}

try {
  prepareSidecar();
} catch (error) {
  console.error('[Sidecar] Build gagal:', error);
  process.exitCode = 1;
}
