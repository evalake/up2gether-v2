import type { UseMutationResult } from '@tanstack/react-query'
import type { GroupWithStats } from '@/features/groups/api'
import { useToast } from '@/components/ui/toast'
import { WebhookSection } from './WebhookSection'

export function ConfigTab({
  group,
  sync,
}: {
  group: GroupWithStats
  sync: UseMutationResult<unknown, Error, string>
}) {
  const toast = useToast()
  return (
    <>
      <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Visual do Discord</div>
            <p className="mt-1 text-[11px] text-nerv-dim/80">
              Puxa ícone, banner, splash e descrição direto do servidor no Discord. Banner/splash só aparecem se o servidor tiver esses recursos habilitados (boosts).
            </p>
            <div className="mt-3 flex items-center gap-3">
              {group.icon_url && (
                <img loading="lazy" src={group.icon_url} alt="" className="h-12 w-12 rounded-sm border border-nerv-line object-cover" />
              )}
              <div className="flex flex-col gap-0.5 text-[10px] text-nerv-dim">
                <span>icone: {group.icon_url ? 'ok' : '--'}</span>
                <span>banner: {group.banner_url ? 'ok' : '--'}</span>
                <span>splash: {group.splash_url ? 'ok' : '--'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await sync.mutateAsync(group.id)
                toast.success('visuais sincronizados')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'falha ao sincronizar')
              }
            }}
            disabled={sync.isPending}
            className="shrink-0 rounded-sm border border-nerv-orange/60 bg-nerv-orange/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/20 disabled:opacity-40"
          >
            {sync.isPending ? 'sincronizando...' : 'sincronizar'}
          </button>
        </div>
      </section>
      <WebhookSection groupId={group.id} current={group.webhook_url} />
    </>
  )
}
