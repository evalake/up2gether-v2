import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGames } from '@/features/games/hooks'
import { useVotes, useDeleteVote } from '@/features/votes/hooks'
import { closeVote } from '@/features/votes/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'

export function VotesTab({ groupId }: { groupId: string }) {
  const t = useT()
  const votes = useVotes(groupId)
  const del = useDeleteVote(groupId)
  const toast = useToast()
  const qc = useQueryClient()
  const games = useGames(groupId)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const gameName = (gid: string | null) => {
    if (!gid) return null
    return games.data?.find((g) => g.id === gid)?.name ?? null
  }

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (votes.data ?? []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const filtered = query ? list.filter((v) => norm(v.title).includes(query)) : list

  const toggleOne = (vid: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(vid)) n.delete(vid)
      else n.add(vid)
      return n
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((v) => v.id)))
  }

  const deleteOne = async (vid: string) => {
    try {
      await del.mutateAsync(vid)
      toast.success(t.admin.voteDeleted)
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(vid)
        return n
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.fail)
    }
  }

  const deleteBulk = async () => {
    const ids = Array.from(selected)
    let ok = 0
    let fail = 0
    await Promise.all(
      ids.map(async (vid) => {
        try {
          await del.mutateAsync(vid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(t.admin.votesDeleted(ok, fail))
    else toast.error(t.admin.votesDeleted(ok, fail))
    setSelected(new Set())
    setBulkConfirm(false)
  }

  const forceClose = async (vid: string) => {
    try {
      await closeVote(groupId, vid)
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'votes'] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
      toast.success(t.admin.voteClosed)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.fail)
    }
  }

  if (votes.isLoading) return <Loading />
  if (votes.error) return <ErrorBox error={votes.error} />

  return (
    <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-up-dim">{t.admin.votesTitle}</div>
          <p className="mt-1 text-[11px] text-up-dim">
            {t.admin.votesSubtitle}
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
          <span className="tabular-nums text-up-orange">{list.length}</span> total
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          aria-label={t.admin.searchVote}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.admin.searchVote}
          maxLength={100}
          className="h-8 min-w-[180px] flex-1 rounded-sm border border-up-line bg-black/40 px-2 text-xs text-up-text focus-visible:border-up-orange focus-visible:outline-none"
        />
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text"
          >
            {selected.size === filtered.length ? t.common.clear : t.common.all}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setBulkConfirm(true)}
            className="rounded-sm border border-up-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/10"
          >
            {t.admin.deleteN(selected.size)}
          </button>
        )}
      </div>

      {bulkConfirm && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-up-red/40 bg-black/30 p-3">
          <p className="text-xs text-up-red">
            {t.admin.deleteVoteConfirm(selected.size)}
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text">{t.common.cancel}</button>
            <button
              onClick={deleteBulk}
              disabled={del.isPending}
              className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-up-red disabled:opacity-40"
            >
              {t.common.confirm}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-up-dim">
          {q ? t.admin.noVotesFor(q) : t.admin.noVotesYet}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-up-line/30">
          {filtered.map((v) => {
            const on = selected.has(v.id)
            const confirming = pendingDelete === v.id
            const statusColor =
              v.status === 'open' ? 'text-up-green' : v.status === 'closed' ? 'text-up-dim' : 'text-up-amber'
            const winner = gameName(v.winner_game_id)
            return (
              <div key={v.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(v.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-up-orange"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-up-text">{v.title}</span>
                    <span className={`font-mono text-[10px] uppercase tracking-wider ${statusColor}`}>{v.status}</span>
                  </div>
                  <div className="truncate font-mono text-[10px] uppercase tracking-wider text-up-dim">
                    {v.candidate_game_ids.length} cand · {v.ballots_count}/{v.eligible_voter_count} votos
                    {winner && <span className="text-up-orange"> · {t.admin.winnerPrefix}: {winner}</span>}
                  </div>
                </div>
                {v.status === 'open' && !confirming && (
                  <button
                    onClick={() => forceClose(v.id)}
                    className="shrink-0 rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:border-up-amber/60 hover:text-up-amber"
                  >
                    {t.votes.closeLabel}
                  </button>
                )}
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setPendingDelete(null)} className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim">{t.common.cancel}</button>
                    <button onClick={() => deleteOne(v.id)} className="rounded-sm border border-up-red/60 bg-up-red/10 px-2 py-1 font-mono text-[10px] text-up-red">{t.common.confirm}</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(v.id)}
                    className="shrink-0 rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:border-up-red/60 hover:text-up-red"
                  >
                    {t.common.delete}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
