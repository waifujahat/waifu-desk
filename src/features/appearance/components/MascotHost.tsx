import { X } from 'lucide-react'
import idle from '../../../assets/anime/mascot/hana-idle.png'
import happy from '../../../assets/anime/mascot/hana-happy.png'
import working from '../../../assets/anime/mascot/hana-working.png'
import thinking from '../../../assets/anime/mascot/hana-thinking.png'
import sleepy from '../../../assets/anime/mascot/hana-sleepy.png'
import surprised from '../../../assets/anime/mascot/hana-surprised.png'
import { nextMascotExpression, type MascotExpression, type MascotPreferences } from '../domain/mascot'

interface MascotHostProps {
  mascot: MascotPreferences
  onChange: (patch: Partial<MascotPreferences>) => void
}

const images: Record<MascotExpression, string> = {
  idle,
  happy,
  working,
  thinking,
  sleepy,
  surprised,
}

const labels: Record<MascotExpression, string> = {
  idle: 'Siap menemanimu',
  happy: 'Kerja bagus!',
  working: 'Semangat coding!',
  thinking: 'Lagi mikir...',
  sleepy: 'Waktunya istirahat?',
  surprised: 'Wah, ada yang baru!',
}

/** Appears on Overview only; no timers, third-party code, or pointer-event overlay. */
export function MascotHost({ mascot, onChange }: MascotHostProps) {
  if (!mascot.enabled) return null

  return (
    <aside className="wd-mascot-host" aria-label="Hana, maskot WaifuDesk">
      <button
        className="wd-mascot-hide"
        type="button"
        aria-label="Sembunyikan Hana"
        title="Sembunyikan Hana (bisa diaktifkan di Pengaturan)"
        onClick={() => onChange({ enabled: false })}
      >
        <X size={14} aria-hidden="true" />
      </button>
      <button
        className="wd-mascot-character"
        type="button"
        aria-label={`Hana: ${labels[mascot.expression]}. Klik untuk mengganti ekspresi.`}
        title="Klik Hana untuk mengganti ekspresi"
        onClick={() => onChange({ expression: nextMascotExpression(mascot.expression) })}
      >
        <img src={images[mascot.expression]} alt="" draggable={false} />
      </button>
      <span className="wd-mascot-caption" aria-live="polite">
        {labels[mascot.expression]}
      </span>
    </aside>
  )
}
