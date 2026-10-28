import { GitCommitHorizontal } from 'lucide-react';
import type { GitHubEvent } from '../types';
import { Chart } from '../components/Charts';
import { Panel } from '../design-system/components/Panel';
import { ExternalLink, PageHeader } from '../components/Display';
import { DataState, GitHubNotice } from '../components/DataState';
import { hasGithubFailure } from '../features/github/index';
import { groupEventsByDay, humanEvent, relative } from '../lib/format';
import { Badge } from '../design-system/components/Badge';

interface ActivityProps {
  events: GitHubEvent[];
  loading: boolean;
  warnings: string[];
  error: string | null;
  onRetry: () => void;
}

export default function Activity({ events, loading, warnings, error, onRetry }: ActivityProps) {
  const categories = Object.entries(
    events.reduce<Record<string, number>>((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const failed = Boolean(error) || hasGithubFailure(warnings, 'Aktivitas');
  const emptyTitle = loading
    ? 'Memuat aktivitas…'
    : failed
      ? 'Aktivitas belum dapat dimuat'
      : 'Belum ada aktivitas';

  return (
    <>
      <PageHeader
        title="Aktivitas"
        actions={events.length > 0 ? <Badge>{events.length} event publik</Badge> : undefined}
      />
      <GitHubNotice warnings={warnings} error={error} onRetry={onRetry} loading={loading} />
      {events.length === 0 ? (
        <Panel title="GitHub">
          <DataState title={emptyTitle} />
        </Panel>
      ) : (
        <>
          <Panel title="14 hari terakhir">
            <Chart points={groupEventsByDay(events)} height={190} />
          </Panel>
          <div className="content-grid two-thirds activity-layout">
            <Panel title="Riwayat">
              <div className="event-stream">
                {events.map((event) => (
                  <div className="event-row" key={event.id}>
                    <span className="event-timeline-icon">
                      <GitCommitHorizontal size={17} />
                    </span>
                    <div className="event-body">
                      <strong>{humanEvent(event.type)}</strong>
                      <p>
                        <ExternalLink url={`https://github.com/${event.repo.name}`}>
                          {event.repo.name}
                        </ExternalLink>
                      </p>
                      <small>{relative(event.created_at)}</small>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
            <Panel title="Jenis aktivitas">
              <div className="event-breakdown">
                {categories.slice(0, 8).map(([type, count], index) => (
                  <div className="category-row" key={type}>
                    <div>
                      <span className={`category-dot c-${index % 4}`} />
                      <span>{humanEvent(type)}</span>
                      <strong>{count}</strong>
                    </div>
                    <div className="category-track">
                      <span style={{ width: `${(count / events.length) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
