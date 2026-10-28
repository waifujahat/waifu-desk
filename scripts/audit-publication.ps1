<#
WaifuDesk publication audit (READ ONLY). The project owner reports having
permission to redistribute the MotionBGS Sakura Blade Elegance wallpaper with
attribution. The audit can check credit and file inclusion, but CANNOT verify
legal permission, its author or its distribution scope.
#>
param([string]$ProjectPath = (Get-Location).Path)

$ErrorActionPreference = 'Stop'
$ProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
$blockers = New-Object 'System.Collections.Generic.List[string]'
$warnings = New-Object 'System.Collections.Generic.List[string]'

function Block([string]$Message) { $script:blockers.Add($Message) | Out-Null }
function Warn([string]$Message) { $script:warnings.Add($Message) | Out-Null }
function Relative([string]$Path) { Join-Path -Path $ProjectPath -ChildPath $Path }

$approvedVideo = 'src/assets/anime/wallpapers/sakura-blade-elegance.mp4'
$approvedBuildVideo = '^sakura-blade-elegance(?:-[A-Za-z0-9_-]+)?\.mp4$'
$creditText = 'motionbgs.com/sakura-blade-elegance'
$tracked = @()
$isRepo = $false

Write-Host '=== WaifuDesk Publication Audit (READ ONLY; approved video) ==='
Write-Host "Project: $ProjectPath"

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Block 'Git tidak ditemukan.'
} else {
  $inside = & git -C $ProjectPath rev-parse --is-inside-work-tree 2>$null
  if ($LASTEXITCODE -ne 0 -or $inside -ne 'true') {
    Block 'Folder bukan repository Git.'
  } else {
    $isRepo = $true
    $tracked = @(& git -C $ProjectPath ls-files)
    $forbidden = '(?i)(^|/)(node_modules|dist|target|backups?|archives?)(/|$)|\.(mov|webm|zip|7z|rar)$|(^|/)\.env($|\.)|(^|/)(auth|credentials?|token)\.json$|^apply-waifudesk-.*\.mjs$'

    foreach ($file in $tracked) {
      if ($file -match '(^|/)\.env\.example$') { continue }
      if ($file -match $forbidden) { Block "File tidak boleh masuk Git: $file" }
      if ($file -match '(?i)\.mp4$' -and $file -ne $approvedVideo) {
        Block "MP4 lain tidak termasuk izin khusus wallpaper: $file"
      }
    }

    $staged = @(& git -C $ProjectPath diff --cached --name-only)
    Write-Host ("Tracked files: {0}; staged files: {1}" -f $tracked.Count, $staged.Count)
    if ($staged.Count -gt 0) {
      Write-Host 'Staged preview (max 40):'
      $staged | Select-Object -First 40 | ForEach-Object { Write-Host "  $_" }
    }

    & git -C $ProjectPath diff --cached --check | Out-Null
    if ($LASTEXITCODE -ne 0) { Block 'Staging mengandung whitespace/error: git diff --cached --check.' }

    $unstaged = @(& git -C $ProjectPath diff --name-only)
    if ($unstaged.Count -gt 0) {
      Warn ("{0} tracked file memiliki perubahan belum di-stage; audit index mungkin memeriksa versi lama." -f $unstaged.Count)
    }
  }
}

if ($isRepo -and ($tracked -notcontains $approvedVideo)) {
  Block "Wallpaper berizin belum ter-track dalam Git: $approvedVideo (clone publik dapat gagal build)."
}
if (-not (Test-Path -LiteralPath (Relative $approvedVideo))) {
  Block "File wallpaper utama tidak ditemukan: $approvedVideo"
}

$src = Relative 'src'
if (Test-Path -LiteralPath $src) {
  $sources = @(Get-ChildItem -Path $src -Recurse -File -Include *.ts,*.tsx -ErrorAction SilentlyContinue)
  foreach ($file in $sources) {
    $directImportMatches = @(Select-String -Path $file.FullName -Pattern 'import\s+[^\r\n]+\s+from\s+["''][^"'']+\.mp4["'']' -ErrorAction SilentlyContinue)
    foreach ($match in $directImportMatches) {
      $relativePath = $file.FullName.Substring($ProjectPath.Length + 1).Replace('\', '/')
      if ($relativePath -eq 'src/features/appearance/components/WallpaperLayer.tsx' -and
          $match.Line -match '["''][^"'']*sakura-blade-elegance\.mp4["'']') {
        Write-Host "[OK] Import wallpaper yang diizinkan: $relativePath"
      } else {
        Block "Import MP4 di luar allowlist: $relativePath"
      }
    }
  }
}

$duplicatePath = Relative 'public/local-wallpaper.mp4'
if (Test-Path -LiteralPath $duplicatePath) {
  Block 'Ada duplikat video di public/local-wallpaper.mp4; file public akan disalin mentah ke dist.'
}

$dist = Relative 'dist'
if (Test-Path -LiteralPath $dist) {
  $videos = @(Get-ChildItem -Path $dist -File -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -in @('.mp4', '.mov', '.webm') })
  foreach ($file in $videos) {
    if ($file.Name -match $approvedBuildVideo) {
      Write-Host "[OK] Video berizin di dist: $($file.Name)"
    } else {
      Block "Video lain di output build perlu review: $($file.FullName)"
    }
  }
}

foreach ($file in @('README.md', 'docs/ASSET-PROVENANCE.md')) {
  $path = Relative $file
  if (-not (Test-Path -LiteralPath $path)) {
    Block "Dokumen kredit belum tersedia: $file"
  } elseif (-not (Select-String -Path $path -SimpleMatch $creditText -Quiet)) {
    Block "Kredit sumber MotionBGS belum tertulis di $file"
  }
}
foreach ($file in @('.gitignore', 'package.json', 'package-lock.json', 'src-tauri/tauri.conf.json', 'LICENSE')) {
  if (-not (Test-Path -LiteralPath (Relative $file))) { Warn "File rilis belum ditemukan: $file" }
}

Write-Host ''
Write-Host ("BLOCKERS: {0}" -f $blockers.Count)
foreach ($entry in $blockers) { Write-Host "  [BLOCK] $entry" -ForegroundColor Red }
Write-Host ("WARNINGS: {0}" -f $warnings.Count)
foreach ($entry in $warnings) { Write-Host "  [REVIEW] $entry" -ForegroundColor Yellow }

if ($blockers.Count -gt 0) {
  Write-Host 'Audit belum lolos; jangan publish dahulu.' -ForegroundColor Red
  exit 2
}
Write-Host 'Audit teknis dasar lolos. Cakupan izin video tetap perlu cocok dengan metode distribusi.' -ForegroundColor Green
exit 0
