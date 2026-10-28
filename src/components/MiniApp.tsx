import { useEffect } from 'react';
import { BrainCircuit, RefreshCw } from 'lucide-react';

import { Ring } from './Charts';
import { useCodex } from '../features/codex';
import { readAnimePalette } from '../design-system/animeTheme';
import { compact, dateTime } from '../lib/format';
import { toggleMini } from '../lib/desktop';

function readPreference(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export default function MiniApp() {
  const codex = useCodex();

  const latest = codex.data?.limits.find((item) => item.label === '5-hour window');

  const weekly = codex.data?.limits.find((item) => item.label === 'Weekly window');

  useEffect(() => {
    document.documentElement.dataset.theme =
      readPreference('dc-theme', 'dark') === 'light' ? 'light' : 'dark';

    document.documentElement.dataset.palette = readAnimePalette(
      readPreference('wd-palette', 'classic'),
    );
  }, []);

  return (
    <div className="mini-app">
      <div className="mini-head">
        <span className="mini-mark">
          <BrainCircuit size={20} />
        </span>

        <div>
          <b>Codex</b>
          <small>WaifuDesk</small>
        </div>

        <button
          className="icon-button"
          type="button"
          title="Perbarui"
          aria-label="Perbarui"
          onClick={() => void codex.refresh()}
        >
          <RefreshCw size={16} className={codex.loading ? 'spinner' : ''} />
        </button>
      </div>

      <div className="mini-card">
        <div className="mini-top">
          <span>Batas 5 jam</span>

          <span className={codex.data?.connected ? 'mini-connected' : 'mini-offline'}>
            {codex.data?.connected ? 'Lokal' : 'Tidak tersedia'}
          </span>
        </div>

        <Ring percent={latest?.usedPercent ?? null} label="tersisa" caption="laporan lokal" />

        <div className="mini-label">
          <span>Mingguan</span>
          <b>{weekly ? `${Math.round(100 - weekly.usedPercent)}%` : '—'}</b>
        </div>

        <div className="mini-label">
          <span>Token · 30 hari</span>
          <b>{codex.data?.connected ? compact(codex.data.totalTokens) : '—'}</b>
        </div>

        <div className="mini-label">
          <span>Diperbarui</span>
          <b>{dateTime(codex.data?.lastSeenAt)}</b>
        </div>
      </div>

      <p className="mini-foot">Laporan lokal · bukan real-time</p>

      <button type="button" className="mini-bottom-button" onClick={() => void toggleMini()}>
        Tutup widget
      </button>
    </div>
  );
}
