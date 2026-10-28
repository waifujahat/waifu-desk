import { Archive, ArrowUpRight, FolderGit2, GitFork, Search, Star, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GitHubRepo } from '../types';
import { ExternalLink, PageHeader } from '../components/Display';
import { DataState, GitHubNotice } from '../components/DataState';
import { hasGithubFailure } from '../features/github/index';
import { compact, relative } from '../lib/format';
import { openTrusted } from '../lib/desktop';
import { Badge } from '../design-system/components/Badge';
import { Button } from '../design-system/components/Button';
import { LocalGitPanel } from '../features/local-git';

type Sort = 'recent' | 'name' | 'stars' | 'forks';

interface RepositoriesProps {
  repos: GitHubRepo[];
  loading: boolean;
  warnings: string[];
  error: string | null;
  onRetry: () => void;
}

export default function Repositories({
  repos,
  loading,
  warnings,
  error,
  onRetry,
}: RepositoriesProps) {
  const [query, setQuery] = useState('');
  const [language, setLanguage] = useState('all');
  const [sort, setSort] = useState<Sort>('recent');

  const languages = useMemo(
    () =>
      [
        ...new Set(
          repos.map((repo) => repo.language).filter((item): item is string => Boolean(item)),
        ),
      ].sort(),
    [repos],
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    const results = repos.filter((repo) => {
      const matchesText = `${repo.name} ${repo.description || ''} ${repo.language || ''}`
        .toLowerCase()
        .includes(term);
      return matchesText && (language === 'all' || repo.language === language);
    });

    return results.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name);
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count;
      if (sort === 'forks') return b.forks_count - a.forks_count;
      return (
        new Date(b.pushed_at || b.updated_at).getTime() -
        new Date(a.pushed_at || a.updated_at).getTime()
      );
    });
  }, [repos, query, language, sort]);

  const activeFilters = Boolean(query || language !== 'all' || sort !== 'recent');
  const failed = Boolean(error) || hasGithubFailure(warnings, 'Repositori');
  const emptyTitle = loading
    ? 'Memuat repositori…'
    : failed
      ? 'Repositori belum dapat dimuat'
      : activeFilters
        ? 'Tidak ada hasil'
        : 'Belum ada repository';
  const reset = () => {
    setQuery('');
    setLanguage('all');
    setSort('recent');
  };

  return (
    <>
      <PageHeader
        title="Repositori"
        actions={repos.length > 0 ? <Badge>{filtered.length} repositori</Badge> : undefined}
      />
      <LocalGitPanel />
      <GitHubNotice warnings={warnings} error={error} onRetry={onRetry} loading={loading} />
      {repos.length > 0 && (
        <div className="filter-panel">
          <div className="filter-grid">
            <label className="search-field">
              <Search size={18} />
              <input
                aria-label="Cari repository"
                placeholder="Cari repository"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
            <label className="select-wrap">
              <span>Bahasa</span>
              <select value={language} onChange={(event) => setLanguage(event.target.value)}>
                <option value="all">Semua</option>
                {languages.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="select-wrap">
              <span>Urutkan</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                <option value="recent">Terbaru</option>
                <option value="name">Nama A–Z</option>
                <option value="stars">Bintang</option>
                <option value="forks">Fork</option>
              </select>
            </label>
          </div>
          {activeFilters && (
            <Button variant="ghost" size="sm" className="reset-filters" onClick={reset}>
              <X size={14} /> Reset filter
            </Button>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="repo-cards">
          {filtered.map((repo) => (
            <article className="repo-card" key={repo.id}>
              <div className="repo-top">
                <span className="repo-symbol">
                  <FolderGit2 size={21} />
                </span>
                {(repo.archived || repo.fork) && (
                  <span className="repo-flags">
                    {repo.archived ? (
                      <>
                        <Archive size={13} /> Arsip
                      </>
                    ) : (
                      'Fork'
                    )}
                  </span>
                )}
              </div>
              <div className="repo-title">
                <ExternalLink url={repo.html_url}>{repo.name}</ExternalLink>
              </div>
              {repo.description && <p>{repo.description}</p>}
              {repo.topics?.length > 0 && (
                <div className="repo-topics">
                  {repo.topics.slice(0, 3).map((topic) => (
                    <span key={topic}>{topic}</span>
                  ))}
                </div>
              )}
              <div className="repo-bottom">
                <span className="repo-lang">{repo.language || '—'}</span>
                <span>
                  <Star size={14} /> {compact(repo.stargazers_count)}
                </span>
                <span>
                  <GitFork size={14} /> {compact(repo.forks_count)}
                </span>
                <span className="repo-date">{relative(repo.pushed_at || repo.updated_at)}</span>
                <button
                  type="button"
                  className="repo-link"
                  onClick={() => void openTrusted(repo.html_url)}
                  aria-label={`Buka ${repo.name}`}
                >
                  <ArrowUpRight size={17} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="wd-collection-empty">
          <DataState
            title={emptyTitle}
            detail={activeFilters && !failed ? 'Ubah atau reset filter.' : undefined}
          />
        </div>
      )}
    </>
  );
}
