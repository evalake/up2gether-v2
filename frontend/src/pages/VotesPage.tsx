import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useT } from '@/i18n'
import { useGames } from '@/features/games/hooks'
import {
  useCloseVote,
  useCreateVote,
  useSubmitBallot,
  useVotes,
} from '@/features/votes/hooks'
import { VoteListSkeleton } from '@/components/ui/CardSkeletons'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import { VoteAuditModal } from '@/components/votes/VoteAuditModal'
import { useTitle } from '@/lib/useTitle'
import { VoteCard, LastClosedPreview } from './votes/VoteCard'
import { DraftModal } from './votes/DraftModal'
import { WinnerReveal } from './votes/WinnerReveal'
import { VoteHistory } from './votes/VoteHistory'

type VoteRow = NonNullable<ReturnType<typeof useVotes>['data']>[number]

export function VotesPage() {
  const t = useT()
  useTitle('votacoes')
  const { id = '' } = useParams()
  const votes = useVotes(id)
  const games = useGames(id)
  const create = useCreateVote(id)
  const submit = useSubmitBallot(id)
  const close = useCloseVote(id)
  const [draft, setDraft] = useState(false)
  const [title, setTitle] = useState('')
  const [picked, setPicked] = useState<string[]>([])
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
      toast.error(e instanceof Error ? e.message : t.votes.voteFail)
    }
  }

  const onCreate = async () => {
    if (!title || picked.length < 2) return
    try {
      await create.mutateAsync({ title, candidate_game_ids: picked })
      setTitle('')
      setPicked([])
      setDraft(false)
      toast.success(t.votes.voteCreated)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.votes.createFail)
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
        toast.success(t.votes.closedNoWinner)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.votes.closeFail)
    }
  }

  // detecta auto-close (quorum ou admin) e dispara reveal
  const seenClosedRef = useRef<Set<string>>(new Set())
  const seededRef = useRef(false)
  const pendingRevealRef = useRef<{ vote: VoteRow; game: Game } | null>(null)
  useEffect(() => {
    if (!votes.data) return
    // seed pass: marca tudo que ja veio fechado na 1a carga pra nao revelar retroativo.
    // size===0 nao da: grupo sem historico nunca seedaria e 1o fechamento ficava silent.
    if (!seededRef.current) {
      seededRef.current = true
      for (const v of votes.data) if (v.status !== 'open') seenClosedRef.current.add(v.id)
      return
    }
    for (const v of votes.data) {
      if (v.status === 'open') continue
      if (seenClosedRef.current.has(v.id)) continue
      seenClosedRef.current.add(v.id)
      const winner = v.winner_game_id ? gameOf(v.winner_game_id) : null
      if (winner) {
        if (!reveal) {
          setReveal({ vote: v, game: winner })
        } else {
          pendingRevealRef.current = { vote: v, game: winner }
        }
        break
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [votes.data])

  // quando fecha o reveal atual, mostra o pendente se tiver
  useEffect(() => {
    if (!reveal && pendingRevealRef.current) {
      setReveal(pendingRevealRef.current)
      pendingRevealRef.current = null
    }
  }, [reveal])

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
          <h1 className="font-display text-3xl text-up-text">{t.votes.title}</h1>
          <p className="mt-1 text-xs text-up-dim">{t.votes.subtitle}</p>
        </div>
        <button
          onClick={() => setDraft(true)}
          disabled={(games.data?.filter(g => !g.archived_at).length ?? 0) < 2}
          title={(games.data?.filter(g => !g.archived_at).length ?? 0) < 2 ? t.votes.needMinGames : undefined}
          className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.votes.newVote}
        </button>
      </header>

      {votes.isLoading && <VoteListSkeleton count={3} />}
      {votes.error && <ErrorBox error={votes.error} />}

      {open.length === 0 && closed.length === 0 && !votes.isLoading && (() => {
        const activeGames = games.data?.filter((g) => !g.archived_at).length ?? 0
        const needsGames = activeGames < 2
        return (
          <EmptyState
            glyph="▲"
            title={t.votes.noVotesYet}
            hint={needsGames
              ? t.votes.noVotesHint(activeGames)
              : t.votes.noVotesSubhint}
            action={needsGames ? (
              <Link
                to={`/groups/${id}/games`}
                className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25"
              >
                {t.votes.goToLibrary}
              </Link>
            ) : (
              <button
                onClick={() => setDraft(true)}
                className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25"
              >
                {t.votes.openFirstVote}
              </button>
            )}
          />
        )
      })()}

      {open.length === 0 && closed.length > 0 && (
        <LastClosedPreview
          vote={closed[0]}
          game={closed[0].winner_game_id ? gameOf(closed[0].winner_game_id) ?? null : null}
          onAudit={() => setAuditId(closed[0].id)}
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

      <VoteHistory closed={closed} gameOf={gameOf} onAudit={setAuditId} />

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

      <VoteAuditModal
        groupId={id}
        voteId={auditId}
        onClose={() => setAuditId(null)}
      />

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
