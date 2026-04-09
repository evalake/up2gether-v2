import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames } from '@/features/games/hooks'
import {
  useCloseVote,
  useCreateVote,
  useSubmitBallot,
  useVotes,
} from '@/features/votes/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import { VoteAuditModal } from '@/components/votes/VoteAuditModal'

type VoteRow = NonNullable<ReturnType<typeof useVotes>['data']>[number]

export function VotesPage() {
  const { id = '' } = useParams()
  const votes = useVotes(id)
  const games = useGames(id)
  const create = useCreateVote(id)
  const submit = useSubmitBallot(id)
  const close = useCloseVote(id)
  const [draft, setDraft] = useState(false)
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const [openHistory, setOpenHistory] = useState(false)
  const [reveal, setReveal] = useState<{ vote: VoteRow; game: Game } | null>(null)
  const [auditId, setAuditId] = useState<string | null>(null)
  const toast = useToast()

  const togglePick = (gid: string) =>
    setPicked((p) => (p.includes(gid) ? p.filter((x) => x !== gid) : [...p, gid]))

  const onApprove = async (voteId: string, gid: string, currentApprovals: string[]) => {
    const next = currentApprovals.includes(gid)
      ? currentApprovals.filter((x) => x !== gid)
      : [...currentApprovals, gid]
    try {
      await submit.mutateAsync({ voteId, approvals: next })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao registrar voto')
    }
  }

  const onCreate = async () => {
    if (!title || picked.length < 2) return
    try {
      await create.mutateAsync({ title, candidate_game_ids: picked })
      setTitle('')
      setPicked([])
      setDraft(false)
      toast.success('votação criada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao criar votação')
    }
  }

  const gameOf = (gid: string) => games.data?.find((g) => g.id === gid)

  // preload covers de todos candidatos de votacoes abertas + vencedores fechados
  // pra que quando o reveal rolar a imagem ja esteja em cache
  useEffect(() => {
    if (!votes.data || !games.data) return
    const urls = new Set<string>()
    for (const v of votes.data) {
      for (const cid of v.candidate_game_ids) {
        const g = gameOf(cid)
        if (!g) continue
        const hdr = steamHeaderLarge(g.steam_appid)
        if (hdr) urls.add(hdr)
        const c = steamCover(g)
        if (c) urls.add(c)
      }
    }
    urls.forEach((u) => { const img = new Image(); img.src = u })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes.data, games.data])

  const onClose = async (v: VoteRow) => {
    try {
      const closed = await close.mutateAsync(v.id)
      const winnerGame = closed.winner_game_id ? gameOf(closed.winner_game_id) : null
      if (winnerGame) {
        setReveal({ vote: closed, game: winnerGame })
      } else {
        toast.success('encerrada sem vencedor')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao encerrar')
    }
  }

  // detecta auto-close (quando todos votaram, timer venceu, etc) e dispara
  // a mesma animacao do encerrar manual. guarda os ids ja revelados pra
  // nao mostrar de novo no proximo poll.
  const seenClosedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!votes.data) return
    if (seenClosedRef.current.size === 0) {
      // primeira carga: marca tudo como ja visto pra nao replay historico
      for (const v of votes.data) if (v.status !== 'open') seenClosedRef.current.add(v.id)
      return
    }
    for (const v of votes.data) {
      if (v.status === 'open') continue
      if (seenClosedRef.current.has(v.id)) continue
      seenClosedRef.current.add(v.id)
      const winner = v.winner_game_id ? gameOf(v.winner_game_id) : null
      if (winner && !reveal) {
        setReveal({ vote: v, game: winner })
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes.data])

  const { open, closed } = useMemo(() => {
    const all = votes.data ?? []
    return {
      open: all.filter((v) => v.status === 'open'),
      closed: all.filter((v) => v.status !== 'open'),
    }
  }, [votes.data])

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-nerv-text">votações</h1>
          <p className="mt-1 text-xs text-nerv-dim">decida com o grupo o próximo jogo</p>
        </div>
        <button
          onClick={() => setDraft(true)}
          className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/25"
        >
          nova votação
        </button>
      </header>

      {votes.isLoading && <Loading />}
      {votes.error && <ErrorBox error={votes.error} />}

      {open.length === 0 && closed.length === 0 && !votes.isLoading && (
        <p className="text-sm text-nerv-dim">nenhuma votação ainda. clique em "nova votação" pra começar.</p>
      )}

      {open.length === 0 && closed.length > 0 && (
        <LastClosedPreview
          vote={closed[0]}
          game={closed[0].winner_game_id ? gameOf(closed[0].winner_game_id) ?? null : null}
        />
      )}

      {open.length > 0 && (
        <section className="space-y-6">
          {open.map((v) => (
            <VoteCard
              key={v.id}
              v={v}
              gameOf={gameOf}
              onApprove={(gid) => onApprove(v.id, gid, v.your_approvals)}
              onClose={() => onClose(v)}
              onAudit={() => setAuditId(v.id)}
            />
          ))}
        </section>
      )}

      {closed.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setOpenHistory((x) => !x)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-nerv-dim hover:text-nerv-orange"
          >
            <span>{openHistory ? '−' : '+'}</span>
            <span>histórico</span>
            <span className="text-nerv-orange tabular-nums">{closed.length}</span>
          </button>
          {openHistory && (
            <div className="grid gap-3 sm:grid-cols-2">
              {closed.map((v) => {
                const winner = v.winner_game_id ? gameOf(v.winner_game_id) : null
                const cover = winner ? steamCover(winner) : null
                return (
                  <button
                    key={v.id}
                    onClick={() => setAuditId(v.id)}
                    className="group relative flex gap-3 overflow-hidden rounded-sm border border-nerv-line/60 bg-nerv-panel/30 p-3 text-left transition-colors hover:border-nerv-orange/40"
                  >
                    {cover ? (
                      <img src={cover} alt="" className="h-20 w-32 shrink-0 rounded-sm object-cover" />
                    ) : (
                      <div className="h-20 w-32 shrink-0 rounded-sm bg-nerv-line/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-nerv-dim">votação encerrada</div>
                      <div className="mt-0.5 truncate text-sm text-nerv-text">{v.title}</div>
                      {winner ? (
                        <div className="mt-2">
                          <div className="text-[9px] uppercase tracking-wider text-nerv-green/80">vencedor</div>
                          <div className="truncate text-sm text-nerv-orange">{winner.name}</div>
                        </div>
                      ) : (
                        <div className="mt-2 text-xs text-nerv-dim">sem vencedor</div>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-nerv-dim">
                        <span><span className="text-nerv-text tabular-nums">{v.ballots_count}</span>/{v.eligible_voter_count} votos</span>
                        <span>{v.candidate_game_ids.length} candidatos</span>
                        <span className="text-nerv-orange">audit →</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {draft && (
          <DraftModal
            title={title}
            setTitle={setTitle}
            picked={picked}
            togglePick={togglePick}
            games={games.data ?? []}
            onCancel={() => { setDraft(false); setTitle(''); setPicked([]) }}
            onCreate={onCreate}
            isPending={create.isPending}
          />
        )}
      </AnimatePresence>

      {auditId && (
        <VoteAuditModal
          groupId={id}
          voteId={auditId}
          onClose={() => setAuditId(null)}
        />
      )}

      <AnimatePresence>
        {reveal && (
          <WinnerReveal
            game={reveal.game}
            vote={reveal.vote}
            candidates={reveal.vote.candidate_game_ids
              .map((cid) => gameOf(cid))
              .filter((g): g is Game => !!g)}
            onClose={() => setReveal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function VoteCard({
  v, gameOf, onApprove, onClose, onAudit,
}: {
  v: VoteRow
  gameOf: (gid: string) => Game | undefined
  onApprove: (gid: string) => void
  onClose: () => void
  onAudit: () => void
}) {
  const tallies = v.tallies ?? {}
  const totalVotes = Object.values(tallies).reduce((a, b) => a + b, 0)
  const maxCount = Math.max(...Object.values(tallies), 0)
  const youVoted = v.your_approvals.length > 0
  const participationPct = Math.round((v.ballots_count / Math.max(v.eligible_voter_count, 1)) * 100)
  const quorumPct = Math.round((v.ballots_count / Math.max(v.quorum_count, 1)) * 100)

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-nerv-magenta">
              {v.total_stages && v.total_stages > 1 && v.current_stage_number
                ? `fase ${v.current_stage_number}/${v.total_stages}`
                : 'votação aberta'}
            </span>
            {youVoted && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-full border border-nerv-green/50 bg-nerv-green/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-nerv-green"
              >
                ✓ você votou
              </motion.span>
            )}
          </div>
          <div className="mt-1 truncate text-lg text-nerv-text">{v.title}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAudit}
            className="rounded-sm border border-nerv-line px-3 py-1 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/60 hover:text-nerv-orange"
          >
            audit
          </button>
          <button
            onClick={onClose}
            className="rounded-sm border border-nerv-red/30 px-3 py-1 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
          >
            encerrar
          </button>
        </div>
      </div>

      {/* participation strip */}
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-nerv-dim">
        <span><span className="tabular-nums text-nerv-text">{v.ballots_count}</span>/<span className="tabular-nums">{v.eligible_voter_count}</span> votaram</span>
        <div className="h-1 max-w-[160px] flex-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${participationPct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className={`h-full ${quorumPct >= 100 ? 'bg-nerv-green' : 'bg-nerv-amber/70'}`}
          />
        </div>
        <span className={quorumPct >= 100 ? 'text-nerv-green' : 'text-nerv-amber'}>
          {quorumPct >= 100 ? 'quorum ok' : `quorum ${v.ballots_count}/${v.quorum_count}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {v.candidate_game_ids.map((gid) => {
          const g = gameOf(gid)
          const cover = g ? steamCover(g) : null
          const count = tallies[gid] ?? 0
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
          const leading = count > 0 && count === maxCount
          const youPicked = v.your_approvals.includes(gid)
          return (
            <motion.button
              key={gid}
              type="button"
              onClick={() => onApprove(gid)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-sm border bg-nerv-panel/50 p-2 text-left transition-colors ${
                youPicked
                  ? 'border-nerv-magenta shadow-[0_0_22px_rgba(255,0,102,0.18)]'
                  : leading
                  ? 'border-nerv-orange/80 shadow-[0_0_18px_rgba(255,102,0,0.15)]'
                  : 'border-nerv-line hover:border-nerv-orange/50'
              }`}
            >
              {cover ? (
                <img src={cover} alt="" className="h-12 w-20 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="h-12 w-20 shrink-0 rounded-sm bg-nerv-line/30" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-nerv-text">{g?.name ?? gid}</span>
                  {leading && !youPicked && (
                    <span className="shrink-0 rounded-sm bg-nerv-orange/90 px-1 text-[8px] uppercase tracking-wider text-black">top</span>
                  )}
                  {youPicked && (
                    <span className="shrink-0 text-[10px] text-nerv-magenta">✓</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                      className={`h-full ${youPicked ? 'bg-nerv-magenta' : leading ? 'bg-nerv-orange' : 'bg-nerv-amber/60'}`}
                    />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 1.4, color: '#ff6600' }}
                    animate={{ scale: 1, color: '#6a6a7a' }}
                    transition={{ duration: 0.4 }}
                    className="min-w-[14px] text-right text-[10px] tabular-nums"
                  >
                    {count}
                  </motion.span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {!youVoted && (
        <p className="text-[10px] uppercase tracking-wider text-nerv-dim">toque nos jogos pra registrar seu voto. da pra mudar a qualquer hora.</p>
      )}

      {/* eliminados em fases anteriores */}
      {(() => {
        if (!v.stages || v.stages.length <= 1 || !v.current_stage_number) return null
        const currentIds = new Set(v.candidate_game_ids)
        const eliminated: string[] = []
        for (const st of v.stages) {
          if (st.stage_number >= v.current_stage_number) continue
          for (const cid of st.candidate_game_ids) {
            if (!currentIds.has(cid) && !eliminated.includes(cid)) eliminated.push(cid)
          }
        }
        if (!eliminated.length) return null
        return (
          <details className="group rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">
              eliminados nas fases anteriores ({eliminated.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {eliminated.map((gid) => {
                const g = gameOf(gid)
                return (
                  <span
                    key={gid}
                    className="truncate rounded-sm border border-nerv-line/40 bg-nerv-panel/30 px-2 py-0.5 text-[10px] text-nerv-dim line-through"
                  >
                    {g?.name ?? gid.slice(0, 6)}
                  </span>
                )
              })}
            </div>
          </details>
        )
      })()}
    </motion.section>
  )
}

function LastClosedPreview({ vote, game }: { vote: VoteRow; game: Game | null }) {
  const cover = game ? steamCover(game) : null
  return (
    <section className="rounded-sm border border-nerv-line/60 bg-nerv-panel/20 p-4">
      <div className="text-[10px] uppercase tracking-wider text-nerv-dim">última votação encerrada</div>
      <div className="mt-3 flex items-center gap-4">
        {cover ? (
          <img src={cover} alt="" className="h-16 w-28 shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="h-16 w-28 shrink-0 rounded-sm bg-nerv-line/20" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-nerv-text/80">{vote.title}</div>
          {game ? (
            <div className="mt-1 truncate text-base text-nerv-orange">{game.name}</div>
          ) : (
            <div className="mt-1 text-xs text-nerv-dim">sem vencedor</div>
          )}
          <div className="mt-1 text-[10px] uppercase tracking-wider text-nerv-dim">
            {vote.ballots_count}/{vote.eligible_voter_count} votaram
          </div>
        </div>
      </div>
    </section>
  )
}

function DraftModal({
  title, setTitle, picked, togglePick, games, onCancel, onCreate, isPending,
}: {
  title: string
  setTitle: (s: string) => void
  picked: string[]
  togglePick: (gid: string) => void
  games: Game[]
  onCancel: () => void
  onCreate: () => void
  isPending: boolean
}) {
  const [query, setQuery] = useState('')
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const q = norm(query.trim())
  // selecionados sempre aparecem primeiro, mesmo se nao batem com a busca
  const filtered = q
    ? games.filter((g) => picked.includes(g.id) || norm(g.name).includes(q))
    : games
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg overflow-hidden rounded-sm border border-nerv-orange/30 bg-nerv-panel shadow-[0_0_60px_rgba(255,102,0,0.12)]"
      >
        <div className="border-b border-nerv-orange/15 px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-nerv-dim">nova votação</div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="qual jogo na sexta?"
            className="mt-1 h-9 w-full rounded-sm border-0 border-b border-nerv-line/40 bg-transparent px-0 text-base text-nerv-text focus:border-nerv-orange focus:outline-none"
          />
        </div>
        <div className="border-b border-nerv-orange/10 px-5 py-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar jogo..."
            className="h-8 w-full rounded-sm border border-nerv-line/30 bg-black/20 px-2 text-xs text-nerv-text placeholder:text-nerv-dim focus:border-nerv-orange/60 focus:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-nerv-dim">
            <span>candidatos · {picked.length} selecionados {picked.length < 2 && '(minimo 2)'}</span>
            {q && <span>{filtered.length} match{filtered.length === 1 ? '' : 'es'}</span>}
          </div>
          {filtered.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-nerv-dim">nenhum jogo pra "{query}"</div>
          ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {filtered.map((g) => {
              const on = picked.includes(g.id)
              const cover = steamCover(g)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => togglePick(g.id)}
                  className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-all ${
                    on ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange' : 'border-nerv-line text-nerv-text hover:border-nerv-orange/40'
                  }`}
                >
                  {cover && <img src={cover} alt="" className="h-6 w-10 shrink-0 rounded-sm object-cover" />}
                  <span className="truncate text-xs">{g.name}</span>
                </button>
              )
            })}
          </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-nerv-orange/15 bg-black/30 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            cancelar
          </button>
          <button
            onClick={onCreate}
            disabled={isPending || !title || picked.length < 2}
            className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/25 disabled:opacity-40"
          >
            {isPending ? 'criando...' : 'criar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function WinnerReveal({
  game, vote, candidates, onClose,
}: {
  game: Game
  vote: VoteRow
  candidates: Game[]
  onClose: () => void
}) {
  const cover = steamHeaderLarge(game.steam_appid) ?? steamCover(game)
  const [phase, setPhase] = useState<'scanning' | 'shuffling' | 'lockin' | 'winner'>('scanning')
  const [shuffleIdx, setShuffleIdx] = useState(0)
  const [imgReady, setImgReady] = useState(false)

  // preload cover grande (pode demorar alguns ms)
  useEffect(() => {
    if (!cover) { setImgReady(true); return }
    const img = new Image()
    img.onload = () => setImgReady(true)
    img.onerror = () => setImgReady(true)
    img.src = cover
  }, [cover])

  // fases: scanning (1.2s) -> shuffling (2.4s) -> lockin (0.7s) -> winner (fica ate fechar)
  useEffect(() => {
    const t1 = setTimeout(() => setPhase('shuffling'), 1200)
    const t2 = setTimeout(() => setPhase('lockin'), 1200 + 2400)
    const t3 = setTimeout(() => setPhase('winner'), 1200 + 2400 + 700)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [])

  // cicla entre candidatos na fase shuffling (acelera depois desacelera)
  useEffect(() => {
    if (phase !== 'shuffling' || candidates.length === 0) return
    let delay = 80
    let cancelled = false
    const tick = () => {
      if (cancelled) return
      setShuffleIdx((i) => (i + 1) % candidates.length)
      delay = Math.min(delay * 1.08, 220)
      setTimeout(tick, delay)
    }
    const id = setTimeout(tick, delay)
    return () => { cancelled = true; clearTimeout(id) }
  }, [phase, candidates.length])

  const showWinner = phase === 'winner' && imgReady
  const shown = phase === 'shuffling' && candidates.length > 0
    ? candidates[shuffleIdx]
    : game
  const shownCover = phase === 'shuffling'
    ? steamHeaderLarge(shown.steam_appid) ?? steamCover(shown)
    : cover

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={phase === 'winner' ? onClose : undefined}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      {/* scanlines overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_3px)]" />

      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-lg overflow-hidden rounded-sm border bg-nerv-panel transition-all ${
          showWinner
            ? 'border-nerv-orange shadow-[0_0_180px_rgba(255,102,0,0.55)]'
            : 'border-nerv-orange/40 shadow-[0_0_80px_rgba(255,102,0,0.25)]'
        }`}
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-nerv-orange/20 bg-black/40 px-4 py-2">
          <div className="flex items-center gap-2">
            <motion.span
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className={`h-1.5 w-1.5 rounded-full ${showWinner ? 'bg-nerv-orange' : 'bg-nerv-magenta'}`}
            />
            <span className="font-mono text-[9px] uppercase tracking-[0.25em] text-nerv-orange/80">
              {phase === 'scanning' && 'apurando votos...'}
              {phase === 'shuffling' && 'computando resultado...'}
              {phase === 'lockin' && 'finalizando...'}
              {phase === 'winner' && 'resultado final'}
            </span>
          </div>
          <span className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">{vote.title}</span>
        </div>

        {/* cover area */}
        <div className="relative aspect-[16/9] overflow-hidden bg-black">
          {/* scanning phase: pulsos animados */}
          <AnimatePresence mode="wait">
            {phase === 'scanning' && (
              <motion.div
                key="scan"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="text-center">
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-nerv-orange/60">
                    {vote.ballots_count} / {vote.eligible_voter_count} cédulas
                  </div>
                  <div className="mt-3 flex justify-center gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        animate={{ scaleY: [1, 2.2, 1] }}
                        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.12 }}
                        className="h-4 w-1 origin-bottom bg-nerv-orange"
                      />
                    ))}
                  </div>
                </div>
                {/* sweep line */}
                <motion.div
                  animate={{ y: ['0%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                  className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-nerv-orange to-transparent"
                />
              </motion.div>
            )}

            {(phase === 'shuffling' || phase === 'lockin' || phase === 'winner') && shownCover && (
              <motion.img
                key={shown.id + phase}
                src={shownCover}
                alt=""
                initial={{ opacity: 0, scale: 1.08 }}
                animate={{
                  opacity: showWinner ? 1 : phase === 'lockin' ? 0.9 : 0.75,
                  scale: showWinner ? 1 : 1.04,
                }}
                transition={{ duration: phase === 'shuffling' ? 0.08 : 0.4 }}
                className="h-full w-full object-cover"
              />
            )}
          </AnimatePresence>

          {/* glitch bars na fase shuffling */}
          {phase === 'shuffling' && (
            <>
              <motion.div
                animate={{ y: ['-5%', '105%'] }}
                transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-nerv-orange/20 to-transparent"
              />
              <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_4px,rgba(255,0,102,0.08)_4px,rgba(255,0,102,0.08)_5px)]" />
            </>
          )}

          {/* lockin flash */}
          {phase === 'lockin' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0.3, 1, 0] }}
              transition={{ duration: 0.7 }}
              className="absolute inset-0 bg-nerv-orange/80"
            />
          )}

          {/* winner sweep glow */}
          {showWinner && (
            <motion.div
              initial={{ x: '-120%' }}
              animate={{ x: '120%' }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/25 to-transparent"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-transparent to-transparent" />
        </div>

        {/* name area */}
        <div className="min-h-[72px] px-6 py-4 text-center">
          <AnimatePresence mode="wait">
            {phase === 'scanning' && (
              <motion.div
                key="scanning-name"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="font-mono text-xs uppercase tracking-[0.25em] text-nerv-dim"
              >
                calculando consenso
              </motion.div>
            )}
            {phase === 'shuffling' && (
              <motion.div
                key={'shuf-' + shown.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.08 }}
                className="font-display text-xl text-nerv-text/80"
              >
                {shown.name}
              </motion.div>
            )}
            {(phase === 'lockin' || phase === 'winner') && (
              <motion.div
                key="winner-name"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
              >
                <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-nerv-orange/70">vencedor</div>
                <div className="mt-0.5 font-display text-2xl text-nerv-orange">{game.name}</div>
                <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
                  {vote.ballots_count} / {vote.eligible_voter_count} votaram
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: showWinner ? 1 : 0.3 }}
          disabled={!showWinner}
          onClick={onClose}
          className="block w-full border-t border-nerv-orange/30 bg-black/40 py-3 font-mono text-[10px] uppercase tracking-[0.25em] text-nerv-orange transition-colors hover:bg-nerv-orange/15 disabled:cursor-wait"
        >
          {showWinner ? 'fechar' : 'aguarde...'}
        </motion.button>
      </motion.div>
    </motion.div>
  )
}
