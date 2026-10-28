import { WallpaperSettings, type WallpaperPreferences } from '../features/appearance'; // wd-anime-edition-stages-1-2
import { SakuraIcon, TsukiIcon, WaifuMark } from '../design-system/icons/AnimeMarks'; // wd-anime-theme-installed
import type { AnimePalette } from '../design-system/animeTheme';
import { Check, FolderOpen, Github, HardDrive, Monitor, Moon, RotateCcw, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Theme } from '../types';
import { PageHeader } from '../components/Display';
import {
  desktopAvailable,
  getCodexDirectory,
  pickCodexFolder,
  resetCodexDirectory,
  setCodexDirectory,
  toggleMini,
} from '../lib/desktop';
import type { CodexDirectory } from '../lib/desktop';
import { Button } from '../design-system/components/Button';

interface SettingsProps {
  wallpaper: WallpaperPreferences;
  onWallpaperChange: (patch: Partial<WallpaperPreferences>) => void;
  username: string;
  onUsername: (value: string) => void;
  theme: Theme;
  onTheme: () => void;
  palette: AnimePalette;
  onPalette: (palette: AnimePalette) => void;
  onCodexRefresh: () => void;
}

export default function Settings({
  wallpaper,
  onWallpaperChange,
  username,
  onUsername,
  theme,
  onTheme,
  palette,
  onPalette,
  onCodexRefresh,
}: SettingsProps) {
  const [draft, setDraft] = useState(username);
  const [notice, setNotice] = useState('');
  const [directory, setDirectory] = useState<CodexDirectory | null>(null);
  const [directoryBusy, setDirectoryBusy] = useState(false);
  const [directoryMessage, setDirectoryMessage] = useState('');
  const desktop = desktopAvailable();

  useEffect(() => {
    if (!desktop) return;
    let cancelled = false;
    getCodexDirectory()
      .then((value) => {
        if (!cancelled) setDirectory(value);
      })
      .catch((error) => {
        if (!cancelled) setDirectoryMessage(String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [desktop]);

  async function chooseDirectory() {
    setDirectoryBusy(true);
    setDirectoryMessage('');
    try {
      const path = await pickCodexFolder();
      if (!path) return; // Cancelled, keep the existing setting.
      const result = await setCodexDirectory(path);
      setDirectory(result);
      setDirectoryMessage('Folder tersimpan.');
      onCodexRefresh();
    } catch (error) {
      setDirectoryMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDirectoryBusy(false);
    }
  }

  async function restoreDirectory() {
    setDirectoryBusy(true);
    setDirectoryMessage('');
    try {
      const result = await resetCodexDirectory();
      setDirectory(result);
      setDirectoryMessage('Lokasi otomatis dipulihkan.');
      onCodexRefresh();
    } catch (error) {
      setDirectoryMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setDirectoryBusy(false);
    }
  }

  useEffect(() => setDraft(username), [username]);

  function save() {
    const value = draft.trim();

    if (!/^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$/.test(value)) {
      setNotice('Username tidak valid.');
      return;
    }

    onUsername(value);
    setNotice('Tersimpan');
  }

  return (
    <>
      <PageHeader title="Pengaturan" />
      <div className="settings-grid">
        <section className="panel settings-panel">
          <div className="setting-title">
            <span className="settings-symbol">
              <Github size={20} />
            </span>
            <h3>Akun GitHub</h3>
          </div>
          <label className="field-label" htmlFor="github-username">
            Username
          </label>
          <div className="setting-row">
            <span className="setting-prefix">github.com/</span>
            <input
              id="github-username"
              value={draft}
              maxLength={39}
              onChange={(event) => {
                setDraft(event.target.value);
                setNotice('');
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') save();
              }}
            />
            <Button variant="primary" className="settings-save" onClick={save}>
              <Check size={16} /> Simpan
            </Button>
          </div>
          {notice && (
            <p className="field-feedback" role="status">
              {notice}
            </p>
          )}
        </section>

        <section className="panel settings-panel">
          <div className="setting-title">
            <span className="settings-symbol">
              <Monitor size={20} />
            </span>
            <h3>Tampilan</h3>
          </div>
          <div className="theme-options">
            <button
              type="button"
              className={`theme-option ${theme === 'light' ? 'chosen' : ''}`}
              aria-pressed={theme === 'light'}
              onClick={theme === 'light' ? undefined : onTheme}
            >
              <Sun size={20} />
              <strong>Terang</strong>
              {theme === 'light' && <Check size={17} />}
            </button>
            <button
              type="button"
              className={`theme-option ${theme === 'dark' ? 'chosen' : ''}`}
              aria-pressed={theme === 'dark'}
              onClick={theme === 'dark' ? undefined : onTheme}
            >
              <Moon size={20} />
              <strong>Gelap</strong>
              {theme === 'dark' && <Check size={17} />}
            </button>
          </div>
        </section>

        <section className="panel settings-panel wd-anime-settings">
          <div className="setting-title">
            <span className="settings-symbol">
              <SakuraIcon width={20} height={20} />
            </span>
            <h3>Gaya visual</h3>
          </div>
          <div className="wd-palette-options" role="group" aria-label="Pilih gaya visual">
            <button
              type="button"
              className="wd-palette-option wd-palette-option--classic"
              aria-pressed={palette === 'classic'}
              onClick={() => onPalette('classic')}
            >
              <WaifuMark />
              <strong>Classic</strong>
              <small>Minimal, netral</small>
            </button>
            <button
              type="button"
              className="wd-palette-option wd-palette-option--sakura"
              aria-pressed={palette === 'sakura'}
              onClick={() => onPalette('sakura')}
            >
              <SakuraIcon />
              <strong>Sakura</strong>
              <small>Pink lembut</small>
            </button>
            <button
              type="button"
              className="wd-palette-option wd-palette-option--tsuki"
              aria-pressed={palette === 'tsuki'}
              onClick={() => onPalette('tsuki')}
            >
              <TsukiIcon />
              <strong>Tsuki</strong>
              <small>Biru malam</small>
            </button>
          </div>
        </section>

        <WallpaperSettings wallpaper={wallpaper} onChange={onWallpaperChange} />

        <section className="panel settings-panel">
          <div className="setting-title">
            <span className="settings-symbol">
              <HardDrive size={20} />
            </span>
            <h3>Codex lokal</h3>
          </div>
          <div className="settings-status">
            <span className={`state-dot ${directory?.available ? 'active' : ''}`} />
            {!desktop
              ? 'Perlu aplikasi desktop'
              : directory?.available
                ? 'Folder Codex ditemukan'
                : 'Folder Codex belum ditemukan'}
          </div>
          {desktop && (
            <>
              <label className="field-label" htmlFor="codex-directory">
                Lokasi data Codex
              </label>
              <input
                id="codex-directory"
                className="wd-directory-path"
                readOnly
                value={directory?.path ?? 'Memeriksa folder…'}
                title={directory?.path}
              />
              {directory && <p className="setting-hint">Sumber: {directory.source}</p>}
              <div className="setting-buttons">
                <Button
                  variant="secondary"
                  busy={directoryBusy}
                  disabled={directoryBusy}
                  onClick={() => void chooseDirectory()}
                >
                  <FolderOpen size={16} /> Pilih folder
                </Button>
                <Button
                  variant="ghost"
                  disabled={directoryBusy || directory?.source !== 'Dipilih pengguna'}
                  onClick={() => void restoreDirectory()}
                >
                  <RotateCcw size={16} /> Otomatis
                </Button>
              </div>
              {directoryMessage && (
                <p className="field-feedback" role="status">
                  {directoryMessage}
                </p>
              )}
            </>
          )}
          <div className="setting-buttons">
            <Button variant="secondary" disabled={!desktop} onClick={() => void toggleMini()}>
              <Monitor size={16} /> Mini widget
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
