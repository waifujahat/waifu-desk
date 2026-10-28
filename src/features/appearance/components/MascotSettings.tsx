import { Cat } from 'lucide-react'
import idle from '../../../assets/anime/mascot/hana-idle.png'
import happy from '../../../assets/anime/mascot/hana-happy.png'
import working from '../../../assets/anime/mascot/hana-working.png'
import thinking from '../../../assets/anime/mascot/hana-thinking.png'
import sleepy from '../../../assets/anime/mascot/hana-sleepy.png'
import surprised from '../../../assets/anime/mascot/hana-surprised.png'
import { EXPRESSIONS, type MascotExpression, type MascotPreferences } from '../domain/mascot'

interface MascotSettingsProps {
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

const titles: Record<MascotExpression, string> = {
  idle: 'Idle',
  happy: 'Happy',
  working: 'Working',
  thinking: 'Thinking',
  sleepy: 'Sleepy',
  surprised: 'Surprised',
}

export function MascotSettings({ mascot, onChange }: MascotSettingsProps) {
  return (
    <section className="panel settings-panel wd-mascot-settings" aria-labelledby="wd-mascot-heading">
      <div className="setting-title">
        <span className="settings-symbol">
          <Cat size={20} aria-hidden="true" />
        </span>
        <h3 id="wd-mascot-heading">Waifu Mascot · Hana</h3>
      </div>
      <label className="wd-mascot-setting-toggle" htmlFor="wd-mascot-enabled">
        <span>Tampilkan Hana di Beranda</span>
        <input
          id="wd-mascot-enabled"
          type="checkbox"
          checked={mascot.enabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
        />
      </label>
      <div className="wd-mascot-settings-preview" aria-hidden="true">
        <img src={images[mascot.expression]} alt="" />
      </div>
      <label className="field-label" htmlFor="wd-mascot-expression">
        Ekspresi
      </label>
      <select
        id="wd-mascot-expression"
        className="wd-mascot-expression-select"
        disabled={!mascot.enabled}
        value={mascot.expression}
        onChange={(event) => onChange({ expression: event.target.value as MascotExpression })}
      >
        {EXPRESSIONS.map((expression) => (
          <option key={expression} value={expression}>
            {titles[expression]}
          </option>
        ))}
      </select>
    </section>
  )
}
