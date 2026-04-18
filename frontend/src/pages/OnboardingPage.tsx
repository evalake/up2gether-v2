import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMe } from '@/features/auth/hooks'
import { usePatchSettings, useSetHardware } from '@/features/users/hooks'
import { useCreateGroup } from '@/features/groups/hooks'
import { api } from '@/lib/api'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/core/Button'
import { Avatar } from '@/components/core/Avatar'
import { Loading } from '@/components/ui/Loading'
import { useT } from '@/i18n'
import type { HardwareTier } from '@/features/games/api'

type DiscoverResult = {
  joined: { id: string; name: string; icon_url: string | null }[]
  available: { discord_guild_id: string; name: string; icon_url: string | null }[]
}

// TIERS moved inside component to access t.*

const TIMEZONES = [
  'America/Sao_Paulo',
  'America/Manaus',
  'America/Belem',
  'America/Fortaleza',
  'America/Recife',
  'America/Bahia',
  'America/Cuiaba',
  'America/Campo_Grande',
  'America/Porto_Velho',
  'America/Rio_Branco',
  'America/Noronha',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Lisbon',
  'Europe/Berlin',
  'Europe/Paris',
  'UTC',
]

const STEPS = ['welcome', 'servers', 'timezone', 'hardware', 'steam', 'done'] as const
type Step = typeof STEPS[number]

function guildIcon(url: string | null) {
  if (!url) return null
  return (
    <img loading="lazy" src={url} alt="" className="h-8 w-8 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
  )
}

export function OnboardingPage() {
  const t = useT()
  const navigate = useNavigate()
  const me = useMe()
  const toast = useToast()

  const TIERS: { id: HardwareTier; label: string; hint: string }[] = [
    { id: 'low', label: 'low', hint: t.onboarding.hwTierLow },
    { id: 'mid', label: 'mid', hint: t.onboarding.hwTierMid },
    { id: 'high', label: 'high', hint: t.onboarding.hwTierHigh },
    { id: 'unknown', label: '?', hint: t.onboarding.hwTierUnknown },
  ]
  const patch = usePatchSettings()
  const setHw = useSetHardware()
  const createGroup = useCreateGroup()

  const [step, setStep] = useState<Step>('welcome')
  const [tz, setTz] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone } catch { return 'America/Sao_Paulo' }
  })
  const [hwTier, setHwTier] = useState<HardwareTier>('unknown')
  const [steamUrl, setSteamUrl] = useState('')
  const [steamLoading, setSteamLoading] = useState(false)

  // auto-discover
  const [discover, setDiscover] = useState<DiscoverResult | null>(null)
  const [discoverLoading, setDiscoverLoading] = useState(false)
  const [joining, setJoining] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (step === 'servers' && !discover) {
      setDiscoverLoading(true)
      api<DiscoverResult>('/groups/auto-discover', { method: 'POST' })
        .then(setDiscover)
        .catch(() => setDiscover({ joined: [], available: [] }))
        .finally(() => setDiscoverLoading(false))
    }
  }, [step, discover])

  const joinServer = async (g: DiscoverResult['available'][0]) => {
    setJoining((s) => new Set(s).add(g.discord_guild_id))
    try {
      await createGroup.mutateAsync({
        discord_guild_id: g.discord_guild_id,
        name: g.name,
        icon_url: g.icon_url,
      })
      setDiscover((prev) => {
        if (!prev) return prev
        return {
          joined: [...prev.joined, { id: g.discord_guild_id, name: g.name, icon_url: g.icon_url }],
          available: prev.available.filter((a) => a.discord_guild_id !== g.discord_guild_id),
        }
      })
    } catch {
      toast.error(t.onboarding.joinFail)
    }
    setJoining((s) => { const n = new Set(s); n.delete(g.discord_guild_id); return n })
  }

  const importSteam = async () => {
    if (!steamUrl.trim()) return
    setSteamLoading(true)
    try {
      const r = await api<{ owned_count: number; matched_count: number }>('/steam/library/import', {
        method: 'POST',
        body: { steam_id_or_vanity: steamUrl.trim() },
      })
      toast.success(t.onboarding.steamImported(r.owned_count, r.matched_count))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.onboarding.importFail)
    } finally {
      setSteamLoading(false)
    }
  }

  const finish = async () => {
    try {
      await patch.mutateAsync({ timezone: tz, onboarding_completed: true })
      await setHw.mutateAsync({ tier: hwTier })
    } catch { /* continua */ }
    navigate('/groups', { replace: true })
  }

  const next = () => {
    const i = STEPS.indexOf(step)
    if (i < STEPS.length - 1) setStep(STEPS[i + 1])
  }
  const prev = () => {
    const i = STEPS.indexOf(step)
    if (i > 0) setStep(STEPS[i - 1])
  }
  const stepIdx = STEPS.indexOf(step)
  const name = me.data?.discord_display_name ?? me.data?.discord_username ?? ''

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-up-grid px-4">
      <div className="absolute inset-0 up-scan pointer-events-none" />

      {/* progress dots */}
      <div className="fixed left-1/2 top-6 z-30 flex -translate-x-1/2 gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className={`h-1.5 rounded-full transition-all ${i <= stepIdx ? 'w-6 bg-up-orange' : 'w-1.5 bg-up-line/40'}`} />
        ))}
      </div>

      <div className="relative w-full max-w-lg">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.2 }}
          >
            {step === 'welcome' && (
              <div className="space-y-6 text-center">
                <Avatar discordId={me.data?.discord_id} hash={me.data?.discord_avatar} name={name} size="xl" />
                <div>
                  <h1 className="font-display text-3xl text-up-text">{t.onboarding.hi(name)}</h1>
                  <p className="mt-2 text-sm text-up-dim">
                    {t.onboarding.setupHint}
                  </p>
                </div>
                <Button onClick={next} className="mx-auto">{t.onboarding.letsGo}</Button>
              </div>
            )}

            {step === 'servers' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="font-display text-2xl text-up-text">{t.onboarding.yourServers}</h2>
                  <p className="mt-1 text-sm text-up-dim">
                    {t.onboarding.foundServers}
                  </p>
                </div>

                {discoverLoading && <Loading label={t.onboarding.searchingServers} />}

                {discover && (
                  <div className="space-y-3">
                    {discover.joined.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-up-green">{t.onboarding.alreadyConnected}</div>
                        {discover.joined.map((g) => (
                          <div key={g.id} className="flex items-center gap-3 rounded-sm border border-up-green/30 bg-up-green/5 px-3 py-2">
                            {guildIcon(g.icon_url)}
                            <span className="text-sm text-up-text">{g.name}</span>
                            <span className="ml-auto text-[10px] uppercase tracking-wider text-up-green">ok</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {discover.available.length > 0 && (
                      <div className="space-y-1.5">
                        <div className="text-[10px] uppercase tracking-wider text-up-dim">{t.onboarding.availableToRegister}</div>
                        {discover.available.map((g) => (
                          <div key={g.discord_guild_id} className="flex items-center gap-3 rounded-sm border border-up-line bg-up-panel/30 px-3 py-2">
                            {guildIcon(g.icon_url)}
                            <span className="flex-1 truncate text-sm text-up-text">{g.name}</span>
                            <button
                              onClick={() => joinServer(g)}
                              disabled={joining.has(g.discord_guild_id)}
                              className="shrink-0 rounded-sm border border-up-orange/40 px-2 py-1 text-[10px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/10 disabled:opacity-40"
                            >
                              {joining.has(g.discord_guild_id) ? '...' : t.onboarding.register}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {discover.joined.length === 0 && discover.available.length === 0 && (
                      <div className="py-6 text-center text-xs text-up-dim">
                        {t.onboarding.noServersFound}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-2">
                  <button onClick={prev} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">{t.onboarding.back}</button>
                  <Button onClick={next}>{t.onboarding.next}</Button>
                </div>
              </div>
            )}

            {step === 'timezone' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="font-display text-2xl text-up-text">{t.onboarding.timezoneLabel}</h2>
                  <p className="mt-1 text-sm text-up-dim">
                    {t.onboarding.timezoneHint}
                  </p>
                </div>
                <select
                  value={tz}
                  onChange={(e) => setTz(e.target.value)}
                  className="mx-auto block h-10 w-full max-w-xs rounded-sm border border-up-orange/30 bg-black/40 px-3 text-sm text-up-text focus-visible:border-up-orange focus-visible:outline-none"
                >
                  {TIMEZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={prev} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">{t.onboarding.back}</button>
                  <Button onClick={next}>{t.onboarding.next}</Button>
                </div>
              </div>
            )}

            {step === 'hardware' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="font-display text-2xl text-up-text">{t.onboarding.yourPC}</h2>
                  <p className="mt-1 text-sm text-up-dim">
                    {t.onboarding.pcHint}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setHwTier(t.id)}
                      className={`rounded-sm border px-3 py-3 text-left transition-all ${
                        hwTier === t.id
                          ? 'border-up-orange bg-up-orange/10 text-up-orange'
                          : 'border-up-line text-up-dim hover:border-up-orange'
                      }`}
                    >
                      <div className="text-sm uppercase tracking-wider">{t.label}</div>
                      <div className="mt-0.5 text-[10px] text-up-dim/80">{t.hint}</div>
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={prev} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">{t.onboarding.back}</button>
                  <Button onClick={next}>{t.onboarding.next}</Button>
                </div>
              </div>
            )}

            {step === 'steam' && (
              <div className="space-y-5">
                <div className="text-center">
                  <h2 className="font-display text-2xl text-up-text">{t.onboarding.steamLabel}</h2>
                  <p className="mt-1 text-sm text-up-dim">
                    {t.onboarding.steamHint}
                  </p>
                </div>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={steamUrl}
                      onChange={(e) => setSteamUrl(e.target.value)}
                      placeholder={t.onboarding.steamPlaceholder}
                      className="h-9 flex-1 rounded-sm border border-up-line bg-black/40 px-3 text-xs focus-visible:border-up-orange focus-visible:outline-none"
                    />
                    <Button onClick={importSteam} disabled={steamLoading || !steamUrl.trim()}>
                      {steamLoading ? '...' : t.settings.importLabel}
                    </Button>
                  </div>
                  <a
                    href="https://steamcommunity.com/my/profile"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[11px] text-up-orange/70 transition-colors hover:text-up-orange"
                  >
                    {t.onboarding.openSteamProfile}
                  </a>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <button onClick={prev} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">{t.onboarding.back}</button>
                  <div className="flex gap-2">
                    <button onClick={next} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">{t.onboarding.skip}</button>
                    <Button onClick={next}>{t.onboarding.next}</Button>
                  </div>
                </div>
              </div>
            )}

            {step === 'done' && (
              <div className="space-y-6 text-center">
                <div className="font-display text-4xl text-up-orange">{t.onboarding.done}</div>
                <p className="text-sm text-up-dim">
                  {t.onboarding.allSet}
                </p>
                <Button onClick={finish} className="mx-auto">
                  {patch.isPending ? t.common.saving : t.onboarding.goToGroups}
                </Button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
