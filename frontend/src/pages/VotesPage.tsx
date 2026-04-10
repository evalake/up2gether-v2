import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useGames } from '@/features/games/hooks'
import {
  useCloseVote,
  useCreateVote,
  useSubmitBallot,
  useVotes,
} from '@/features/votes/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import { VoteAuditModal } from '@/components/votes/VoteAuditModal'
import { VoteCard, LastClosedPreview } from './votes/VoteCard'
import { DraftModal } from './votes/DraftModal'
import { WinnerReveal } from './votes/WinnerReveal'

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

  // preload covers
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

  // detecta auto-close e dispara reveal
  const seenClosedRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!votes.data) return
    if (seenClosedRef.current.size === 0) {
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
        <EmptyState
          glyph="▲"
          title="nenhuma votação ainda"
          hint="abre a primeira pro grupo decidir o que jogar. tudo que tem no acervo vira candidato."
        />
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
