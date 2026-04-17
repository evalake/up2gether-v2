import { useEffect, useMemo, useState } from 'react'
import { Avatar } from '@/components/core/Avatar'
import { Button } from '@/components/core/Button'
import { useToast } from '@/components/ui/toast'
import { useMe } from '@/features/auth/hooks'
import { useMySettings, usePatchSettings, useSetHardware } from '@/features/users/hooks'
import type { HardwareTier } from '@/features/games/api'
import { useT } from '@/i18n'
import { SettingsCard } from './SettingsCard'

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

export function PreferencesSection() {
  const t = useT()
  const me = useMe()
  const settings = useMySettings()
  const patch = usePatchSettings()
  const setHw = useSetHardware()
  const toast = useToast()

  const TZ_GROUPS: { region: string; zones: { id: string; label: string }[] }[] = [
    {
      region: t.settings.tzBrazil,
      zones: [
        { id: 'America/Sao_Paulo', label: 'São Paulo' },
        { id: 'America/Manaus', label: 'Manaus' },
        { id: 'America/Belem', label: 'Belém' },
        { id: 'America/Fortaleza', label: 'Fortaleza' },
        { id: 'America/Recife', label: 'Recife' },
        { id: 'America/Bahia', label: 'Salvador' },
        { id: 'America/Cuiaba', label: 'Cuiabá' },
        { id: 'America/Campo_Grande', label: 'Campo Grande' },
        { id: 'America/Porto_Velho', label: 'Porto Velho' },
        { id: 'America/Rio_Branco', label: 'Rio Branco' },
        { id: 'America/Noronha', label: 'Fernando de Noronha' },
      ],
    },
    {
      region: t.settings.tzAmericas,
      zones: [
        { id: 'America/New_York', label: 'New York' },
        { id: 'America/Chicago', label: 'Chicago' },
        { id: 'America/Los_Angeles', label: 'Los Angeles' },
      ],
    },
    {
      region: t.settings.tzEurope,
      zones: [
        { id: 'Europe/London', label: 'London' },
        { id: 'Europe/Lisbon', label: 'Lisbon' },
        { id: 'Europe/Berlin', label: 'Berlin' },
        { id: 'Europe/Paris', label: 'Paris' },
      ],
    },
    { region: t.settings.tzReference, zones: [{ id: 'UTC', label: 'UTC' }] },
  ]

  const TIERS: { id: HardwareTier; codename: string; title: string; body: string }[] = [
    {
      id: 'low',
      codename: 'CL-01',
      title: t.settings.tierLow,
      body: t.settings.tierLowDesc,
    },
    {
      id: 'mid',
      codename: 'CL-02',
      title: t.settings.tierMid,
      body: t.settings.tierMidDesc,
    },
    {
      id: 'high',
      codename: 'CL-03',
      title: t.settings.tierHigh,
      body: t.settings.tierHighDesc,
    },
    {
      id: 'unknown',
      codename: 'CL-00',
      title: t.settings.tierUnknown,
      body: t.settings.tierUnknownDesc,
    },
  ]

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

  const discordEmail = (me.data as any)?.discord_email as string | undefined
  const name = me.data?.discord_display_name ?? me.data?.discord_username ?? t.settings.noName
  const saving = patch.isPending || setHw.isPending
  const detected = useMemo(detectTimezone, [])

  const update = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setDirty(true)
  }

  const save = async () => {
    try {
      await patch.mutateAsync({ timezone: tz, notification_email: email || null })
      await setHw.mutateAsync({ tier: hwTier, notes: null })
      toast.success(t.settings.prefsSaved)
      setDirty(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.settings.saveFail)
    }
  }

  return (
    <SettingsCard title={t.settings.profile}>
      <div className="flex items-center gap-3 pb-5">
        <Avatar
          discordId={me.data?.discord_id ?? undefined}
          hash={me.data?.discord_avatar ?? undefined}
          name={name}
          size="lg"
        />
        <div className="min-w-0">
          <div className="truncate text-base text-up-text">{name}</div>
          <div className="text-xs text-up-dim">{t.settings.connectedVia}</div>
        </div>
      </div>

      <Field label={t.settings.timezone}>
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={tz}
            onChange={(e) => update(setTz)(e.target.value)}
            className="h-9 w-full max-w-xs rounded-sm border border-up-line bg-black/50 px-2 text-sm text-up-text focus-visible:border-up-orange focus-visible:outline-none"
          >
            {TZ_GROUPS.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {detected && detected !== tz && (
            <button
              type="button"
              onClick={() => update(setTz)(detected)}
              className="text-xs text-up-orange underline underline-offset-4 transition-colors hover:text-up-text"
            >
              {t.settings.useBrowser}
            </button>
          )}
        </div>
      </Field>

      <Field label={t.settings.emailLabel} hint={t.settings.emailHint}>
        <input
          type="email"
          value={email}
          onChange={(e) => update(setEmail)(e.target.value)}
          placeholder={discordEmail ?? t.settings.emailPlaceholder}
          className="h-9 w-full max-w-sm rounded-sm border border-up-line bg-black/50 px-3 text-sm text-up-text placeholder:text-up-dim focus-visible:border-up-orange focus-visible:outline-none"
        />
      </Field>

      <Field label={t.settings.machineClass} hint={t.settings.machineHint}>
        <div className="grid gap-2 md:grid-cols-2">
          {TIERS.map((tier) => {
            const active = hwTier === tier.id
            return (
              <button
                key={tier.id}
                type="button"
                onClick={() => update(setHwTier)(tier.id)}
                className={`flex flex-col gap-1 rounded-sm border px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'border-up-orange bg-up-orange/10'
                    : 'border-up-line hover:border-up-orange'
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className={`font-mono text-xs ${active ? 'text-up-orange' : 'text-up-dim'}`}
                  >
                    {tier.codename}
                  </span>
                  {active && (
                    <span className="text-xs text-up-orange">{t.settings.selected}</span>
                  )}
                </div>
                <div className={`text-sm ${active ? 'text-up-text' : 'text-up-dim'}`}>
                  {tier.title}
                </div>
                <div className="text-xs leading-snug text-up-dim">{tier.body}</div>
              </button>
            )
          })}
        </div>
      </Field>

      <div className="mt-6 flex items-center justify-between border-t border-up-line pt-4">
        <span className={`text-xs ${dirty ? 'text-up-amber' : 'text-up-dim'}`}>
          {dirty ? t.settings.unsavedChanges : t.settings.allSynced}
        </span>
        <Button onClick={save} disabled={saving || !dirty} size="sm">
          {saving ? t.common.saving : t.common.save}
        </Button>
      </div>
    </SettingsCard>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-up-line py-5 last:border-b-0 first:pt-0">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label className="text-sm text-up-text">{label}</label>
        {hint && <span className="text-xs text-up-dim">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
