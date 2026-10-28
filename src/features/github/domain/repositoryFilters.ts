import type { GitHubRepo } from '../../../types';

export type RepositorySort = 'recent' | 'name' | 'stars' | 'forks';

export interface RepositoryFilters {
  query: string;
  language: string;
  sort: RepositorySort;
}

export function getRepositoryLanguages(repos: GitHubRepo[]): string[] {
  return [
    ...new Set(repos.map((repo) => repo.language).filter((lang): lang is string => Boolean(lang))),
  ].sort();
}

export function filterRepositories(repos: GitHubRepo[], filters: RepositoryFilters): GitHubRepo[] {
  const query = filters.query.trim().toLowerCase();

  const results = repos.filter((repo) => {
    const searchable =
      `${repo.name} ${repo.description || ''} ${repo.language || ''}`.toLowerCase();

    return (
      searchable.includes(query) &&
      (filters.language === 'all' || repo.language === filters.language)
    );
  });

  return results.sort((a, b) => {
    switch (filters.sort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'stars':
        return b.stargazers_count - a.stargazers_count;
      case 'forks':
        return b.forks_count - a.forks_count;
      default:
        return (
          new Date(b.pushed_at || b.updated_at).getTime() -
          new Date(a.pushed_at || a.updated_at).getTime()
        );
    }
  });
}
