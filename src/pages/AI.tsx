import { BrainCircuit, Clock3, Layers, PanelTopOpen, RefreshCw, Zap } from 'lucide-react';
import type { CodexSnapshot, ReportedRateLimit } from '../types';
import { Bars, Ring } from '../components/Charts';
import { UsageHeatmap } from '../features/codex/index';
import { Panel } from '../design-system/components/Panel';
import { Alert, MetricCard, PageHeader } from '../components/Display';
import { DataState } from '../components/DataState';
import { compact, dateTime, integer } from '../lib/format';
import { toggleMini } from '../lib/desktop';
import { Button } from '../design-system/components/Button';

interface AIProps {
  snapshot: CodexSnapshot | null;
  desktop: boolean;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

function LimitPanel({ item, title }: { item: ReportedRateLimit; title: string }) {
  return (
    <Panel title={title}>
      <div className="rate-metric">
        <Ring percent={item.usedPercent} label="tersisa" caption="laporan lokal" />
        <div className="rate-details">
          <span>Terpakai</span>
          <strong>{Math.round(item.usedPercent)}%</strong>
          <span>Reset</span>
          <strong className="detail-sm">{dateTime(item.resetsAt)}</strong>
          <span>Dicatat</span>
          <strong className="detail-sm">{dateTime(item.observedAt)}</strong>
        </div>
      </div>
    </Panel>
  );
}

export default function AI({ snapshot, desktop, loading, error, onRefresh }: AIProps) {
  const connected = Boolean(snapshot?.connected);
  const limits = snapshot?.limits ?? [];
  const primary = limits.find((item) => item.label === '5-hour window');
  const weekly = limits.find((item) => item.label === 'Weekly window');
  const breakdownTotal = (snapshot?.inputTokens ?? 0) + (snapshot?.outputTokens ?? 0);

  return (
    <>
      <PageHeader
        title="Codex"
        actions={
          <>
            <Button variant="secondary" onClick={onRefresh} disabled={!desktop} busy={loading}>
              <RefreshCw size={16} className={loading ? 'spinner' : ''} /> Perbarui
            </Button>
            {desktop && (
              <Button variant="secondary" onClick={() => void toggleMini()}>
                <PanelTopOpen size={16} /> Mini widget
              </Button>
            )}
          </>
        }
      />
      {error && connected && <Alert>{error}</Alert>}
      {!connected ? (
        <Panel title="Data lokal">
          <DataState
            title={
              loading
                ? 'Membaca sesi Codex…'
                : error
                  ? 'Gagal membaca data Codex'
                  : 'Belum ada data Codex'
            }
            detail={
              error ?? (desktop ? 'Sesi lokal belum ditemukan.' : 'Buka melalui aplikasi desktop.')
            }
          />
        </Panel>
      ) : (
        <>
          <div className="metrics-grid">
            <MetricCard
              label="Token · 30 hari"
              value={compact(snapshot?.totalTokens ?? 0)}
              icon={<Zap size={19} />}
            />
            <MetricCard
              label="Token hari ini"
              value={compact(snapshot?.todayTokens ?? 0)}
              icon={<Zap size={19} />}
              tone="teal"
            />
            <MetricCard
              label="Sesi dipindai"
              value={integer(snapshot?.sessionsScanned ?? 0)}
              icon={<Layers size={19} />}
              tone="blue"
            />
            <MetricCard
              label="Cache input"
              value={compact(snapshot?.cachedInputTokens ?? 0)}
              icon={<Clock3 size={19} />}
              tone="orange"
            />
          </div>

          {limits.length > 0 ? (
            <div className="content-grid half ai-main-grid">
              {primary && <LimitPanel item={primary} title="Batas 5 jam" />}
              {weekly && <LimitPanel item={weekly} title="Batas mingguan" />}
            </div>
          ) : (
            <p className="small-note standalone-note">
              Batas pemakaian belum dilaporkan oleh sesi lokal.
            </p>
          )}

          <div className="content-grid two-thirds">
            <Panel title="Token harian">
              {snapshot?.daily.length ? (
                <Bars points={snapshot.daily} />
              ) : (
                <DataState title="Belum ada penggunaan" />
              )}
            </Panel>
            <Panel title="Rincian token">
              <div className="usage-breakdown">
                <div className="breakdown-line">
                  <span>Input</span>
                  <strong>{integer(snapshot?.inputTokens ?? 0)}</strong>
                </div>
                <div className="breakdown-progress">
                  <span
                    style={{
                      width: `${breakdownTotal ? ((snapshot?.inputTokens ?? 0) / breakdownTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
                <div className="breakdown-line">
                  <span>Output</span>
                  <strong>{integer(snapshot?.outputTokens ?? 0)}</strong>
                </div>
                <div className="breakdown-progress teal">
                  <span
                    style={{
                      width: `${breakdownTotal ? ((snapshot?.outputTokens ?? 0) / breakdownTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </Panel>
          </div>

          {snapshot?.heatmap?.some((day) => day.tokens > 0) && (
            <Panel title="Aktivitas 30 hari">
              <UsageHeatmap days={snapshot.heatmap} />
            </Panel>
          )}

          {snapshot?.models.length ? (
            <Panel title="Pemakaian per model">
              <div className="model-list">
                {snapshot.models.map((model) => (
                  <div className="model-row" key={model.model}>
                    <span className="model-logo">
                      <BrainCircuit size={18} />
                    </span>
                    <strong>{model.model}</strong>
                    <span className="wd-model-numbers">
                      {typeof model.tokens === 'number' && <b>{compact(model.tokens)} token</b>}
                      <small>{model.sessions} sesi</small>
                    </span>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}

          {snapshot?.sessions?.length ? (
            <Panel title="Sesi terbaru">
              <div className="wd-session-scroll">
                <table className="wd-session-table">
                  <thead>
                    <tr>
                      <th scope="col">Terakhir</th>
                      <th scope="col">Proyek</th>
                      <th scope="col">Model</th>
                      <th scope="col">Token</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{dateTime(session.lastSeenAt)}</td>
                        <td title={session.project}>{session.project}</td>
                        <td title={session.model}>{session.model}</td>
                        <td>{compact(session.tokens)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="wd-privacy-line">
                Hanya statistik token dan nama folder proyek yang ditampilkan. Isi percakapan tidak
                dikirim.
              </p>
            </Panel>
          ) : null}
          <p className="small-note standalone-note">
            Data lokal · 30 hari terakhir. Kuota dari laporan terakhir, bukan real-time; biaya belum
            dihitung.
          </p>
        </>
      )}
    </>
  );
}
