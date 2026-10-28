import { Menu, Moon, PanelTopOpen, RefreshCw, Sun } from 'lucide-react'
import type { Theme } from '../types'
import { Button } from '../design-system/components/Button'
import { desktopAvailable, toggleMini } from '../lib/desktop'

interface TopbarProps {
  theme: Theme
  onTheme: () => void
  onMenu: () => void
  refresh: () => void
  loading: boolean
}

/** The page title lives in PageHeader; the toolbar only contains actions. */
export default function Topbar({ theme, onTheme, onMenu, refresh, loading }: TopbarProps) {
  return (
    <header className="topbar">
      <div className="top-left">
        <Button
          variant="icon"
          className="menu-button"
          onClick={onMenu}
          title="Buka menu"
          aria-label="Buka menu"
        >
          <Menu size={18} />
        </Button>
      </div>
      <div className="top-actions">
        <Button
          variant="icon"
          onClick={refresh}
          busy={loading}
          title="Perbarui data"
          aria-label="Perbarui data"
        >
          <RefreshCw size={17} className={loading ? 'spinner' : ''} />
        </Button>
        {desktopAvailable() && (
          <Button
            variant="icon"
            title="Mini widget"
            aria-label="Mini widget"
            onClick={() => void toggleMini()}
          >
            <PanelTopOpen size={18} />
          </Button>
        )}
        <Button
          variant="icon"
          title={theme === 'dark' ? 'Tema terang' : 'Tema gelap'}
          aria-label="Ubah tema"
          onClick={onTheme}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </Button>
      </div>
    </header>
  )
}
