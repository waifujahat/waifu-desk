import { describe, expect, it } from 'vitest';
import { getGithubNotice, hasGithubFailure } from './githubStatus';

describe('GitHub state helpers', () => {
  it('merges repeated API rate limits into one notice', () => {
    const warnings = [
      'Profil: GitHub API membatasi permintaan. Coba lagi nanti.',
      'Repositori: GitHub API membatasi permintaan. Coba lagi nanti.',
      'Aktivitas: GitHub API membatasi permintaan. Coba lagi nanti.',
    ];
    const notice = getGithubNotice(warnings, warnings.join(' · '));
    expect(notice?.title).toBe('Akses GitHub sedang dibatasi');
    expect(notice?.description).not.toContain('Profil:');
  });

  it('detects errors for a specific endpoint only', () => {
    const warnings = ['Aktivitas: Gagal memuat'];
    expect(hasGithubFailure(warnings, 'Aktivitas')).toBe(true);
    expect(hasGithubFailure(warnings, 'Repositori')).toBe(false);
  });

  it('does not show a warning when all requests succeed', () => {
    expect(getGithubNotice([], null)).toBeNull();
  });

  it('distinguishes unknown failures from rate limits', () => {
    expect(getGithubNotice(['Profil: Server tidak merespons'], null)?.title).toBe(
      'Sebagian data GitHub gagal dimuat',
    );
  });
});
