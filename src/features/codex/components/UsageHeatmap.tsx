import type { DailyUsage } from '../../../types'
import { compact } from '../../../lib/format'
import { heatmapLevel } from '../domain/codexAnalytics'

/** Aggregate-only calendar; no prompts or session identifiers are displayed. */
export function UsageHeatmap({ days }: { days: DailyUsage[] }) {
  const maximum = Math.max(0, ...days.map((day) => day.tokens))
  const total = days.reduce((sum, day) => sum + day.tokens, 0)

  return (
    <div
      className="wd-heatmap"
      role="img"
      aria-label={`Aktivitas Codex ${days.length} hari terakhir, total ${compact(total)} token`}
    >
      <div className="wd-heatmap-grid" aria-hidden="true">
        {days.map((day) => (
          <span
            key={day.day}
            className={`wd-heatmap-cell wd-heatmap-level-${heatmapLevel(day.tokens, maximum)}`}
            title={`${day.day} · ${day.tokens.toLocaleString('id-ID')} token`}
          />
        ))}
      </div>
      <div className="wd-heatmap-legend" aria-hidden="true">
        <span>Rendah</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <i key={level} className={`wd-heatmap-cell wd-heatmap-level-${level}`} />
        ))}
        <span>Tinggi</span>
      </div>
    </div>
  )
}
