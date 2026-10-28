import { ArrowUpRight, AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { openTrusted } from '../lib/desktop'

interface HeaderProps {
  title: string
  description?: string
  eyebrow?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, eyebrow, actions }: HeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

interface MetricProps {
  label: string
  value: string
  detail?: string
  icon: ReactNode
  tone?: 'purple' | 'teal' | 'orange' | 'blue'
}

export function MetricCard({ label, value, detail, icon, tone = 'purple' }: MetricProps) {
  return (
    <article className="metric-card">
      <div className="metric-head">
        <span>{label}</span>
        <span className={`metric-icon ${tone}`}>{icon}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      {detail && <span className="metric-detail">{detail}</span>}
    </article>
  )
}

export function Empty({ title, detail, icon }: { title: string; detail?: string; icon?: ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon || <Inbox size={20} />}</div>
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
    </div>
  )
}

export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="alert-box" role="status">
      <AlertCircle size={16} />
      <span>{children}</span>
    </div>
  )
}

export function Loading({ text = 'Memuat…' }: { text?: string }) {
  return (
    <div className="loading-state">
      <LoaderCircle size={18} className="spinner" /> {text}
    </div>
  )
}

export function ExternalLink({
  url,
  children,
  className = '',
}: {
  url: string
  children: ReactNode
  className?: string
}) {
  return (
    <button type="button" className={`external-link ${className}`} onClick={() => void openTrusted(url)}>
      {children}
      <ArrowUpRight size={14} />
    </button>
  )
}
