import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useCancelCycle,
  useCastVote,
  useCloseCycle,
  useCurrentTheme,
  useCycle,
  useDeleteSuggestion,
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
  const delSug = useDeleteSuggestion(id)
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

  const onOpenCycle = async () => {
    try { await openC.mutateAsync(); toast.success(decided ? 'reaberto' : 'ciclo aberto') }
    catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
  }

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-nerv-text">tema do mês</h1>
          <p className="mt-1 text-xs text-nerv-dim">um foco coletivo · qualquer um sugere, edita, vota e encerra</p>
        </div>
        {!hasActive && ((cycle.data ? isAdmin : isStaff)) && (
          <button
            onClick={onOpenCycle}
            disabled={openC.isPending}
            className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
          >
            {openC.isPending ? 'abrindo' : decided ? 'reabrir e sobrescrever' : current.data ? 'iniciar novo ciclo' : 'iniciar ciclo'}
          </button>
        )}
      </header>

      {(cycle.isLoading || current.isLoading) && <Loading />}
      {cycle.error && <ErrorBox error={cycle.error} />}

      {/* hero do tema decidido */}
      {current.data && (!cycle.data || cycle.data.phase === 'decided') && (
        <CurrentThemeHero theme={current.data} onReopen={onOpenCycle} reopening={openC.isPending} canReopen={isAdmin} />
      )}

      {/* ciclo ativo (voting) ou reaberto */}
      {cycle.data && cycle.data.phase !== 'cancelled' && cycle.data.phase !== 'decided' && (
        <>
        <div className="flex justify-end">
          <button
            onClick={() => setAuditTarget({ cycleId: cycle.data!.id })}
            className="rounded-sm border border-nerv-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-orange"
          >
            audit
          </button>
        </div>
        <CycleSection
          cycle={cycle.data}
          isStaff={isStaff}
          isAdmin={isAdmin}
          isSysAdmin={isSysAdmin}
          meId={me.data?.id ?? null}
          onSubmitSuggestion={async (input) => {
            try {
              await upsert.mutateAsync({ cycleId: cycle.data!.id, input })
              toast.success('sugestão salva')
            } catch (e) {
              toast.error(e instanceof Error ? e.message : 'falha')
            }
          }}
          onDeleteSuggestion={async () => {
            try { await delSug.mutateAsync(cycle.data!.id); toast.success('removida') }
            catch (e) { toast.error(e instanceof Error ? e.message : 'falha') }
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
        </>
      )}

      {!current.data && !cycle.data && (
        <EmptyState
          glyph="✦"
          title="nenhum tema definido"
          hint="abra o ciclo mensal pro grupo sugerir nomes e votar no tema do mês."
        />
      )}

      {past.length > 0 && (
        <section className="space-y-4">
          <button
            onClick={() => setOpenHistory((v) => !v)}
            className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
          >
            <span className="text-nerv-orange">{openHistory ? '−' : '+'}</span>
            <span>histórico</span>
            <span className="tabular-nums text-nerv-orange">{past.length}</span>
          </button>
          {openHistory && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {past.map((t) => (
                <button
                  type="button"
                  onClick={() => setAuditTarget({ themeId: t.id })}
                  key={t.id}
                  className="group relative overflow-hidden rounded-sm border border-nerv-line/50 bg-nerv-panel/30 text-left transition-all hover:-translate-y-0.5 hover:border-nerv-orange/40"
                >
                  {t.image_url && (
                    <div className="relative h-28 w-full overflow-hidden">
                      <img
                        src={t.image_url}
                        alt=""
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        className="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-100"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/50 to-transparent" />
                    </div>
                  )}
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">{t.month_year}</div>
                      <div className="mt-1 truncate font-display text-lg text-nerv-orange/90">{t.theme_name}</div>
                      {t.description && (
                        <p className="mt-2 line-clamp-2 text-xs text-nerv-text/60">{t.description}</p>
                      )}
                    </div>
                    {isStaff && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => { e.stopPropagation(); del.mutate(t.id) }}
                        className="shrink-0 cursor-pointer text-[10px] uppercase tracking-wider text-transparent transition-colors group-hover:text-nerv-dim hover:!text-nerv-red"
                      >
                        remover
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {showTiebreak && (
          <TiebreakOverlay data={showTiebreak} onClose={() => setShowTiebreak(null)} />
        )}
      </AnimatePresence>
      {auditTarget && (
        <ThemeAuditModal
          groupId={id}
          themeId={auditTarget.themeId}
          cycleId={auditTarget.cycleId}
          onClose={() => setAuditTarget(null)}
        />
      )}
    </div>
  )
}

function CurrentThemeHero({
  theme,
  onReopen,
  reopening,
  canReopen,
}: {
  theme: { month_year: string; theme_name: string; description: string | null; image_url: string | null }
  onReopen: () => void
  reopening: boolean
  canReopen: boolean
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-sm border border-nerv-orange/30 bg-nerv-panel/40"
    >
      {theme.image_url && (
        <div className="absolute inset-0">
          <img
            src={theme.image_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-nerv-panel via-nerv-panel/70 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel/90 to-transparent" />
        </div>
      )}
      <div className="relative flex flex-col gap-5 p-8 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-magenta">tema vigente · {theme.month_year}</div>
          <div className="mt-2 font-display text-4xl text-nerv-orange sm:text-5xl">{theme.theme_name}</div>
          {theme.description && (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nerv-text/80">{theme.description}</p>
          )}
        </div>
        {canReopen && (
          <div className="shrink-0">
            <button
              onClick={onReopen}
              disabled={reopening}
              className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
            >
              {reopening ? 'reabrindo' : 'reabrir e sobrescrever'}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  )
}

