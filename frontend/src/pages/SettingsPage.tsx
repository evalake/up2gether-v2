import { useEffect, useState } from 'react'
import { useMySettings, usePatchSettings, useSetHardware } from '@/features/users/hooks'
import { useMe } from '@/features/auth/hooks'
import type { HardwareTier } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/nerv/Button'
import { KanjiLabel } from '@/components/nerv/KanjiLabel'
import { Avatar } from '@/components/nerv/Avatar'
import { api } from '@/lib/api'

const TIERS: { id: HardwareTier; label: string; hint: string }[] = [
  { id: 'low', label: 'low', hint: 'integrada / notebook básico' },
  { id: 'mid', label: 'mid', hint: 'gtx 1060+ / rx 580+' },
  { id: 'high', label: 'high', hint: 'rtx 3060+ / rx 6700+' },
  { id: 'unknown', label: '?', hint: 'não sei' },
]

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

export function SettingsPage() {
  const me = useMe()
  const settings = useMySettings()
  const patch = usePatchSettings()
  const setHw = useSetHardware()

  const [tz, setTz] = useState('America/Sao_Paulo')
  const [email, setEmail] = useState('')
  const [hwTier, setHwTier] = useState<HardwareTier>('unknown')
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    if (settings.data) {
      setTz(settings.data.timezone ?? 'America/Sao_Paulo')
      setEmail(settings.data.notification_email ?? (me.data as any)?.discord_email ?? '')
    }
  }, [settings.data, me.data])

  useEffect(() => {
    const tier = (me.data as any)?.hardware_tier
    if (tier) setHwTier(tier)
  }, [me.data])

  const toast = useToast()

  const onSave = async () => {
    try {
      await patch.mutateAsync({ timezone: tz, notification_email: email || null })
      await setHw.mutateAsync({ tier: hwTier, notes: null })
      toast.success('preferencias salvas')
      setDirty(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao salvar')
    }
  }

  const mark = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
  }

  const name = me.data?.discord_display_name ?? me.data?.discord_username ?? '---'
  const saving = patch.isPending || setHw.isPending

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <KanjiLabel jp="設定" en="settings" />
        <h1 className="mt-1 font-display text-3xl text-nerv-text">preferences</h1>
      </header>

      {settings.isLoading && <Loading />}
      {settings.error && <ErrorBox error={settings.error} />}

      <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
        <div className="flex items-center gap-3 border-b border-nerv-orange/10 pb-4">
          <Avatar discordId={me.data?.discord_id} hash={me.data?.discord_avatar} name={name} size="lg" />
          <div className="min-w-0">
            <div className="truncate text-base text-nerv-text">{name}</div>
            <div className="text-[10px] uppercase tracking-wider text-nerv-dim">conectado via discord</div>
          </div>
        </div>

        <Row label="timezone" hint="usado em todos os horários exibidos">
          <select
            value={tz}
            onChange={(e) => mark(setTz)(e.target.value)}
            className="h-9 w-full max-w-xs rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus:border-nerv-orange focus:outline-none"
          >
            {TIMEZONES.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </Row>

        <Row label="email" hint="herdado do discord, editavel">
          <input
            type="email"
            value={email}
            onChange={(e) => mark(setEmail)(e.target.value)}
            placeholder={(me.data as any)?.discord_email ?? 'seu@email'}
            className="h-9 w-full max-w-sm rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus:border-nerv-orange focus:outline-none"
          />
        </Row>

        <Row label="hardware" hint="ajuda a sugerir jogos compatíveis">
          <div className="grid max-w-md grid-cols-2 gap-1.5 sm:grid-cols-4">
            {TIERS.map((t) => (
              <button
                key={t.id}
                onClick={() => mark(setHwTier)(t.id)}
                className={`rounded-sm border px-2 py-2 text-left transition-all ${
                  hwTier === t.id
                    ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                    : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                }`}
              >
                <div className="text-xs uppercase tracking-wider">{t.label}</div>
                <div className="mt-0.5 text-[9px] text-nerv-dim/80">{t.hint}</div>
              </button>
            ))}
          </div>
        </Row>
      </section>

      <SteamLibrarySection />
      <PushNotificationsSection />

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-[11px] text-nerv-amber">alterações não salvas</span>}
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'salvando...' : 'salvar'}
        </Button>
      </div>
    </div>
  )
}

function PushNotificationsSection() {
  const toast = useToast()
  const [state, setState] = useState<'loading' | 'unsupported' | 'denied' | 'off' | 'on'>('loading')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { pushSupported, getPushState } = await import('@/features/notifications/push')
      if (!pushSupported()) {
        if (!cancel) setState('unsupported')
        return
      }
      const ps = await getPushState()
      if (cancel) return
      if (ps === 'denied') return setState('denied')
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setState(sub && ps === 'granted' ? 'on' : 'off')
    })()
    return () => { cancel = true }
  }, [])
  const toggle = async () => {
    setBusy(true)
    try {
      const { enablePush, disablePush } = await import('@/features/notifications/push')
      if (state === 'on') {
        await disablePush()
        setState('off')
        toast.success('push desligado')
      } else {
        await enablePush()
        setState('on')
        toast.success('push ativado')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    } finally {
      setBusy(false)
    }
  }
  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">push notifications</div>
      <p className="mb-3 text-xs text-nerv-text/70">
        receba notificações do navegador quando tiver votação nova, sessão agendada ou ciclo de tema aberto.
      </p>
      {state === 'loading' && <Loading />}
      {state === 'unsupported' && <div className="text-[11px] text-nerv-dim">navegador não suporta push</div>}
      {state === 'denied' && <div className="text-[11px] text-nerv-red/80">permissão bloqueada. libere nas configs do navegador.</div>}
      {(state === 'on' || state === 'off') && (
        <Button onClick={toggle} disabled={busy}>
          {busy ? '...' : state === 'on' ? 'desligar push' : 'ativar push'}
        </Button>
      )}
    </section>
  )
}

function SteamLibrarySection() {
  const toast = useToast()
  const [vanity, setVanity] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ owned: number; matched: number } | null>(null)

  const run = async () => {
    if (!vanity.trim()) return
    setLoading(true)
    try {
      const r = await api<{ owned_count: number; matched_count: number; steam_id: string }>(
        "/steam/library/import",
        { method: "POST", body: { steam_id_or_vanity: vanity.trim() } },
      )
      setResult({ owned: r.owned_count, matched: r.matched_count })
      toast.success(`importado: ${r.matched_count} de ${r.owned_count} jogos vinculados`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "falha ao importar")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">Biblioteca Steam</div>
      <p className="mb-2 text-xs text-nerv-text/70">
        Importe sua lista de jogos pra marcar automaticamente tudo que você possui em todos os grupos. Vale também pros jogos adicionados depois.
      </p>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-[11px] text-nerv-text/60">
        <li>
          Clique em <strong>Abrir Meu Perfil</strong> (abre numa aba nova, já logado).
        </li>
        <li>
          Copie a URL inteira da barra de endereço, algo como{' '}
          <code className="text-nerv-text/80">steamcommunity.com/id/seunick</code> ou{' '}
          <code className="text-nerv-text/80">steamcommunity.com/profiles/76561198...</code>
        </li>
        <li>Cole no campo abaixo e clique em Importar.</li>
        <li>
          Seu perfil precisa estar com <strong>Detalhes do jogo</strong> em <strong>Público</strong> nas configs de privacidade da Steam.
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={vanity}
          onChange={(e) => setVanity(e.target.value)}
          placeholder="Cole aqui a URL, nick ou steam id"
          className="h-9 flex-1 min-w-[220px] rounded-sm border border-nerv-line bg-black/40 px-3 text-xs focus:border-nerv-orange focus:outline-none"
        />
        <a
          href="https://steamcommunity.com/my/profile"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-sm border border-nerv-line px-3 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/60 hover:text-nerv-orange"
        >
          Abrir Meu Perfil
        </a>
        <Button onClick={run} disabled={loading || !vanity.trim()}>
          {loading ? 'Importando...' : 'Importar'}
        </Button>
      </div>
      {result && (
        <div className="mt-3 text-[11px] text-nerv-green">
          {result.matched} de {result.owned} jogos vinculados
        </div>
      )}
    </section>
  )
}

