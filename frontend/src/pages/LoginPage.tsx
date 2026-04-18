import { DiscordLoginLink } from '@/features/auth/DiscordLoginLink'
import { Button } from '@/components/core/Button'
import { Panel } from '@/components/core/Panel'
import { HazardDivider } from '@/components/core/HazardDivider'
import { useT } from '@/i18n'

export function LoginPage() {
  const t = useT()
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-up-grid px-4">
      <div className="absolute inset-0 up-scan pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/up2gether-logo.png" alt="up2gether" className="mb-4 h-32 w-auto rounded-sm object-contain drop-shadow-[0_0_30px_rgba(255,102,0,0.35)]" />
          <div className="font-display text-3xl leading-none text-up-orange">up2gether</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-up-dim">
            {t.auth.tagline}
          </div>
        </div>

        <HazardDivider label={t.auth.accessGate} />

        <Panel label={t.auth.accessLabel} status="caution">
          <div className="space-y-4">
            <div className="font-mono text-xs leading-relaxed text-up-dim">
              <p className="text-up-green">{t.auth.systemReady}</p>
              <p className="text-up-green">{t.auth.awaitingId}</p>
              <p className="mt-2 text-up-amber">{t.auth.discordRequired}</p>
            </div>

            <DiscordLoginLink className="block">
              <Button className="w-full justify-center py-3" variant="primary">
                {t.auth.authenticate}
              </Button>
            </DiscordLoginLink>

            <div className="border-t border-up-line pt-3 text-center text-[10px] uppercase tracking-wider text-up-dim">
              {t.auth.versionLabel}
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
