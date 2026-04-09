import { useEffect, useMemo, useState } from 'react'
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
import { Avatar } from '@/components/nerv/Avatar'
import type { Cycle, Suggestion } from '@/features/themes/api'
import { ThemeAuditModal } from '@/components/themes/ThemeAuditModal'

export function ThemesPage() {
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
            className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-4 py-2 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
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
            className="rounded-sm border border-nerv-line px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-orange"
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
              className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-4 py-2 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
            >
              {reopening ? 'reabrindo' : 'reabrir e sobrescrever'}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  )
}

type CycleSectionProps = {
  cycle: Cycle
  isStaff: boolean
  isAdmin: boolean
  isSysAdmin: boolean
  meId: string | null
  onSubmitSuggestion: (input: { name: string; description: string | null; image_url: string | null }) => Promise<void>
  onDeleteSuggestion: () => Promise<void>
  onDeleteAny: (suggestionId: string) => Promise<void>
  onVote: (suggestionId: string) => Promise<void>
  onClose: () => Promise<void>
  onForce: (suggestionId: string) => Promise<void>
  onCancel: () => Promise<void>
}

function CycleSection({ cycle, isStaff, isAdmin, isSysAdmin, meId, onSubmitSuggestion, onDeleteSuggestion, onDeleteAny, onVote, onClose, onForce, onCancel }: CycleSectionProps) {
  const mySug = cycle.suggestions.find((s) => s.user_id === meId) ?? null
  const [editing, setEditing] = useState(!mySug)
  const [name, setName] = useState(mySug?.name ?? '')
  const [desc, setDesc] = useState(mySug?.description ?? '')
  const [imageUrl, setImageUrl] = useState(mySug?.image_url ?? '')

  useEffect(() => {
    setName(mySug?.name ?? '')
    setDesc(mySug?.description ?? '')
    setImageUrl(mySug?.image_url ?? '')
    setEditing(!mySug)
  }, [mySug?.id])

  const maxVotes = useMemo(
    () => cycle.suggestions.reduce((acc, s) => Math.max(acc, s.vote_count), 0),
    [cycle.suggestions],
  )

  const submit = async () => {
    if (!name.trim()) return
    await onSubmitSuggestion({ name: name.trim(), description: desc.trim() || null, image_url: imageUrl.trim() || null })
    setEditing(false)
  }

  return (
    <section className="space-y-6 rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-nerv-line/40 pb-4">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-magenta">ciclo aberto · sugira e vote</div>
          <div className="mt-1 font-display text-xl text-nerv-text">{cycle.month_year}</div>
          <div className="mt-0.5 font-mono text-[10px] text-nerv-dim">
            {cycle.suggestions.length} sugestões · {cycle.total_votes} votos
          </div>
        </div>
        <div className="flex gap-2">
          {cycle.suggestions.length > 0 && isStaff && (
            <button
              onClick={onClose}
              className="rounded-sm border border-nerv-green/50 bg-nerv-green/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-green transition-colors hover:bg-nerv-green/20"
            >
              encerrar e decidir
            </button>
          )}
          {isAdmin && (
            <button
              onClick={onCancel}
              className="rounded-sm border border-nerv-red/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
            >
              cancelar
            </button>
          )}
        </div>
      </div>

      {/* minha sugestão */}
      <div className="rounded-sm border border-nerv-line/40 bg-black/30 p-4">
        <div className="mb-3 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">sua sugestão</div>
        {!editing && mySug ? (
          <div className="flex items-start gap-3">
            {mySug.image_url && (
              <img
                src={mySug.image_url}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                className="h-14 w-20 shrink-0 rounded-sm object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <div className="font-display text-base text-nerv-orange">{mySug.name}</div>
              {mySug.description && <p className="mt-0.5 text-xs text-nerv-text/70">{mySug.description}</p>}
            </div>
            <div className="flex shrink-0 gap-3">
              <button onClick={() => setEditing(true)} className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange">editar</button>
              <button onClick={onDeleteSuggestion} className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-red">remover</button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: souls-likes, indies, retro..."
              className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-3 text-sm transition-colors focus:border-nerv-orange focus:outline-none"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={2}
              placeholder="por que esse tema? (opcional)"
              className="w-full rounded-sm border border-nerv-line bg-black/40 px-3 py-2 text-xs transition-colors focus:border-nerv-orange focus:outline-none"
            />
            <div className="flex items-center gap-2">
              {imageUrl && (
                <img
                  src={imageUrl}
                  alt=""
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
                  className="h-9 w-14 shrink-0 rounded-sm border border-nerv-line object-cover"
                />
              )}
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="url de imagem (opcional)"
                className="h-8 flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs transition-colors focus:border-nerv-orange focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3">
              {mySug && (
                <button
                  onClick={() => { setEditing(false); setName(mySug.name); setDesc(mySug.description ?? ''); setImageUrl(mySug.image_url ?? '') }}
                  className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text"
                >
                  cancelar
                </button>
              )}
              <button
                onClick={submit}
                disabled={!name.trim()}
                className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
              >
                salvar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* grid de sugestões */}
      {cycle.suggestions.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {cycle.suggestions.map((s) => (
            <SuggestionCard
              key={s.id}
              s={s}
              cycle={cycle}
              meId={meId}
              isStaff={isStaff}
              isAdmin={isAdmin}
              isSysAdmin={isSysAdmin}
              maxVotes={maxVotes}
              onVote={() => onVote(s.id)}
              onForce={() => onForce(s.id)}
              onDelete={() => onDeleteAny(s.id)}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function SuggestionCard({ s, cycle, meId, isStaff, isAdmin, maxVotes, onVote, onForce, onDelete }: {
  s: Suggestion
  cycle: Cycle
  meId: string | null
  isStaff: boolean
  isAdmin: boolean
  isSysAdmin: boolean
  maxVotes: number
  onVote: () => void
  onForce: () => void
  onDelete: () => void
}) {
  const isMine = s.user_id === meId
  const voted = cycle.user_vote_suggestion_id === s.id
  const pct = maxVotes > 0 ? Math.round((s.vote_count / maxVotes) * 100) : 0
  return (
    <motion.div
      layout
      className={`group relative overflow-hidden rounded-sm border bg-nerv-panel/40 transition-all ${
        voted
          ? 'border-nerv-magenta/70 ring-1 ring-nerv-magenta/30'
          : 'border-nerv-line/40 hover:-translate-y-0.5 hover:border-nerv-orange/40'
      }`}
    >
      {s.image_url && (
        <div className="relative h-28 w-full overflow-hidden">
          <img
            src={s.image_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/40 to-transparent" />
        </div>
      )}
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-display text-lg text-nerv-orange">{s.name}</div>
            {s.description && <p className="mt-1 line-clamp-2 text-xs text-nerv-text/70">{s.description}</p>}
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-2xl tabular-nums text-nerv-magenta">{s.vote_count}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">votos</div>
          </div>
        </div>

        {/* vote bar */}
        <div className="h-1 w-full overflow-hidden rounded-full bg-nerv-line/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-nerv-orange to-nerv-magenta"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-nerv-dim">
            <Avatar discordId={s.user_discord_id} hash={s.user_avatar} name={s.user_name ?? '?'} size="sm" />
            <span className="truncate">{s.user_name ?? '...'}</span>
            {isMine && <span className="uppercase tracking-wider text-nerv-orange">· você</span>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={onVote}
              className={`rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                voted
                  ? 'border-nerv-magenta bg-nerv-magenta/20 text-nerv-magenta'
                  : 'border-nerv-line text-nerv-dim hover:border-nerv-magenta/60 hover:text-nerv-magenta'
              }`}
            >
              {voted ? '✓ votado' : 'votar'}
            </button>
            {isAdmin && (
              <button
                onClick={onForce}
                title="forçar como vencedor"
                className="rounded-sm border border-nerv-line px-2 py-1 text-[10px] text-nerv-dim transition-colors hover:border-nerv-amber/60 hover:text-nerv-amber"
              >
                ★
              </button>
            )}
            {(isMine || isStaff) && (
              <button
                onClick={onDelete}
                title="remover"
                className="rounded-sm border border-nerv-line px-2 py-1 text-[10px] text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function TiebreakOverlay({ data, onClose }: { data: { kind: string; tied: Suggestion[]; winner: Suggestion }; onClose: () => void }) {
  const isTiebreak = data.kind.startsWith('tiebreak')
  const [stage, setStage] = useState<'spin' | 'reveal'>(isTiebreak ? 'spin' : 'spin')
  useEffect(() => {
    const delay = data.kind === 'tiebreak_coin' ? 1800 : isTiebreak ? 2500 : 3800
    const t = setTimeout(() => setStage('reveal'), delay)
    return () => clearTimeout(t)
  }, [data.kind, isTiebreak])

  // preload winner image
  useEffect(() => {
    if (data.winner.image_url) {
      const img = new Image()
      img.src = data.winner.image_url
    }
  }, [data.winner.image_url])

  const headerLabel = isTiebreak
    ? (data.kind === 'tiebreak_coin' ? 'empate · cara ou coroa' : 'empate · roleta')
    : data.kind === 'admin' ? 'decisão do admin' : 'apurando votos...'

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-6 backdrop-blur-md"
      onClick={stage === 'reveal' ? onClose : undefined}
    >
      {/* scanlines */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]" />
      <div className="relative w-full max-w-md text-center">
        <div className="mb-4 font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-magenta">
          {headerLabel}
        </div>
        {stage === 'spin' && isTiebreak ? (
          <motion.div
            animate={
              data.kind === 'tiebreak_coin'
                ? { rotateY: [0, 1080], scale: [1, 1.1, 1] }
                : { rotate: [0, 1440] }
            }
            transition={{ duration: data.kind === 'tiebreak_coin' ? 1.6 : 2.3, ease: 'easeOut' }}
            className="mx-auto grid h-40 w-40 place-items-center rounded-full border-2 border-nerv-orange/60 bg-nerv-panel/60 font-display text-5xl text-nerv-orange"
          >
            ?
          </motion.div>
        ) : stage === 'spin' && !isTiebreak ? (
          <div className="mx-auto flex h-40 w-full max-w-sm flex-col items-center justify-center gap-3 rounded-sm border border-nerv-orange/40 bg-nerv-panel/60">
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.div
                  key={i}
                  animate={{ scaleY: [1, 2.4, 1] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                  className="h-5 w-1 origin-bottom bg-nerv-magenta"
                />
              ))}
            </div>
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-nerv-dim">calculando consenso</div>
            <motion.div
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="h-px w-32 bg-gradient-to-r from-transparent via-nerv-magenta to-transparent"
            />
          </div>
        ) : (
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="mx-auto overflow-hidden rounded-sm border border-nerv-orange/60 bg-nerv-panel/80"
          >
            {data.winner.image_url && (
              <div className="h-32 w-full overflow-hidden">
                <img src={data.winner.image_url} alt="" className="h-full w-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-magenta">vencedor</div>
              <div className="mt-1 font-display text-2xl text-nerv-orange">{data.winner.name}</div>
              <div className="mt-1 font-mono text-[10px] text-nerv-dim">sugerido por {data.winner.user_name ?? '?'}</div>
            </div>
          </motion.div>
        )}
        {data.tied.length > 0 && (
          <div className="mt-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            {data.tied.length} empatados
          </div>
        )}
        {stage === 'reveal' && (
          <button onClick={onClose} className="mt-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange">
            fechar
          </button>
        )}
      </div>
    </motion.div>
  )
}
