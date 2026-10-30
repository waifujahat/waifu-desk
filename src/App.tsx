import { useEffect, useState } from 'react';

import type { Page } from './types';

import MiniApp from './components/MiniApp';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';

import { MascotHost } from './features/appearance/components/MascotHost';
import { useMascot } from './features/appearance/hooks/useMascot';
import { WallpaperLayer, useAppearance } from './features/appearance';

import { useGithub } from './features/github/index';
import { useCodex } from './features/codex/index';

import Overview from './pages/Overview';
import AI from './pages/AI';
import Repositories from './pages/Repositories';
import Activity from './pages/Activity';
import Settings from './pages/Settings';

import { desktopAvailable } from './lib/desktop';
import { useAppPreferences } from './hooks/useAppPreferences';

import LoginPage from './features/auth/LoginPage';
import { logoutAccount } from './features/auth/api';
import type { AuthProfile, AuthSession } from './features/auth/api';

const PAGES: Page[] = ['overview', 'ai', 'repositories', 'activity', 'settings'];

const isPage = (value: string): value is Page => PAGES.includes(value as Page);

interface MainAppProps {
  account: AuthProfile;
  onLogout: () => void;
  logoutBusy: boolean;
  logoutError: string;
}

// ==========================================
// MAIN DASHBOARD
// ==========================================

function MainApp({ account, onLogout, logoutBusy, logoutError }: MainAppProps) {
  const { mascot, updateMascot } = useMascot();

  const { wallpaper, updateWallpaper } = useAppearance();

  const { username, setUsername, theme, setTheme, palette, setPalette } = useAppPreferences();

  const [page, setPage] = useState<Page>(() => {
    const hash = location.hash.slice(1);

    return isPage(hash) ? hash : 'overview';
  });

  const [menuOpen, setMenuOpen] = useState(false);

  const github = useGithub(username);
  const codex = useCodex();

  useEffect(() => {
    const handleHash = () => {
      const hash = location.hash.slice(1);

      setPage(isPage(hash) ? hash : 'overview');
    };

    window.addEventListener('hashchange', handleHash);

    return () => {
      window.removeEventListener('hashchange', handleHash);
    };
  }, []);

  function navigate(next: Page) {
    setPage(next);

    if (location.hash !== `#${next}`) {
      location.hash = next;
    }

    window.scrollTo({
      top: 0,
      behavior: 'auto',
    });
  }

  function refreshAll() {
    void github.refresh(true);
    void codex.refresh();
  }

  function toggleTheme() {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
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
        {page === 'overview' && <MascotHost mascot={mascot} onChange={updateMascot} />}

        <WallpaperLayer palette={palette} wallpaper={wallpaper} />

        <Topbar
          theme={theme}
          onTheme={toggleTheme}
          onMenu={() => setMenuOpen(true)}
          refresh={refreshAll}
          loading={github.loading || codex.loading}
        />

        <div className="wd-accountbar">
          <span className="wd-accountbar-email">
            {account.display_name} · {account.email}
          </span>

          <button
            type="button"
            className="wd-accountbar-logout"
            onClick={onLogout}
            disabled={logoutBusy}
          >
            {logoutBusy ? 'Keluar...' : 'Logout'}
          </button>

          {logoutError && (
            <span className="wd-accountbar-error" role="alert">
              {logoutError}
            </span>
          )}
        </div>

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
              onTheme={toggleTheme}
              onCodexRefresh={() => void codex.refresh()}
            />
          )}
        </main>
      </div>
    </div>
  );
}

// ==========================================
// AUTHENTICATION GATE
// ==========================================

export default function App() {
  // Token sengaja hanya disimpan di memori.
  const [session, setSession] = useState<AuthSession | null>(null);

  const [logoutBusy, setLogoutBusy] = useState(false);
  const [logoutError, setLogoutError] = useState('');

  const isWidget = new URLSearchParams(location.search).get('widget') === '1' && desktopAvailable();

  async function handleLogout() {
    if (!session || logoutBusy) return;

    setLogoutBusy(true);
    setLogoutError('');

    try {
      await logoutAccount(session.token);

      setSession(null);
    } catch (error) {
      setLogoutError(error instanceof Error ? error.message : 'Logout gagal. Silakan coba lagi.');
    } finally {
      setLogoutBusy(false);
    }
  }

  // Pertahankan widget desktop yang sudah ada.
  if (isWidget) {
    return <MiniApp />;
  }

  // Dashboard utama membutuhkan login.
  if (!session) {
    return (
      <LoginPage
        onAuthenticated={(nextSession) => {
          setSession(nextSession);
          setLogoutError('');
        }}
      />
    );
  }

  return (
    <MainApp
      account={session.profile}
      onLogout={() => void handleLogout()}
      logoutBusy={logoutBusy}
      logoutError={logoutError}
    />
  );
}
