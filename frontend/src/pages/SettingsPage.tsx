import { useMySettings } from '@/features/users/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { InviteLinkSection } from '@/components/invite/InviteLinkSection'
import { useTitle } from '@/lib/useTitle'
import { useT } from '@/i18n'
import { PreferencesSection } from './settings/PreferencesSection'
import { SteamLibrarySection } from './settings/SteamLibrarySection'
import { DangerZoneSection } from './settings/DangerZoneSection'

export function SettingsPage() {
  const t = useT()
  useTitle(t.settings.title)
  const me = useMe()
  const settings = useMySettings()

  return (
    <div className="mx-auto max-w-3xl pb-24">
      <header className="mb-8">
        <h1 className="font-display text-3xl text-up-text">{t.settings.title}</h1>
        <p className="mt-1 text-sm text-up-dim">
          {t.settings.subtitle}
        </p>
      </header>

      {settings.isLoading && <Loading />}
      {settings.error && <ErrorBox error={settings.error} />}

      {!settings.isLoading && !settings.error && me.data && settings.data && (
        <div className="space-y-6">
          <PreferencesSection />
          <SteamLibrarySection />
          <InviteLinkSection />
          <DangerZoneSection />
        </div>
      )}
    </div>
  )
}
