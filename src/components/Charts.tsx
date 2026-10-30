import type { CSSProperties } from 'react';
import { compact, prettyDate } from '../lib/format';

export function Chart({
  points,
  label = 'events',
  color = 'purple',
  height = 174,
}: {
  points: { day: string; count: number }[];
  label?: string;
  color?: 'purple' | 'teal';
  height?: number;
}) {
  const width = 700,
    top = 18,
    bottom = 18,
    span = height - top - bottom;
  const max = Math.max(1, ...points.map((point) => point.count));
  const scaleX = (index: number) =>
    points.length < 2 ? width / 2 : 6 + (index * (width - 12)) / (points.length - 1);
  const scaleY = (value: number) => top + span - (value / max) * span;
  const poly = points.map((point, index) => `${scaleX(index)},${scaleY(point.count)}`).join(' ');
  const fillPath = points.length
    ? `M ${scaleX(0)},${height - bottom} L ${poly.replaceAll(' ', ' L ')} L ${scaleX(points.length - 1)},${height - bottom} Z`
    : '';
  return (
    <div
      className="line-chart"
      role="img"
      aria-label={`Grafik ${label}, ${points.length} hari. Total ${points.reduce((a, b) => a + b.count, 0)} ${label}`}
    >
      <div className="chart-plot">
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={`chart-fill-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={color === 'purple' ? '#9186ff' : '#65decf'}
                stopOpacity=".32"
              />
              <stop
                offset="100%"
                stopColor={color === 'purple' ? '#9186ff' : '#65decf'}
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75, 1].map((frac) => (
            <line
              key={frac}
              x1="0"
              x2={width}
              y1={height - bottom - frac * span}
              y2={height - bottom - frac * span}
              stroke="currentColor"
              strokeOpacity=".11"
              strokeDasharray="4 8"
            />
          ))}
          <path d={fillPath} fill={`url(#chart-fill-${color})`} />
          <polyline
            points={poly}
            fill="none"
            stroke={color === 'purple' ? '#9893ff' : '#64d6c7'}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((p, i) => (
            <circle
              key={p.day}
              cx={scaleX(i)}
              cy={scaleY(p.count)}
              r="4"
              fill={color === 'purple' ? '#9893ff' : '#64d6c7'}
              opacity={p.count ? 1 : 0.25}
            />
          ))}
        </svg>
      </div>
      <div className="chart-labels">
        <span>{prettyDate(points[0]?.day)}</span>
        <span>{prettyDate(points[Math.floor(points.length / 2)]?.day)}</span>
        <span>{prettyDate(points.at(-1)?.day)}</span>
      </div>
    </div>
  );
}
export function Bars({ points }: { points: { day: string; tokens: number }[] }) {
  const max = Math.max(...points.map((item) => item.tokens), 1);
  return (
    <div
      className="bars-chart"
      role="img"
      aria-label={`Pemakaian token harian, ${points.length} hari`}
    >
      {points.map((point) => (
        <div
          key={point.day}
          className="bar-group"
          title={`${prettyDate(point.day)} · ${compact(point.tokens)} tokens`}
        >
          <div className="bar-track">
            <span
              style={{ height: `${Math.max(point.tokens ? 4 : 2, (point.tokens / max) * 100)}%` }}
              className={point.tokens ? 'bar-value' : 'bar-zero'}
            />
          </div>
          <small>{point.day.slice(8)}</small>
        </div>
      ))}
    </div>
  );
}
export function Ring({
  percent,
  label,
  caption,
  tone = 'purple',
}: {
  percent: number | null;
  label: string;
  caption: string;
  tone?: 'purple' | 'teal';
}) {
  const value = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  return (
    <div className={`gauge ${tone}`} style={{ '--fill': `${value}%` } as CSSProperties}>
      <div className="gauge-inner">
        <span className="gauge-value">{percent == null ? '—' : `${Math.round(100 - value)}%`}</span>
        <span className="gauge-label">{label}</span>
        <small>{caption}</small>
      </div>
    </div>
  );
}
