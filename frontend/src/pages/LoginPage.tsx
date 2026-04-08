import { discordLoginUrl } from '@/features/auth/api'
import { Button } from '@/components/nerv/Button'
import { Panel } from '@/components/nerv/Panel'
import { HazardDivider } from '@/components/nerv/HazardDivider'

export function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-nerv-grid px-4">
      <div className="absolute inset-0 nerv-scan pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/up2gether-logo.png" alt="up2gether" className="mb-4 h-32 w-auto rounded-sm object-contain drop-shadow-[0_0_30px_rgba(255,102,0,0.35)]" />
          <div className="font-display text-3xl leading-none text-nerv-orange">up2gether</div>
          <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-nerv-dim">
            coordena, vota e joga junto
          </div>
        </div>

        <HazardDivider label="access gate" />

        <Panel label="access" status="caution">
          <div className="space-y-4">
            <div className="font-mono text-xs leading-relaxed text-nerv-dim">
              <p className="text-nerv-green">{'>'} system ready.</p>
              <p className="text-nerv-green">{'>'} awaiting identification.</p>
              <p className="mt-2 text-nerv-amber">! discord oauth required to proceed.</p>
            </div>

            <a href={discordLoginUrl()} className="block">
              <Button className="w-full justify-center py-3" variant="primary">
                authenticate with discord
              </Button>
            </a>

            <div className="border-t border-nerv-line pt-3 text-center text-[9px] uppercase tracking-wider text-nerv-dim">
              up2gether v2
            </div>
          </div>
        </Panel>
      </div>
    </div>
  )
}
