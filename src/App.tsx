import MiniApp from './components/MiniApp';
import { MascotHost } from './features/appearance/components/MascotHost';
import { useMascot } from './features/appearance/hooks/useMascot';
import { WallpaperLayer, useAppearance } from './features/appearance';
import { readAnimePalette, type AnimePalette } from './design-system/animeTheme';
import { useEffect, useState } from 'react';
import type { Page, Theme } from './types';
import { useGithub } from './features/github/index';
import { useCodex } from './features/codex/index';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import AI from './pages/AI';
import Repositories from './pages/Repositories';
import Activity from './pages/Activity';
import Settings from './pages/Settings';
import { desktopAvailable } from './lib/desktop';

const PAGES: Page[] = ['overview', 'ai', 'repositories', 'activity', 'settings'];
const isPage = (value: string): value is Page => PAGES.includes(value as Page);

function readPreference(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function MainApp() {
  // Hana tetap aktif, hanya panel pengaturannya yang dihapus.
  const { mascot, updateMascot } = useMascot();
  const { wallpaper, updateWallpaper } = useAppearance();

  const [username, setUsername] = useState(() => readPreference('dc-username', 'waifujahat'));

  const [theme, setTheme] = useState<Theme>(() =>
    readPreference('dc-theme', 'dark') === 'light' ? 'light' : 'dark',
  );

  const [palette, setPalette] = useState<AnimePalette>(() =>
    readAnimePalette(readPreference('wd-palette', 'classic')),
  );

  const [page, setPage] = useState<Page>(() => {
    const hash = location.hash.slice(1);
    return isPage(hash) ? hash : 'overview';
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const github = useGithub(username);
  const codex = useCodex();

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    try {
      localStorage.setItem('dc-theme', theme);
    } catch {
      /* optional */
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('dc-username', username);
    } catch {
      /* optional */
    }
  }, [username]);

  useEffect(() => {
    const handleHash = () => {
      const hash = location.hash.slice(1);
      setPage(isPage(hash) ? hash : 'overview');
    };

    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;

    try {
      localStorage.setItem('wd-palette', palette);
    } catch {
      /* optional */
    }
  }, [palette]);

  function navigate(next: Page) {
    setPage(next);

    if (location.hash !== `#${next}`) {
      location.hash = next;
    }

    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  function refreshAll() {
    void github.refresh(true);
    void codex.refresh();
  }

  return (
    <div className="app-shell">
      <Sidebar
        username={username}
        page={page}
        onPage={navigate}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <div className="app-main">
        {/* Hana tetap muncul di halaman Ringkasan */}
        {page === 'overview' && <MascotHost mascot={mascot} onChange={updateMascot} />}

        {/* Live wallpaper tetap aktif pada semua tema */}
        <WallpaperLayer palette={palette} wallpaper={wallpaper} />

        <Topbar
          theme={theme}
          onTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
          onMenu={() => setMenuOpen(true)}
          refresh={refreshAll}
          loading={github.loading || codex.loading}
        />

        <main className="content-area">
          {page === 'overview' && (
            <Overview
              github={github.data}
              githubLoading={github.loading}
              githubError={github.error}
              codex={codex.data}
              codexLoading={codex.loading}
              codexError={codex.error}
              onRefreshGitHub={() => void github.refresh(true)}
              onPage={navigate}
              desktop={codex.desktop}
            />
          )}

          {page === 'ai' && (
            <AI
              snapshot={codex.data}
              desktop={codex.desktop}
              loading={codex.loading}
              error={codex.error}
              onRefresh={() => void codex.refresh()}
            />
          )}

          {page === 'repositories' && (
            <Repositories
              repos={github.data.repos}
              loading={github.loading}
              warnings={github.data.warnings}
              error={github.error}
              onRetry={() => void github.refresh(true)}
            />
          )}

          {page === 'activity' && (
            <Activity
              events={github.data.events}
              loading={github.loading}
              warnings={github.data.warnings}
              error={github.error}
              onRetry={() => void github.refresh(true)}
            />
          )}

          {page === 'settings' && (
            <Settings
              wallpaper={wallpaper}
              onWallpaperChange={updateWallpaper}
              palette={palette}
              onPalette={setPalette}
              username={username}
              onUsername={setUsername}
              theme={theme}
              onTheme={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
              onCodexRefresh={() => void codex.refresh()}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const isWidget = new URLSearchParams(location.search).get('widget') === '1' && desktopAvailable();

  return isWidget ? <MiniApp /> : <MainApp />;
}
