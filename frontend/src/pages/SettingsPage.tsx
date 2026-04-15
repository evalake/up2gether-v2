import { useEffect, useState } from 'react'
import { useMySettings, usePatchSettings, useSetHardware } from '@/features/users/hooks'
import { useMe } from '@/features/auth/hooks'
import type { HardwareTier } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/nerv/Button'
import { KanjiLabel } from '@/components/nerv/KanjiLabel'
import { InviteLinkSection } from '@/components/invite/InviteLinkSection'
import { useTitle } from '@/lib/useTitle'
import { PreferencesSection } from './settings/PreferencesSection'
import { SteamLibrarySection } from './settings/SteamLibrarySection'
import { PushNotificationsSection } from './settings/PushNotificationsSection'
import { DangerZoneSection } from './settings/DangerZoneSection'

export function SettingsPage() {
  useTitle('config')
  const me = useMe()
  const settings = useMySettings()
  const patch = usePatchSettings()
  const setHw = useSetHardware()
  const toast = useToast()

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

      <PreferencesSection
        name={name}
        discordId={me.data?.discord_id}
        discordAvatar={me.data?.discord_avatar}
        discordEmail={(me.data as any)?.discord_email}
        tz={tz}
        email={email}
        hwTier={hwTier}
        setTz={mark(setTz)}
        setEmail={mark(setEmail)}
        setHwTier={mark(setHwTier)}
      />

      <SteamLibrarySection />
      <PushNotificationsSection />
      <InviteLinkSection />

      <div className="flex items-center justify-end gap-3">
        {dirty && <span className="text-[11px] text-nerv-amber">alterações não salvas</span>}
        <Button onClick={onSave} disabled={saving || !dirty}>
          {saving ? 'salvando...' : 'salvar'}
        </Button>
      </div>

      <DangerZoneSection />
    </div>
  )
}
