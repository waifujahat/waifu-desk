import { describe, expect, it } from 'vitest'
import { GITHUB_MIN_RETRY_MS, githubCanRequest, githubRetryAt } from './githubPolicy'

describe('GitHub rate limit & cache policy', () => {
  const now = 1_800_000_000_000

  it('respects the primary reset timestamp even after an HTTP 200', () => {
    const headers = new Headers({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(now / 1000 + 900),
    })
    expect(githubRetryAt(headers, 200, now)).toBe(now + 901_000)
  })
  it('uses the minimum cooldown when a reset is too soon', () => {
    const headers = new Headers({
      'x-ratelimit-remaining': '0',
      'x-ratelimit-reset': String(now / 1000 + 120),
    })
    expect(githubRetryAt(headers, 403, now)).toBe(now + GITHUB_MIN_RETRY_MS)
  })
  it('respects Retry-After for secondary limits', () => {
    expect(githubRetryAt(new Headers({ 'retry-after': '120' }), 429, now)).toBe(now + GITHUB_MIN_RETRY_MS)
    expect(githubRetryAt(new Headers(), 403, now)).toBe(now + GITHUB_MIN_RETRY_MS)
  })
  it('does not treat an ordinary 404 as a rate limit', () => {
    expect(githubRetryAt(new Headers(), 404, now)).toBeNull()
  })
  it('uses a fresh cache even when refresh was automatic', () => {
    expect(githubCanRequest(now, 0, 0, false, now - 30_000)).toBe(false)
    expect(githubCanRequest(now, 0, 0, true, now - 30_000)).toBe(true)
  })
  it('never retries during a cooldown or rapid manual refresh', () => {
    expect(githubCanRequest(now, 0, now + 10_000, true, 0)).toBe(false)
    expect(githubCanRequest(now, now - 1_000, 0, true, 0)).toBe(false)
  })
})
