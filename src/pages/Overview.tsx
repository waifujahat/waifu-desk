import { ArrowRight, FolderGit2 } from 'lucide-react';
import type { CodexSnapshot, GitHubData, Page } from '../types';
import { compact, dateTime, groupEventsByDay, relative } from '../lib/format';
import { Chart } from '../components/Charts';
import { DataState, GitHubNotice } from '../components/DataState';
import { ExternalLink, PageHeader } from '../components/Display';
import { Panel } from '../design-system/components/Panel';
import { Button } from '../design-system/components/Button';

interface OverviewProps {
  github: GitHubData;
  githubLoading: boolean;
  githubError: string | null;
  codex: CodexSnapshot | null;
  codexLoading: boolean;
  codexError: string | null;
  onRefreshGitHub: () => void;
  onPage: (page: Page) => void;
  desktop: boolean;
}

function UsageBar({ label, used, reset }: { label: string; used: number; reset: string | null }) {
  const percent = Math.max(0, Math.min(100, used));
  return (
    <div className="wd-quota-line">
      <div className="wd-quota-head">
        <span>{label}</span>
        <strong>{Math.round(100 - percent)}% tersisa</strong>
      </div>
      <div
        className="wd-quota-track"
        role="progressbar"
        aria-label={`${label} terpakai`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(percent)}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
      {reset && <small>Reset {dateTime(reset)}</small>}
    </div>
  );
}

function CodexSummary({
  codex,
  loading,
  error,
  desktop,
  onPage,
}: {
  codex: CodexSnapshot | null;
  loading: boolean;
  error: string | null;
  desktop: boolean;
  onPage: (page: Page) => void;
}) {
  const limits = codex?.limits ?? [];
  const hourly = limits.find((limit) => limit.label === '5-hour window');
  const weekly = limits.find((limit) => limit.label === 'Weekly window');
  const connected = Boolean(codex?.connected);

  return (
    <Panel
      title="Codex"
      className="wd-summary-panel"
      action={
        <Button variant="ghost" size="sm" onClick={() => onPage('ai')}>
          Buka Codex <ArrowRight size={14} />
        </Button>
      }
    >
      {connected && codex ? (
        <>
          <div className="wd-codex-metric">
            <div>
              <span className="wd-stat-label">Token · 30 hari</span>
              <strong className="wd-stat-value">{compact(codex.totalTokens)}</strong>
            </div>
            <div className="wd-codex-secondary">
              <span>Hari ini</span>
              <strong>{compact(codex.todayTokens)}</strong>
            </div>
          </div>
          {(hourly || weekly) && (
            <div className="wd-quotas">
              {hourly && (
                <UsageBar label="Kuota 5 jam" used={hourly.usedPercent} reset={hourly.resetsAt} />
              )}
              {weekly && (
                <UsageBar
                  label="Kuota mingguan"
                  used={weekly.usedPercent}
                  reset={weekly.resetsAt}
                />
              )}
            </div>
          )}
          <p className="wd-source-note">
            Laporan lokal{codex.lastSeenAt ? ` · ${dateTime(codex.lastSeenAt)}` : ''} · bukan
            real-time
            {error ? ' · pembaruan gagal' : ''}
          </p>
        </>
      ) : (
        <DataState
          title={
            loading
              ? 'Membaca sesi Codex…'
              : error
                ? 'Data Codex gagal dimuat'
                : 'Belum ada data Codex'
          }
          detail={
            error ?? (desktop ? 'Sesi lokal belum ditemukan.' : 'Buka melalui aplikasi desktop.')
          }
        />
      )}
    </Panel>
  );
}

function GithubSummary({
  github,
  loading,
  error,
  onRetry,
  onPage,
}: {
  github: GitHubData;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  onPage: (page: Page) => void;
}) {
  const hasData = Boolean(github.profile || github.repos.length || github.events.length);
  const stars = github.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const visibleRepos = github.repos.slice(0, 3);

  return (
    <Panel
      title="GitHub"
      className="wd-summary-panel"
      action={
        <Button variant="ghost" size="sm" onClick={() => onPage('repositories')}>
          Repositori <ArrowRight size={14} />
        </Button>
      }
    >
      <GitHubNotice warnings={github.warnings} error={error} onRetry={onRetry} loading={loading} />
      {hasData ? (
        <>
          <div className="wd-github-metrics">
            {github.profile && (
              <div>
                <span>Repositori publik</span>
                <strong>{github.profile.public_repos}</strong>
              </div>
            )}
            {github.repos.length > 0 && (
              <div>
                <span>Bintang dimuat</span>
                <strong>{compact(stars)}</strong>
              </div>
            )}
            {github.events.length > 0 && (
              <div>
                <span>Event terbaru</span>
                <strong>{github.events.length}</strong>
              </div>
            )}
          </div>
          {visibleRepos.length > 0 && (
            <div className="wd-recent-repos" aria-label="Repositori terbaru">
              {visibleRepos.map((repo) => (
                <div className="wd-recent-repo" key={repo.id}>
                  <FolderGit2 size={16} aria-hidden="true" />
                  <div>
                    <ExternalLink url={repo.html_url}>{repo.name}</ExternalLink>
                    <small>{relative(repo.pushed_at || repo.updated_at)}</small>
                  </div>
                  <span>{repo.language || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : !github.warnings.length && !error ? (
        <DataState title={loading ? 'Memuat GitHub…' : 'Belum ada data GitHub'} />
      ) : null}
    </Panel>
  );
}

export default function Overview({
  github,
  githubLoading,
  githubError,
  codex,
  codexLoading,
  codexError,
  onRefreshGitHub,
  onPage,
  desktop,
}: OverviewProps) {
  return (
    <div className="wd-overview">
      <PageHeader title="Ringkasan" />
      <div className="wd-overview-grid">
        <CodexSummary
          codex={codex}
          loading={codexLoading}
          error={codexError}
          desktop={desktop}
          onPage={onPage}
        />
        <GithubSummary
          github={github}
          loading={githubLoading}
          error={githubError}
          onRetry={onRefreshGitHub}
          onPage={onPage}
        />
      </div>
      {github.events.length > 0 && (
        <Panel
          title="Aktivitas GitHub · 14 hari"
          className="wd-activity-preview"
          action={
            <Button variant="ghost" size="sm" onClick={() => onPage('activity')}>
              Lihat aktivitas <ArrowRight size={14} />
            </Button>
          }
        >
          <Chart points={groupEventsByDay(github.events)} label="event GitHub" height={150} />
        </Panel>
      )}
    </div>
  );
}
