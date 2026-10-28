import type { AnimePalette } from '../../../design-system/animeTheme'
import sakuraVideo from '../../../assets/anime/wallpapers/sakura-blade-elegance.mp4'
import type { WallpaperPreferences } from '../domain/wallpapers'

interface WallpaperLayerProps {
  palette: AnimePalette
  wallpaper: WallpaperPreferences
}

export function WallpaperLayer({ wallpaper }: WallpaperLayerProps) {
  if (!wallpaper.enabled) return null

  return (
    <div className="wd-wallpaper-layer" aria-hidden="true" style={{ opacity: wallpaper.opacity }}>
      <video src={sakuraVideo} autoPlay loop muted playsInline preload="metadata" />
    </div>
  )
}
