import type { HardwareTier } from '@/features/games/api'
import { Avatar } from '@/components/nerv/Avatar'

const TIERS: { id: HardwareTier; label: string; hint: string }[] = [
  { id: 'low', label: 'low', hint: 'integrada / notebook básico' },
  { id: 'mid', label: 'mid', hint: 'gtx 1060+ / rx 580+' },
  { id: 'high', label: 'high', hint: 'rtx 3060+ / rx 6700+' },
  { id: 'unknown', label: '?', hint: 'não sei' },
]

const TIMEZONES = [
  'America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'America/Fortaleza',
  'America/Recife', 'America/Bahia', 'America/Cuiaba', 'America/Campo_Grande',
  'America/Porto_Velho', 'America/Rio_Branco', 'America/Noronha',
  'America/New_York', 'America/Los_Angeles', 'America/Chicago',
  'Europe/London', 'Europe/Lisbon', 'Europe/Berlin', 'Europe/Paris', 'UTC',
]

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-nerv-orange/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-6">
      <div className="sm:w-40 sm:shrink-0">
        <div className="text-[11px] uppercase tracking-wider text-nerv-text">{label}</div>
        {hint && <div className="text-[10px] text-nerv-dim">{hint}</div>}
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}

type Props = {
  name: string
  discordId?: string | null
  discordAvatar?: string | null
  discordEmail?: string | null
  tz: string
  email: string
  hwTier: HardwareTier
  setTz: (v: string) => void
  setEmail: (v: string) => void
  setHwTier: (v: HardwareTier) => void
}

export function PreferencesSection({ name, discordId, discordAvatar, discordEmail, tz, email, hwTier, setTz, setEmail, setHwTier }: Props) {
  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center gap-3 border-b border-nerv-orange/10 pb-4">
        <Avatar discordId={discordId ?? undefined} hash={discordAvatar ?? undefined} name={name} size="lg" />
        <div className="min-w-0">
          <div className="truncate text-base text-nerv-text">{name}</div>
          <div className="text-[10px] uppercase tracking-wider text-nerv-dim">conectado via discord</div>
        </div>
      </div>

      <Row label="timezone" hint="usado em todos os horários exibidos">
        <select
          value={tz}
          onChange={(e) => setTz(e.target.value)}
          className="h-9 w-full max-w-xs rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus-visible:border-nerv-orange focus-visible:outline-none"
        >
          {TIMEZONES.map((z) => (
            <option key={z} value={z}>{z}</option>
          ))}
        </select>
      </Row>

      <Row label="email" hint="herdado do discord, editavel">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={discordEmail ?? 'seu@email'}
          className="h-9 w-full max-w-sm rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus-visible:border-nerv-orange focus-visible:outline-none"
        />
      </Row>

      <Row label="hardware" hint="ajuda a sugerir jogos compatíveis">
        <div className="grid max-w-md grid-cols-2 gap-1.5 sm:grid-cols-4">
          {TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setHwTier(t.id)}
              className={`rounded-sm border px-2 py-2 text-left transition-all ${
                hwTier === t.id
                  ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                  : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
              }`}
            >
              <div className="text-xs uppercase tracking-wider">{t.label}</div>
              <div className="mt-0.5 text-[9px] text-nerv-dim/80">{t.hint}</div>
            </button>
          ))}
        </div>
      </Row>
    </section>
  )
}
