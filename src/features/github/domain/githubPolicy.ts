/** Request pacing for GitHub's unauthenticated REST API. */
export const GITHUB_CACHE_AGE_MS = 15 * 60_000;
export const GITHUB_MIN_RETRY_MS = 5 * 60_000;

export function githubRetryAt(headers: Headers, status: number, now: number): number | null {
  const remaining = headers.get('x-ratelimit-remaining');
  const resetSeconds = Number(headers.get('x-ratelimit-reset'));
  const retryAfter = Number(headers.get('retry-after'));

  // When the primary hourly budget is exhausted, respect the reset clock.
  if (remaining === '0' && Number.isFinite(resetSeconds) && resetSeconds > 0) {
    return Math.max(now + GITHUB_MIN_RETRY_MS, resetSeconds * 1000 + 1_000);
  }
  if (status !== 403 && status !== 429) return null;
  // 403/429 without headers can mean secondary throttling. Wait at least a minute.
  if (headers.has('retry-after') && Number.isFinite(retryAfter) && retryAfter >= 0) {
    return now + Math.max(GITHUB_MIN_RETRY_MS, retryAfter * 1000);
  }
  return now + GITHUB_MIN_RETRY_MS;
}

export function githubCanRequest(
  now: number,
  lastAttempt: number,
  blockedUntil: number,
  force: boolean,
  cacheTimestamp: number,
): boolean {
  if (now < blockedUntil) return false;
  if (now - lastAttempt < GITHUB_MIN_RETRY_MS) return false;
  return force || !cacheTimestamp || now - cacheTimestamp >= GITHUB_CACHE_AGE_MS;
}

export function rateLimitMessage(blockedUntil: number) {
  return `GitHub API membatasi permintaan. Coba setelah ${new Date(blockedUntil).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}.`;
}
