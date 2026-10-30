import {
  filterRepositories,
  getRepositoryLanguages,
  type RepositorySort,
} from '../features/github';
import { Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { GitHubRepo } from '../types';
import { PageHeader } from '../components/Display';
import { DataState, GitHubNotice } from '../components/DataState';
import { hasGithubFailure } from '../features/github/index';
import { RepositoryCard } from '../features/github/components/RepositoryCard';
import { Badge } from '../design-system/components/Badge';
import { Button } from '../design-system/components/Button';
import { LocalGitPanel } from '../features/local-git';

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
  const [sort, setSort] = useState<RepositorySort>('recent');

  const languages = useMemo(() => getRepositoryLanguages(repos), [repos]);

  const filtered = useMemo(
    () => filterRepositories(repos, { query, language, sort }),
    [repos, query, language, sort],
  );

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
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as RepositorySort)}
              >
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
            <RepositoryCard key={repo.id} repo={repo} />
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
