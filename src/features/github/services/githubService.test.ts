import { describe, expect, it } from 'vitest';
import type { GitHubProfile, GitHubRepo, GitHubEvent } from '../../../types';
import { readGithubCache, syncGithub, toGithubData } from './githubService';
import type { CacheStore, Fetcher } from './githubService';

const BASE_TIME = 1_800_000_000_000;
const profile: GitHubProfile = {
  login: 'waifujahat',
  name: 'Test',
  avatar_url: 'https://github.com/avatar',
  html_url: 'https://github.com/waifujahat',
  bio: null,
  public_repos: 1,
  followers: 0,
  following: 0,
  location: null,
  created_at: '2024-01-01T00:00:00Z',
};
const repo: GitHubRepo = {
  id: 1,
  name: 'waifudesk',
  full_name: 'waifujahat/waifudesk',
  html_url: 'https://github.com/waifujahat/waifudesk',
  description: null,
  language: 'TypeScript',
  stargazers_count: 1,
  forks_count: 0,
  fork: false,
  archived: false,
  updated_at: '2026-01-01T00:00:00Z',
  pushed_at: null,
  topics: [],
};
const event: GitHubEvent = {
  id: 'e1',
  type: 'PushEvent',
  created_at: '2026-01-01T00:00:00Z',
  repo: { name: 'waifujahat/waifudesk' },
};
function makeStore(): CacheStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
  };
}
function json(data: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(data), { status, headers });
}
function responseFor(url: string): Response {
  if (url.includes('/events/')) return json([event]);
  if (url.includes('/repos?')) return json([repo]);
  return json(profile);
}

describe('GitHub sync reliability', () => {
  it('retries only the failed resource after a partial error, without losing valid data', async () => {
    const store = makeStore();
    let time = BASE_TIME;
    const calls: string[] = [];
    let failRepos = true;
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      if (url.includes('/repos?') && failRepos) return json({ message: 'Server error' }, 500);
      return responseFor(url);
    };
    const deps = { store, fetcher, now: () => time };
    const first = await syncGithub('waifujahat', false, new AbortController().signal, deps);
    expect(first.data.profile?.login).toBe('waifujahat');
    expect(first.data.events).toHaveLength(1);
    expect(first.data.repos).toHaveLength(0);
    expect(first.data.warnings.some((w) => w.startsWith('Repositori:'))).toBe(true);
    expect(readGithubCache(store, 'waifujahat').repos).toBeUndefined();

    // Under the 5-minute cooldown, no network requests are made.
    const paused = await syncGithub('waifujahat', false, new AbortController().signal, deps);
    expect(paused.data.warnings.some((w) => w.startsWith('Repositori:'))).toBe(true);
    expect(calls).toHaveLength(3);

    failRepos = false;
    time += 300_001;
    const second = await syncGithub('waifujahat', false, new AbortController().signal, deps);
    expect(second.data.repos[0].name).toBe('waifudesk');
    expect(second.data.events).toHaveLength(1);
    expect(second.data.profile?.login).toBe('waifujahat');
    expect(second.data.warnings).toEqual([]);
    expect(calls).toHaveLength(4); // retry only repos, not profile/events
  });

  it('keeps a previously valid resource when forced refresh fails', async () => {
    const store = makeStore();
    let time = BASE_TIME;
    let breakRepos = false;
    const fetcher: Fetcher = async (url) => {
      if (url.includes('/repos?') && breakRepos) return json({}, 500);
      return responseFor(url);
    };
    const deps = { store, fetcher, now: () => time };
    const before = await syncGithub('waifujahat', false, new AbortController().signal, deps);
    expect(before.data.repos).toHaveLength(1);
    const repoTimestamp = readGithubCache(store, 'waifujahat').repos?.fetchedAt;
    time += 300_001;
    breakRepos = true;
    const after = await syncGithub('waifujahat', true, new AbortController().signal, deps);
    expect(after.data.repos).toEqual([repo]);
    expect(after.data.warnings.some((w) => w.startsWith('Repositori:'))).toBe(true);
    expect(readGithubCache(store, 'waifujahat').repos?.fetchedAt).toBe(repoTimestamp);
  });

  it('rejects malformed GitHub JSON before it enters the cache', async () => {
    const store = makeStore();
    const fetcher: Fetcher = async (url) =>
      url.includes('/repos?') ? json([{ id: 'not-a-number' }]) : responseFor(url);
    const result = await syncGithub('waifujahat', false, new AbortController().signal, {
      store,
      fetcher,
      now: () => BASE_TIME,
    });
    expect(result.data.repos).toEqual([]);
    expect(result.data.warnings.join(' ')).toContain('Format respons GitHub');
    expect(readGithubCache(store, 'waifujahat').repos).toBeUndefined();
  });

  it('does not persist an aborted response or continue requesting other sections', async () => {
    const store = makeStore();
    const controller = new AbortController();
    let fetches = 0;
    const fetcher: Fetcher = async (url) => {
      fetches++;
      controller.abort();
      return responseFor(url);
    };
    await syncGithub('waifujahat', false, controller.signal, {
      store,
      fetcher,
      now: () => BASE_TIME,
    });
    expect(fetches).toBe(1);
    expect(toGithubData(readGithubCache(store, 'waifujahat')).profile).toBeNull();
  });

  it('recognizes legacy cache warnings and does not mark failed data as fresh', () => {
    const store = makeStore();
    store.setItem(
      'wd-github-waifujahat',
      JSON.stringify({
        profile,
        repos: [],
        events: [event],
        fetchedAt: BASE_TIME,
        warnings: ['Repositori: HTTP 500'],
      }),
    );
    const cache = readGithubCache(store, 'waifujahat');
    expect(cache.profile?.value.login).toBe('waifujahat');
    expect(cache.events?.value).toEqual([event]);
    expect(cache.repos).toBeUndefined();
  });

  it('respects a rate-limit reset timestamp even after a successful response', async () => {
    const store = makeStore();
    let requests = 0;
    const fetcher: Fetcher = async (url) => {
      requests++;
      return requests === 1
        ? json(profile, 200, {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(BASE_TIME / 1000 + 900),
          })
        : responseFor(url);
    };
    const result = await syncGithub('waifujahat', false, new AbortController().signal, {
      store,
      fetcher,
      now: () => BASE_TIME,
    });
    expect(result.data.profile?.login).toBe('waifujahat');
    expect(result.data.warnings).toHaveLength(2);
    expect(requests).toBe(1);
  });
});
