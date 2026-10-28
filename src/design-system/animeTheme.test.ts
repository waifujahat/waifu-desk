import { describe, expect, it } from 'vitest';
import { readAnimePalette } from './animeTheme';

describe('anime theme preferences', () => {
  it('keeps classic as a safe default', () => {
    expect(readAnimePalette(null)).toBe('classic');
    expect(readAnimePalette('unknown')).toBe('classic');
  });
  it('accepts the two anime palettes', () => {
    expect(readAnimePalette('sakura')).toBe('sakura');
    expect(readAnimePalette('tsuki')).toBe('tsuki');
  });
});
