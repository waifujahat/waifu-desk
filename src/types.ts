export type Page = 'overview' | 'ai' | 'repositories' | 'activity' | 'settings';
export type Theme = 'dark' | 'light';
export type DatePoint = { day: string; count: number };
export type GitHubProfile = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  bio: string | null;
  public_repos: number;
  followers: number;
  following: number;
  location: string | null;
  created_at: string;
};
export type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  fork: boolean;
  archived: boolean;
  updated_at: string;
  pushed_at: string | null;
  topics: string[];
};
export type GitHubEvent = {
  id: string;
  type: string;
  created_at: string;
  repo: { name: string };
  payload?: { action?: string; ref_type?: string; size?: number };
};
export type GitHubData = {
  profile: GitHubProfile | null;
  repos: GitHubRepo[];
  events: GitHubEvent[];
  fetchedAt: number;
  warnings: string[];
};
export type DailyUsage = { day: string; tokens: number };
export type ModelUsage = {
  model: string;
  sessions: number;
  tokens?: number;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
};
export type SessionUsage = {
  id: string;
  project: string;
  model: string;
  lastSeenAt: string;
  tokens: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
};
export type ReportedRateLimit = {
  label: string;
  usedPercent: number;
  resetsAt: string | null;
  observedAt: string;
};
export type CodexSnapshot = {
  connected: boolean;
  sourceLabel: string;
  sessionsScanned: number;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  totalTokens: number;
  todayTokens: number;
  daily: DailyUsage[];
  models: ModelUsage[];
  heatmap?: DailyUsage[];
  sessions?: SessionUsage[];
  lastSeenAt: string | null;
  limits: ReportedRateLimit[];
  note: string;
};
