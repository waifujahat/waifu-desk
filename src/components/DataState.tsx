import type { ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../design-system/components/Button';
import { getGithubNotice } from '../features/github/index';

/** Small, accessible status for the absence of data (not a fake zero). */
export function DataState({
  title,
  detail,
  action,
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
}) {
  return (
    <div className="wd-data-state" role="status">
      <strong>{title}</strong>
      {detail && <p>{detail}</p>}
      {action && <div className="wd-data-state-action">{action}</div>}
    </div>
  );
}

/** Consolidates per-endpoint GitHub warnings into one actionable notice. */
export function GitHubNotice({
  warnings,
  error,
  onRetry,
  loading = false,
}: {
  warnings: string[];
  error: string | null;
  onRetry: () => void;
  loading?: boolean;
}) {
  const notice = getGithubNotice(warnings, error);
  if (!notice) return null;

  return (
    <div className="wd-github-notice" role="status">
      <AlertCircle size={17} aria-hidden="true" />
      <div className="wd-github-notice-copy">
        <strong>{notice.title}</strong>
        <p>{notice.description}</p>
      </div>
      <Button variant="ghost" size="sm" busy={loading} onClick={onRetry}>
        <RefreshCw size={14} /> Coba lagi
      </Button>
    </div>
  );
}
