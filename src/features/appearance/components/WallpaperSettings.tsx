import { Image, Eye, EyeOff } from 'lucide-react'

import type { WallpaperPreferences } from '../domain/wallpapers'

interface WallpaperSettingsProps {
  wallpaper: WallpaperPreferences
  onChange: (patch: Partial<WallpaperPreferences>) => void
}

export function WallpaperSettings({ wallpaper, onChange }: WallpaperSettingsProps) {
  return (
    <section className="panel settings-panel wd-wallpaper-settings" aria-labelledby="wd-wallpaper-heading">
      <div className="setting-title">
        <span className="settings-symbol">
          <Image size={20} aria-hidden="true" />
        </span>

        <div>
          <h3 id="wd-wallpaper-heading">Live Wallpaper</h3>
        </div>
      </div>

      <label className="wd-wallpaper-toggle" htmlFor="wd-wallpaper-enabled">
        <span>
          {wallpaper.enabled ? <Eye size={17} /> : <EyeOff size={17} />}
          Tampilkan wallpaper
        </span>

        <input
          id="wd-wallpaper-enabled"
          type="checkbox"
          checked={wallpaper.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
      </label>

      <div className="wd-wallpaper-opacity">
        <label htmlFor="wd-wallpaper-opacity">Intensitas wallpaper</label>

        <output htmlFor="wd-wallpaper-opacity">{Math.round(wallpaper.opacity * 100)}%</output>

        <input
          id="wd-wallpaper-opacity"
          type="range"
          min="5"
          max="35"
          step="1"
          value={Math.round(wallpaper.opacity * 100)}
          disabled={!wallpaper.enabled}
          onChange={(event) =>
            onChange({
              opacity: Number(event.target.value) / 100,
            })
          }
        />
      </div>
    </section>
  )
}
