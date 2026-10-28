import { WaifuMark } from '../design-system/icons/AnimeMarks' // wd-anime-theme-installed
import { Activity, BrainCircuit, FolderGit2, LayoutDashboard, Settings2, X } from 'lucide-react'
import type { Page } from '../types'

const navigation = [
  { id: 'overview', label: 'Ringkasan', icon: LayoutDashboard },
  { id: 'ai', label: 'Codex', icon: BrainCircuit },
  { id: 'repositories', label: 'Repositori', icon: FolderGit2 },
  { id: 'activity', label: 'Aktivitas', icon: Activity },
  { id: 'settings', label: 'Pengaturan', icon: Settings2 },
] as const

export default function Sidebar({
  page,
  onPage,
  open,
  onClose,
  username,
}: {
  page: Page
  onPage: (value: Page) => void
  open: boolean
  onClose: () => void
  username: string
}) {
  const goTo = (target: Page) => {
    onPage(target)
    onClose()
  }

  return (
    <>
      {open && <button type="button" className="mobile-backdrop" aria-label="Tutup menu" onClick={onClose} />}
      <aside className={`sidebar ${open ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <span className="logo-icon" aria-hidden="true">
            <WaifuMark width={26} height={26} />
          </span>
          <div>
            <strong>WaifuDesk</strong>
          </div>
          <button
            type="button"
            className="mobile-close icon-button"
            onClick={onClose}
            aria-label="Tutup menu"
          >
            <X size={18} />
          </button>
        </div>
        <nav className="side-nav" aria-label="Navigasi utama">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={`nav-item ${page === id ? 'active' : ''}`}
              aria-current={page === id ? 'page' : undefined}
              onClick={() => goTo(id)}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-spacer" />
        <button
          type="button"
          className="sidebar-user sidebar-account"
          onClick={() => goTo('settings')}
          title="Buka pengaturan akun"
        >
          <span className="user-avatar">{username.slice(0, 1).toUpperCase()}</span>
          <span className="user-text">
            <strong>{username}</strong>
            <small>GitHub</small>
          </span>
          <Settings2 size={15} className="user-more" aria-hidden="true" />
        </button>
      </aside>
    </>
  )
}
