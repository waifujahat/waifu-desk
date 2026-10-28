/**
 * GitHub transport and resource-level persistence.
 * No React dependency: request behavior can be tested with a mocked Fetch API.
 */
import type { GitHubData, GitHubEvent, GitHubProfile, GitHubRepo } from '../../../types'
import {
  GITHUB_CACHE_AGE_MS,
  githubCanRequest,
  githubRetryAt,
  rateLimitMessage,
} from '../domain/githubPolicy'

const BASE_URL = 'https://api.github.com'
const CACHE_PREFIX = 'wd-github-v2-'
const LEGACY_PREFIXES = ['wd-github-', 'dc-github-']
const BLOCKED_KEY = 'wd-github-blocked-until'
const ATTEMPT_PREFIX = 'wd-github-last-request-'

export type Section = 'profile' | 'repos' | 'events'
type Resource<T> = { value: T; fetchedAt: number }
export interface GitHubCache {
  version: 2
  profile?: Resource<GitHubProfile>
  repos?: Resource<GitHubRepo[]>
  events?: Resource<GitHubEvent[]>
}

/** Only the storage capabilities needed here, to allow simple in-memory tests. */
export type CacheStore = Pick<Storage, 'getItem' | 'setItem'>
export type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

export interface GitHubDependencies {
  store: CacheStore
  fetcher: Fetcher
  now?: () => number
}

const sectionNames: Record<Section, string> = {
  profile: 'Profil',
  repos: 'Repositori',
  events: 'Aktivitas',
}
const sections: Section[] = ['profile', 'repos', 'events']

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
function isString(value: unknown): value is string {
  return typeof value === 'string'
}
function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}
function isOptionalString(value: unknown): boolean {
  return value == null || isString(value)
}
function validProfile(value: unknown): value is GitHubProfile {
  return (
    isObject(value) &&
    isString(value.login) &&
    isString(value.html_url) &&
    isString(value.avatar_url) &&
    isNumber(value.public_repos) &&
    isNumber(value.followers) &&
    isNumber(value.following) &&
    isString(value.created_at) &&
    isOptionalString(value.name) &&
    isOptionalString(value.bio) &&
    isOptionalString(value.location)
  )
}
function validRepo(value: unknown): value is GitHubRepo {
  return (
    isObject(value) &&
    isNumber(value.id) &&
    isString(value.name) &&
    isString(value.full_name) &&
    isString(value.html_url) &&
    isNumber(value.stargazers_count) &&
    isNumber(value.forks_count) &&
    isString(value.updated_at) &&
    isOptionalString(value.description) &&
    isOptionalString(value.language) &&
    isOptionalString(value.pushed_at) &&
    typeof value.fork === 'boolean' &&
    typeof value.archived === 'boolean' &&
    Array.isArray(value.topics) &&
    value.topics.every(isString)
  )
}
function validEvent(value: unknown): value is GitHubEvent {
  return (
    isObject(value) &&
    isString(value.id) &&
    isString(value.type) &&
    isString(value.created_at) &&
    isObject(value.repo) &&
    isString(value.repo.name)
  )
}
function validSection(section: Section, value: unknown): boolean {
  switch (section) {
    case 'profile':
      return validProfile(value)
    case 'repos':
      return Array.isArray(value) && value.every(validRepo)
    case 'events':
      return Array.isArray(value) && value.every(validEvent)
  }
}
function validResource(section: Section, value: unknown): value is Resource<unknown> {
  return (
    isObject(value) && isNumber(value.fetchedAt) && value.fetchedAt > 0 && validSection(section, value.value)
  )
}
function numberFromStorage(store: CacheStore, key: string): number {
  try {
    return Number(store.getItem(key)) || 0
  } catch {
    return 0
  }
}
function saveNumber(store: CacheStore, key: string, value: number) {
  try {
    store.setItem(key, String(value))
  } catch {
    /* Persistence is optional. */
  }
}
function cacheKey(username: string) {
  return CACHE_PREFIX + username.toLowerCase()
}

export function readGithubCache(store: CacheStore, username: string): GitHubCache {
  const empty: GitHubCache = { version: 2 }
  try {
    const raw = store.getItem(cacheKey(username))
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (isObject(parsed) && parsed.version === 2) {
        // Check every section rather than trusting possibly corrupted localStorage.
        return {
          version: 2,
          ...(validResource('profile', parsed.profile)
            ? { profile: parsed.profile as Resource<GitHubProfile> }
            : {}),
          ...(validResource('repos', parsed.repos) ? { repos: parsed.repos as Resource<GitHubRepo[]> } : {}),
          ...(validResource('events', parsed.events)
            ? { events: parsed.events as Resource<GitHubEvent[]> }
            : {}),
        }
      }
    }
    // Old snapshots had ONE timestamp; failed sections must not inherit freshness.
    for (const prefix of LEGACY_PREFIXES) {
      const legacy = store.getItem(prefix + username.toLowerCase())
      if (!legacy) continue
      const parsed: unknown = JSON.parse(legacy)
      if (!isObject(parsed) || !isNumber(parsed.fetchedAt) || parsed.fetchedAt <= 0) continue
      const warnings: string[] = Array.isArray(parsed.warnings) ? parsed.warnings.filter(isString) : []
      const okay = (section: Section) => !warnings.some((w) => w.startsWith(`${sectionNames[section]}:`))
      return {
        version: 2,
        ...(okay('profile') && validProfile(parsed.profile)
          ? { profile: { value: parsed.profile, fetchedAt: parsed.fetchedAt } }
          : {}),
        ...(okay('repos') && validSection('repos', parsed.repos)
          ? { repos: { value: parsed.repos as GitHubRepo[], fetchedAt: parsed.fetchedAt } }
          : {}),
        ...(okay('events') && validSection('events', parsed.events)
          ? { events: { value: parsed.events as GitHubEvent[], fetchedAt: parsed.fetchedAt } }
          : {}),
      }
    }
  } catch {
    /* Corrupted or unavailable cache is treated as empty. */
  }
  return empty
}

function writeGithubCache(store: CacheStore, username: string, cache: GitHubCache) {
  try {
    store.setItem(cacheKey(username), JSON.stringify(cache))
  } catch {
    /* Refresh works without persistent storage. */
  }
}

export function toGithubData(cache: GitHubCache, warnings: string[] = []): GitHubData {
  return {
    profile: cache.profile?.value ?? null,
    repos: cache.repos?.value ?? [],
    events: cache.events?.value ?? [],
    fetchedAt: Math.max(
      cache.profile?.fetchedAt ?? 0,
      cache.repos?.fetchedAt ?? 0,
      cache.events?.fetchedAt ?? 0,
    ),
    warnings,
  }
}

export class GitHubHttpError extends Error {
  constructor(
    message: string,
    readonly cooldownUntil: number | null = null,
  ) {
    super(message)
  }
}

function endpoint(username: string, section: Section): string {
  const encoded = encodeURIComponent(username)
  switch (section) {
    case 'profile':
      return `/users/${encoded}`
    case 'repos':
      return `/users/${encoded}/repos?type=owner&sort=pushed&direction=desc&per_page=100`
    case 'events':
      return `/users/${encoded}/events/public?per_page=100`
  }
}

async function fetchSection(
  section: Section,
  username: string,
  dependencies: GitHubDependencies,
  signal: AbortSignal,
): Promise<{ value: unknown; cooldown: number | null }> {
  const response = await dependencies.fetcher(`${BASE_URL}${endpoint(username, section)}`, {
    signal,
    headers: { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
  })
  const cooldown = githubRetryAt(response.headers, response.status, (dependencies.now ?? Date.now)())
  if (!response.ok) {
    if (response.status === 404) throw new GitHubHttpError('Akun atau data tidak ditemukan.')
    if (response.status === 403 || response.status === 429) {
      throw new GitHubHttpError(rateLimitMessage(cooldown ?? Date.now() + 300_000), cooldown)
    }
    throw new GitHubHttpError(`GitHub API mengembalikan HTTP ${response.status}.`)
  }
  const body: unknown = await response.json()
  if (!validSection(section, body)) throw new Error('Format respons GitHub tidak sesuai.')
  return { value: body, cooldown }
}

export interface SyncResult {
  data: GitHubData
  error: string | null
}

/**
 * Fetch only stale sections. A successful profile request never makes failed
 * repositories or events look fresh. Previously valid sections survive errors.
 */
export async function syncGithub(
  username: string,
  force: boolean,
  signal: AbortSignal,
  dependencies: GitHubDependencies,
): Promise<SyncResult> {
  const { store } = dependencies
  const now = dependencies.now ?? Date.now
  const cache = readGithubCache(store, username)
  const needed = sections.filter(
    (section) => force || !cache[section] || now() - cache[section]!.fetchedAt >= GITHUB_CACHE_AGE_MS,
  )
  if (!needed.length) return { data: toGithubData(cache), error: null }

  const blockedUntil = numberFromStorage(store, BLOCKED_KEY)
  const lastAttemptKey = ATTEMPT_PREFIX + username.toLowerCase()
  const lastAttempt = numberFromStorage(store, lastAttemptKey)
  if (!githubCanRequest(now(), lastAttempt, blockedUntil, force, 0)) {
    const blocked = now() < blockedUntil
    const message = blocked
      ? rateLimitMessage(blockedUntil)
      : 'Pembaruan dijeda sementara untuk menghindari batas permintaan GitHub.'
    const warnings = needed.map((section) => `${sectionNames[section]}: ${message}`)
    return { data: toGithubData(cache, warnings), error: message }
  }

  saveNumber(store, lastAttemptKey, now())
  const warnings: string[] = []
  let successCount = 0
  for (const section of needed) {
    if (signal.aborted) break
    const blocked = numberFromStorage(store, BLOCKED_KEY)
    if (blocked > now()) {
      warnings.push(`${sectionNames[section]}: ${rateLimitMessage(blocked)}`)
      continue
    }
    try {
      const response = await fetchSection(section, username, dependencies, signal)
      if (signal.aborted) break
      const timestamp = now()
      if (section === 'profile')
        cache.profile = { value: response.value as GitHubProfile, fetchedAt: timestamp }
      if (section === 'repos') cache.repos = { value: response.value as GitHubRepo[], fetchedAt: timestamp }
      if (section === 'events')
        cache.events = { value: response.value as GitHubEvent[], fetchedAt: timestamp }
      successCount++
      // Respect remaining=0 even when the last response was HTTP 200.
      if (response.cooldown) saveNumber(store, BLOCKED_KEY, response.cooldown)
      writeGithubCache(store, username, cache)
    } catch (caught) {
      if (signal.aborted || (caught instanceof Error && caught.name === 'AbortError')) break
      warnings.push(
        `${sectionNames[section]}: ${caught instanceof Error ? caught.message : 'Gagal memuat data.'}`,
      )
      if (caught instanceof GitHubHttpError && caught.cooldownUntil) {
        saveNumber(store, BLOCKED_KEY, caught.cooldownUntil)
      }
    }
  }
  // Caller also checks signal before applying React state.
  const data = toGithubData(cache, warnings)
  return { data, error: !successCount && warnings.length ? warnings.join(' · ') : null }
}
