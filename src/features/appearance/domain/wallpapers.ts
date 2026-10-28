import type { AnimePalette } from '../../../design-system/animeTheme';

export type WallpaperId = 'auto' | 'sakura' | 'tsuki';

export type WallpaperPreferences = {
  version: 1;
  enabled: boolean;
  opacity: number;
  wallpaperId: WallpaperId;
};

export const WALLPAPER_STORAGE_KEY = 'wd-wallpaper-v1';

export const DEFAULT_WALLPAPER: WallpaperPreferences = {
  version: 1,
  enabled: true,
  opacity: 0.24,
  wallpaperId: 'auto',
};

export function resolveWallpaper(
  palette: AnimePalette,
  wallpaperId: WallpaperId,
): Exclude<WallpaperId, 'auto'> {
  if (wallpaperId !== 'auto') return wallpaperId;
  return palette === 'tsuki' ? 'tsuki' : 'sakura';
}

export function normalizeWallpaper(value: unknown): WallpaperPreferences {
  if (!value || typeof value !== 'object') return { ...DEFAULT_WALLPAPER };
  const input = value as Partial<WallpaperPreferences>;
  const rawOpacity =
    typeof input.opacity === 'number' && Number.isFinite(input.opacity)
      ? input.opacity
      : DEFAULT_WALLPAPER.opacity;
  return {
    version: 1,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_WALLPAPER.enabled,
    opacity: Math.round(Math.max(0.05, Math.min(0.35, rawOpacity)) * 100) / 100,
    wallpaperId:
      input.wallpaperId === 'sakura' || input.wallpaperId === 'tsuki' ? input.wallpaperId : 'auto',
  };
}

export function parseWallpaperPreferences(raw: string | null): WallpaperPreferences {
  if (!raw) return { ...DEFAULT_WALLPAPER };
  try {
    return normalizeWallpaper(JSON.parse(raw) as unknown);
  } catch {
    return { ...DEFAULT_WALLPAPER };
  }
}
