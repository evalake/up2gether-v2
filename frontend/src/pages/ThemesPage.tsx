import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useCancelCycle,
  useCastVote,
  useCloseCycle,
  useCurrentTheme,
  useCycle,
  useDeleteSuggestionById,
  useDeleteTheme,
  useForceDecide,
  useOpenCycle,
  useThemes,
  useUpsertSuggestion,
} from '@/features/themes/hooks'
import { useGroup } from '@/features/groups/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import type { Suggestion } from '@/features/themes/api'
import { ThemeAuditModal } from '@/components/themes/ThemeAuditModal'
import { CycleSection } from './themes/CycleSection'
import { useTitle } from '@/lib/useTitle'
import { TiebreakOverlay } from './themes/TiebreakOverlay'

export function ThemesPage() {
  useTitle('tema do mes')
  const { id = '' } = useParams()
  const me = useMe()
  const group = useGroup(id)
  const current = useCurrentTheme(id)
  const list = useThemes(id)
  const cycle = useCycle(id)
  const del = useDeleteTheme(id)
  const openC = useOpenCycle(id)
  const upsert = useUpsertSuggestion(id)
  const delSugById = useDeleteSuggestionById(id)
  const vote = useCastVote(id)
  const closeC = useCloseCycle(id)
  const force = useForceDecide(id)
  const cancelC = useCancelCycle(id)
  const toast = useToast()

  const [openHistory, setOpenHistory] = useState(false)
  const [auditTarget, setAuditTarget] = useState<
    { themeId?: string; cycleId?: string } | null
  >(null)
  const isSysAdmin = !!me.data?.is_sys_admin
  const isAdmin = group.data?.user_role === 'admin' || isSysAdmin
  const isStaff = isAdmin || group.data?.user_role === 'mod'

  // tiebreak animation
  const [showTiebreak, setShowTiebreak] = useState<null | { kind: string; tied: Suggestion[]; winner: Suggestion }>(null)
  const [lastSeenPhase, setLastSeenPhase] = useState<string | null>(null)
  useEffect(() => {
    if (!cycle.data) return
    if (lastSeenPhase === null) {
      setLastSeenPhase(cycle.data.phase)
      return
    }
    if (lastSeenPhase !== 'decided' && cycle.data.phase === 'decided') {
      const winner = cycle.data.suggestions.find((s) => s.id === cycle.data!.winner_suggestion_id)
      if (winner) {
        const tied = cycle.data.tied_suggestion_ids
          ? cycle.data.suggestions.filter((s) => cycle.data!.tied_suggestion_ids!.includes(s.id))
          : []
        setShowTiebreak({ kind: cycle.data.tiebreak_kind ?? 'vote', tied, winner })
      }
    }
    setLastSeenPhase(cycle.data.phase)
  }, [cycle.data, lastSeenPhase])

  const past = (list.data ?? []).filter((t) => !current.data || t.id !== current.data.id)
  const decided = cycle.data?.phase === 'decided'
  const hasActive = cycle.data && cycle.data.phase !== 'cancelled' && cycle.data.phase !== 'decided'

  const monthLabel = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  const onOpenCycle = async () => {
    try { await openC.mutateAsync(); toast.success(decided ? 'ciclo reaberto' : 'ciclo aberto') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-up-text">tema do mês</h1>
          <p className="mt-1 text-xs text-up-dim">um foco coletivo · qualquer um sugere, edita, vota e encerra</p>
        </div>
        {!hasActive && ((cycle.data ? isAdmin : isStaff)) && (
          <button
            onClick={onOpenCycle}
            disabled={openC.isPending}
            className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:opacity-40"
          >
            {openC.isPending ? 'abrindo...' : decided ? 'reabrir ciclo' : 'abrir ciclo do mês'}
          </button>
        )}
      </header>

      {(cycle.isLoading || current.isLoading) && <Loading />}
      {cycle.error && <ErrorBox error={cycle.error} />}

      {/* hero do tema vigente */}
      {current.data && (!cycle.data || cycle.data.phase === 'decided') && (
        <CurrentThemeHero theme={current.data} />
      )}

      {/* ciclo ativo */}
      {cycle.data && cycle.data.phase !== 'cancelled' && cycle.data.phase !== 'decided' && (
        <CycleSection
          cycle={cycle.data}
          isStaff={isStaff}
          isAdmin={isAdmin}
          isSysAdmin={isSysAdmin}
          meId={me.data?.id ?? null}
          onAudit={() => setAuditTarget({ cycleId: cycle.data!.id })}
          onSubmitSuggestion={async (input) => {
            try {
              await upsert.mutateAsync({ cycleId: cycle.data!.id, input })
              toast.success('sugestão salva')
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'falha')
            }
          }}
          onDeleteAny={async (sid) => {
            if (!confirm('remover esta sugestão?')) return
            try { await delSugById.mutateAsync({ cycleId: cycle.data!.id, suggestionId: sid }); toast.success('removida') }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
          }}
          onVote={async (suggestionId) => {
            try { await vote.mutateAsync({ cycleId: cycle.data!.id, suggestionId }) }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
          }}
          onClose={async () => {
            try { await closeC.mutateAsync(cycle.data!.id) }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
          }}
          onForce={async (suggestionId) => {
            try { await force.mutateAsync({ cycleId: cycle.data!.id, suggestionId }); toast.success('decidido') }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
          }}
          onCancel={async () => {
            if (!confirm('cancelar este ciclo? todas as sugestões serão descartadas.')) return
            try { await cancelC.mutateAsync(cycle.data!.id); toast.success('cancelado') }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
          }}
        />
      )}

      {!current.data && !cycle.data && !cycle.isLoading && (
        <EmptyState
          glyph="✦"
          title="nenhum tema definido"
          hint={isStaff
            ? `abre o ciclo de ${monthLabel}. o fluxo: qualquer membro sugere um tema, o grupo vota, e staff encerra pra decidir o vencedor.`
            : `o ciclo de ${monthLabel} ainda não foi aberto. só admin ou mod pode iniciar.`}
          action={isStaff ? (
            <button
              onClick={onOpenCycle}
              disabled={openC.isPending}
              className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:opacity-40"
            >
              {openC.isPending ? 'abrindo...' : 'abrir primeiro ciclo'}
            </button>
          ) : undefined}
        />
      )}

      {past.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setOpenHistory((v) => !v)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
          >
            <span className="text-up-orange">{openHistory ? '−' : '+'}</span>
            <span>histórico</span>
            <span className="tabular-nums text-up-orange">{past.length}</span>
          </button>
          <AnimatePresence>
          {openHistory && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="grid gap-4 py-1 sm:grid-cols-2 lg:grid-cols-3">
                {past.map((t) => (
                  <button
                    type="button"
                    onClick={() => setAuditTarget({ themeId: t.id })}
                    key={t.id}
                    className="group relative z-0 overflow-hidden rounded-sm border border-up-line/50 bg-up-panel/30 text-left transition-[colors,box-shadow] duration-200 hover:z-10 hover:border-up-orange hover:shadow-[0_0_20px_rgba(255,102,0,0.12)]"
                  >
                    {t.image_url && (
                      <div className="relative h-28 w-full overflow-hidden">
                        <img
                          src={t.image_url}
                          alt=""
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/50 to-transparent" />
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-3 p-4">
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{t.month_year}</div>
                        <div className="mt-1 truncate font-display text-lg text-up-orange">{t.theme_name}</div>
                        {t.description && (
                          <p className="mt-2 line-clamp-2 text-xs text-up-dim">{t.description}</p>
                        )}
                      </div>
                      {isStaff && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); del.mutate(t.id) }}
                          className="shrink-0 text-[10px] uppercase tracking-wider text-transparent transition-colors group-hover:text-up-dim hover:!text-up-red"
                        >
                          remover
                        </button>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </section>
      )}

      <AnimatePresence>
        {showTiebreak && (
          <TiebreakOverlay data={showTiebreak} onClose={() => setShowTiebreak(null)} />
        )}
      </AnimatePresence>

      <ThemeAuditModal
        groupId={id}
        themeId={auditTarget?.themeId ?? null}
        cycleId={auditTarget?.cycleId ?? null}
        onClose={() => setAuditTarget(null)}
      />
    </div>
  )
}

function CurrentThemeHero({ theme }: {
  theme: { month_year: string; theme_name: string; description: string | null; image_url: string | null; decided_at: string }
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-sm border border-up-orange/30 bg-up-panel/40"
    >
      {theme.image_url && (
        <div className="absolute inset-0">
          <img
            src={theme.image_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-up-panel via-up-panel/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-up-panel/90 to-transparent" />
        </div>
      )}
      <div className="relative p-8">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-magenta">tema vigente</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{theme.month_year}</span>
          </div>
          <div className="mt-2 font-display text-4xl text-up-orange sm:text-5xl">{theme.theme_name}</div>
          {theme.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-up-text">{theme.description}</p>
          )}
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
            decidido em {new Date(theme.decided_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
