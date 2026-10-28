import { describe, expect, it } from 'vitest';
import { heatmapLevel } from './codexAnalytics';

describe('Codex usage heatmap', () => {
  it('renders empty days without activity', () => {
    expect(heatmapLevel(0, 1000)).toBe(0);
    expect(heatmapLevel(0, 0)).toBe(0);
  });
  it('keeps positive low usage visible', () => {
    expect(heatmapLevel(1, 1000)).toBe(1);
  });
  it('distributes relative usage across four shades', () => {
    expect(heatmapLevel(250, 1000)).toBe(1);
    expect(heatmapLevel(500, 1000)).toBe(2);
    expect(heatmapLevel(750, 1000)).toBe(3);
    expect(heatmapLevel(1000, 1000)).toBe(4);
  });
  it('ignores invalid numeric inputs', () => {
    expect(heatmapLevel(Infinity, 1000)).toBe(0);
    expect(heatmapLevel(1, NaN)).toBe(0);
  });
});
