import { describe, expect, it } from 'vitest'
import {
  DEFAULT_WALLPAPER,
  normalizeWallpaper,
  parseWallpaperPreferences,
  resolveWallpaper,
} from './wallpapers'

describe('WaifuDesk wallpaper preferences', () => {
  it('uses safe defaults for missing and invalid storage', () => {
    expect(parseWallpaperPreferences(null)).toEqual(DEFAULT_WALLPAPER)
    expect(parseWallpaperPreferences('{broken')).toEqual(DEFAULT_WALLPAPER)
  })

  it('clamps opacity and ignores unknown wallpaper names', () => {
    expect(normalizeWallpaper({ enabled: false, opacity: 8, wallpaperId: '../outside' })).toEqual({
      version: 1,
      enabled: false,
      opacity: 0.35,
      wallpaperId: 'auto',
    })
    expect(normalizeWallpaper({ opacity: -100 }).opacity).toBe(0.05)
  })

  it('uses the current palette in automatic mode', () => {
    expect(resolveWallpaper('sakura', 'auto')).toBe('sakura')
    expect(resolveWallpaper('tsuki', 'auto')).toBe('tsuki')
    expect(resolveWallpaper('classic', 'auto')).toBe('sakura')
    expect(resolveWallpaper('tsuki', 'sakura')).toBe('sakura')
  })

  it('preserves valid stored settings', () => {
    expect(
      parseWallpaperPreferences('{"version":1,"enabled":false,"opacity":0.27,"wallpaperId":"tsuki"}'),
    ).toEqual({
      version: 1,
      enabled: false,
      opacity: 0.27,
      wallpaperId: 'tsuki',
    })
  })
})
