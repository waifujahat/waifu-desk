import { useEffect, useRef, useState } from 'react'
import { Check, Clipboard, FolderGit2, GitBranch, RefreshCw, ScrollText } from 'lucide-react'
import { hiddenChangeCount, shortHash, type LocalGitSnapshot } from '../domain/localGit'
import {
  inspectLocalRepository,
  localGitAvailable,
  previewReleaseNotes,
  selectLocalRepository,
} from '../services/localGitService'

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function LocalGitPanel() {
  const desktop = localGitAvailable()
  const sequence = useRef(0)
  const [snapshot, setSnapshot] = useState<LocalGitSnapshot | null>(null)
  const [busy, setBusy] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(
    () => () => {
      sequence.current += 1
    },
    [],
  )

  async function load(path: string) {
    const id = ++sequence.current
    setBusy(true)
    setGenerating(false)
    setError(null)
    setNotes('')
    setSnapshot(null)
    try {
      const result = await inspectLocalRepository(path)
      if (id === sequence.current) setSnapshot(result)
    } catch (issue) {
      if (id === sequence.current) setError(describeError(issue))
    } finally {
      if (id === sequence.current) setBusy(false)
    }
  }

  async function pick() {
    try {
      const path = await selectLocalRepository()
      if (path) await load(path)
    } catch (issue) {
      setError(describeError(issue))
    }
  }

  async function generate() {
    if (!snapshot) return
    const id = sequence.current
    setGenerating(true)
    setError(null)
    setNotes('')
    setCopied(false)
    try {
      const text = await previewReleaseNotes(snapshot.path)
      if (id === sequence.current) setNotes(text)
    } catch (issue) {
      if (id === sequence.current) setError(describeError(issue))
    } finally {
      if (id === sequence.current) setGenerating(false)
    }
  }

  async function copyNotes() {
    if (!notes) return
    try {
      await navigator.clipboard.writeText(notes)
      setCopied(true)
    } catch {
      setError('Clipboard tidak tersedia. Pilih dan salin teks secara manual.')
    }
  }

  return (
    <section className="wd-local-git" aria-label="Local Git Intelligence">
      <div className="wd-local-head">
        <div>
          <div className="wd-local-eyebrow">LOCAL</div>
          <h2>
            <FolderGit2 size={19} /> Local Git Intelligence
          </h2>
          <p>Periksa Git lokal ala GitUI dan buat release notes dengan git-cliff</p>
        </div>
        <div className="wd-local-actions">
          <button
            type="button"
            className="wd-local-button"
            onClick={() => void pick()}
            disabled={!desktop || busy}
          >
            <FolderGit2 size={16} /> Pilih repository
          </button>
          {snapshot && (
            <button
              type="button"
              className="wd-local-button wd-local-secondary"
              onClick={() => void load(snapshot.path)}
              disabled={busy}
            >
              <RefreshCw size={16} /> Refresh
            </button>
          )}
        </div>
      </div>

      {!desktop && (
        <div className="wd-local-notice" role="status">
          Fitur Git lokal hanya tersedia di aplikasi Tauri Desktop. Live Demo GitHub Pages tetap bisa
          menampilkan repositori GitHub di bawah.
        </div>
      )}
      {busy && (
        <div className="wd-local-notice" role="status">
          Memeriksa repository lokal…
        </div>
      )}
      {error && (
        <div className="wd-local-error" role="alert">
          {error}
        </div>
      )}
      {snapshot && (
        <div className="wd-local-body">
          <div className="wd-local-summary">
            <div className="wd-local-repo-name">{snapshot.name}</div>
            <div className="wd-local-path" title={snapshot.path}>
              {snapshot.path}
            </div>
            <div className="wd-local-pills">
              <span>
                <GitBranch size={14} /> {snapshot.branch}
              </span>
              <span>{snapshot.total_changes} perubahan</span>
              <span>{snapshot.commits.length} commit terakhir</span>
            </div>
          </div>

          <div className="wd-local-grid">
            <div>
              <h3>File berubah</h3>
              {snapshot.files.length > 0 ? (
                <ul className="wd-local-files">
                  {snapshot.files.map((file) => (
                    <li key={file.path}>
                      <code title={file.path}>{file.path}</code>
                      <span>{file.status}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="wd-local-muted">Working tree bersih.</p>
              )}
              {hiddenChangeCount(snapshot.total_changes, snapshot.files.length) > 0 && (
                <p className="wd-local-muted">
                  +{hiddenChangeCount(snapshot.total_changes, snapshot.files.length)} file lainnya (preview
                  dibatasi).
                </p>
              )}
            </div>
            <div>
              <h3>Riwayat commit</h3>
              {snapshot.commits.length > 0 ? (
                <ol className="wd-local-commits">
                  {snapshot.commits.map((commit) => (
                    <li key={commit.hash}>
                      <code>{shortHash(commit.hash)}</code>
                      <span className="wd-local-commit-title" title={commit.summary}>
                        {commit.summary}
                      </span>
                      <small>{commit.author}</small>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="wd-local-muted">Belum ada commit.</p>
              )}
            </div>
          </div>
          <div className="wd-local-release">
            <div className="wd-local-release-heading">
              <div>
                <h3>
                  <ScrollText size={17} /> Release Notes Generator
                </h3>
                <p>Preview Markdown tanpa mengubah repository</p>
              </div>
              <button
                type="button"
                className="wd-local-button"
                disabled={generating || snapshot.commits.length === 0}
                onClick={() => void generate()}
              >
                <ScrollText size={15} /> {generating ? 'Membuat…' : 'Generate notes'}
              </button>
            </div>
            {notes && (
              <div className="wd-local-preview">
                <div className="wd-local-preview-top">
                  <b>Markdown preview</b>
                  <button
                    type="button"
                    className="wd-local-button wd-local-secondary"
                    onClick={() => void copyNotes()}
                  >
                    {copied ? <Check size={15} /> : <Clipboard size={15} />}
                    {copied ? 'Disalin' : 'Salin'}
                  </button>
                </div>
                <pre tabIndex={0}>{notes}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
