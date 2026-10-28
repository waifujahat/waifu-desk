/** Visual accents are independent of the existing dark / light mode. */
export type AnimePalette = 'classic' | 'sakura' | 'tsuki';

export function readAnimePalette(value: string | null): AnimePalette {
  return value === 'sakura' || value === 'tsuki' ? value : 'classic';
}
