/** WaifuDesk architecture boundaries and import graph (Node only, no dependencies). */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const project = process.cwd();
const src = join(project, 'src');
const errors = [];
function collect(folder, found = []) {
  for (const item of readdirSync(folder, { withFileTypes: true })) {
    const file = join(folder, item.name);
    if (item.isDirectory()) collect(file, found);
    else if (/\.tsx?$/.test(item.name)) found.push(file);
  }
  return found;
}
function rel(file) { return relative(project, file).replaceAll('\\', '/'); }
function resolvable(file) {
  return ['', '.ts', '.tsx', '/index.ts', '/index.tsx', '.js', '.json'].some(ext => existsSync(file + ext));
}
if (!existsSync(src)) {
  console.error('Jalankan dari root WaifuDesk yang mempunyai folder src.');
  process.exit(1);
}
for (const file of collect(src)) {
  const short = rel(file);
  const text = readFileSync(file, 'utf8');
  const pattern = /\b(?:from\s*|import\s*\()(['"])(\.{1,2}\/[^'"\n]+)\1/g;
  let match;
  while ((match = pattern.exec(text))) {
    const target = resolve(dirname(file), match[2]);
    if (!resolvable(target)) errors.push(`${short}: import ${match[2]} tidak ditemukan`);
    if (/^src\/(App\.tsx|pages\/|components\/)/.test(short) && /\/features\/(github|codex)\/(hooks|services|domain)\//.test(target.replaceAll('\\', '/'))) {
      errors.push(`${short}: jangan import internal fitur ${match[2]}; gunakan features/<nama>/index.ts`);
    }
  }
}
for (const old of [
  'src/hooks/useGithub.ts', 'src/hooks/useCodex.ts', 'src/lib/githubService.ts',
  'src/lib/githubPolicy.ts', 'src/lib/githubStatus.ts', 'src/lib/codexAnalytics.ts',
  'src/lib/queuedRefresh.ts', 'src/components/UsageHeatmap.tsx',
]) {
  if (existsSync(join(project, ...old.split('/')))) errors.push(`Legacy module tertinggal: ${old}`);
}
const styleEntry = join(src, 'styles.css');
const css = readFileSync(styleEntry, 'utf8');
for (const match of css.matchAll(/@import\s+["'](\.\/[^"']+)["']/g)) {
  const path = resolve(dirname(styleEntry), match[1]);
  if (!existsSync(path)) errors.push(`CSS import tidak ditemukan: ${match[1]}`);
}
if (errors.length) {
  console.error(`WaifuDesk architecture check: ${errors.length} masalah`);
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('WaifuDesk architecture check: OK (import graph, boundaries, CSS imports).');
