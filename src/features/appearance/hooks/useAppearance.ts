import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_WALLPAPER,
  normalizeWallpaper,
  parseWallpaperPreferences,
  WALLPAPER_STORAGE_KEY,
  type WallpaperPreferences,
} from '../domain/wallpapers'

function readSavedSettings(): WallpaperPreferences {
  try {
    return parseWallpaperPreferences(localStorage.getItem(WALLPAPER_STORAGE_KEY))
  } catch {
    return { ...DEFAULT_WALLPAPER }
  }
}

/** Keeps only appearance preferences locally; no access to GitHub/Codex data. */
export function useAppearance() {
  const [wallpaper, setWallpaper] = useState<WallpaperPreferences>(readSavedSettings)
  const updateWallpaper = useCallback((patch: Partial<WallpaperPreferences>) => {
    setWallpaper((current) => normalizeWallpaper({ ...current, ...patch }))
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(WALLPAPER_STORAGE_KEY, JSON.stringify(wallpaper))
    } catch {
      // WebView/browser storage may be unavailable; the current session still works.
    }
  }, [wallpaper])

  return { wallpaper, updateWallpaper }
}
