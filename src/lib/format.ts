export function compact(value: number): string {
  return new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  );
}
export function integer(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value);
}
export function prettyDate(date: string | null | undefined): string {
  if (!date) return 'Tidak tersedia';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Tidak tersedia'
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(
        parsed,
      );
}
export function dateTime(date: string | null | undefined): string {
  if (!date) return 'Belum tersedia';
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime())
    ? 'Belum tersedia'
    : new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(parsed);
}
export function relative(date: string | null | undefined): string {
  if (!date) return 'Belum ada data';
  const ms = Date.now() - new Date(date).getTime();
  if (!Number.isFinite(ms)) return 'Tidak diketahui';
  if (ms < 60000) return 'Baru saja';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} menit lalu`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} jam lalu`;
  return `${Math.floor(ms / 86400000)} hari lalu`;
}
export function humanEvent(type: string): string {
  const named: Record<string, string> = {
    PushEvent: 'Push commit',
    CreateEvent: 'Membuat branch / tag',
    DeleteEvent: 'Menghapus branch / tag',
    WatchEvent: 'Memberikan bintang',
    ForkEvent: 'Fork repositori',
    PullRequestEvent: 'Pull request',
    IssuesEvent: 'Issue',
    IssueCommentEvent: 'Komentar issue',
    ReleaseEvent: 'Merilis versi',
    PullRequestReviewEvent: 'Code review',
    PublicEvent: 'Mempublikasikan repo',
  };
  return named[type] ?? type.replace(/Event$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}
export function groupEventsByDay(
  events: { created_at: string }[],
  numberOfDays = 14,
): { day: string; count: number }[] {
  const now = new Date();
  const result = [];
  for (let i = numberOfDays - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const key = [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
    const count = events.filter((event) => event.created_at?.slice(0, 10) === key).length;
    result.push({ day: key, count });
  }
  return result;
}
export function githubLink(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname === 'github.com' ? url.href : null;
  } catch {
    return null;
  }
}
