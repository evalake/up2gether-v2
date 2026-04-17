import type { UseMutationResult } from '@tanstack/react-query'
import type { GroupWithStats } from '@/features/groups/api'
import { useToast } from '@/components/ui/toast'
import { WebhookSection } from './WebhookSection'
import { useT } from '@/i18n'

export function ConfigTab({
  group,
  sync,
}: {
  group: GroupWithStats
  sync: UseMutationResult<unknown, Error, string>
}) {
  const t = useT()
  const toast = useToast()
  return (
    <>
      <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-up-dim">{t.admin.discordVisual}</div>
            <p className="mt-1 text-[11px] text-up-dim">
              {t.admin.discordVisualHint}
            </p>
            <div className="mt-3 flex items-center gap-3">
              {group.icon_url && (
                <img loading="lazy" src={group.icon_url} alt="" className="h-12 w-12 rounded-sm border border-up-line object-cover" />
              )}
              <div className="flex flex-col gap-0.5 text-[10px] text-up-dim">
                <span>{t.admin.iconStatus(!!group.icon_url)}</span>
                <span>{t.admin.bannerStatus(!!group.banner_url)}</span>
                <span>{t.admin.splashStatus(!!group.splash_url)}</span>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await sync.mutateAsync(group.id)
                toast.success(t.admin.visualsSynced)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : t.common.syncFail)
              }
            }}
            disabled={sync.isPending}
            className="shrink-0 rounded-sm border border-up-orange/60 bg-up-orange/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/20 disabled:opacity-40"
          >
            {sync.isPending ? t.common.syncing : t.common.sync}
          </button>
        </div>
      </section>
      <WebhookSection groupId={group.id} current={group.webhook_url} />
    </>
  )
}
