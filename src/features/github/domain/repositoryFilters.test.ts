import { describe, expect, it } from 'vitest';
import type { GitHubRepo } from '../../../types';
import { filterRepositories, getRepositoryLanguages } from './repositoryFilters';

const repos = [
  {
    id: 1,
    name: 'waifudesk',
    description: 'Desktop developer tools',
    language: 'TypeScript',
    stargazers_count: 10,
    forks_count: 2,
    pushed_at: '2026-10-20T00:00:00Z',
    updated_at: '2026-10-20T00:00:00Z',
  },
  {
    id: 2,
    name: 'crud-dashboard',
    description: 'User management',
    language: 'JavaScript',
    stargazers_count: 5,
    forks_count: 4,
    pushed_at: '2026-10-25T00:00:00Z',
    updated_at: '2026-10-25T00:00:00Z',
  },
  {
    id: 3,
    name: 'rust-tools',
    description: 'Git utilities',
    language: 'Rust',
    stargazers_count: 20,
    forks_count: 1,
    pushed_at: '2026-10-15T00:00:00Z',
    updated_at: '2026-10-15T00:00:00Z',
  },
] as GitHubRepo[];

describe('repositoryFilters', () => {
  it('menghasilkan daftar bahasa tanpa duplikasi', () => {
    expect(getRepositoryLanguages(repos)).toEqual(['JavaScript', 'Rust', 'TypeScript']);
  });

  it('mencari repository tanpa membedakan kapitalisasi', () => {
    const result = filterRepositories(repos, {
      query: 'WAIFU',
      language: 'all',
      sort: 'recent',
    });

    expect(result.map((repo) => repo.name)).toEqual(['waifudesk']);
  });

  it('memfilter repository berdasarkan bahasa', () => {
    const result = filterRepositories(repos, {
      query: '',
      language: 'Rust',
      sort: 'recent',
    });

    expect(result.map((repo) => repo.name)).toEqual(['rust-tools']);
  });

  it('menggabungkan pencarian dan filter bahasa', () => {
    const result = filterRepositories(repos, {
      query: 'tools',
      language: 'TypeScript',
      sort: 'recent',
    });

    expect(result.map((repo) => repo.name)).toEqual(['waifudesk']);
  });

  it('mengurutkan repository berdasarkan nama', () => {
    const result = filterRepositories(repos, {
      query: '',
      language: 'all',
      sort: 'name',
    });

    expect(result.map((repo) => repo.name)).toEqual(['crud-dashboard', 'rust-tools', 'waifudesk']);
  });

  it('mengurutkan repository berdasarkan stars', () => {
    const result = filterRepositories(repos, {
      query: '',
      language: 'all',
      sort: 'stars',
    });

    expect(result.map((repo) => repo.name)).toEqual(['rust-tools', 'waifudesk', 'crud-dashboard']);
  });

  it('mengurutkan repository berdasarkan forks', () => {
    const result = filterRepositories(repos, {
      query: '',
      language: 'all',
      sort: 'forks',
    });

    expect(result.map((repo) => repo.name)).toEqual(['crud-dashboard', 'waifudesk', 'rust-tools']);
  });

  it('mengurutkan repository terbaru terlebih dahulu', () => {
    const result = filterRepositories(repos, {
      query: '',
      language: 'all',
      sort: 'recent',
    });

    expect(result.map((repo) => repo.name)).toEqual(['crud-dashboard', 'waifudesk', 'rust-tools']);
  });

  it('tidak mengubah array repository asli', () => {
    const original = [...repos];

    filterRepositories(repos, {
      query: '',
      language: 'all',
      sort: 'stars',
    });

    expect(repos).toEqual(original);
  });
});
