/** Map a positive usage count to one of four intensity levels. */
export function heatmapLevel(tokens: number, maximum: number): 0 | 1 | 2 | 3 | 4 {
  if (tokens <= 0 || maximum <= 0 || !Number.isFinite(tokens) || !Number.isFinite(maximum)) return 0
  return Math.min(4, Math.max(1, Math.ceil((tokens / maximum) * 4))) as 1 | 2 | 3 | 4
}
