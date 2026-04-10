import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useGames } from '@/features/games/hooks'
import { useVotes, useDeleteVote } from '@/features/votes/hooks'
import { closeVote } from '@/features/votes/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

export function VotesTab({ groupId }: { groupId: string }) {
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
      toast.success('votacao apagada')
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(vid)
        return n
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
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
    if (fail === 0) toast.success(`${ok} votacao${ok === 1 ? '' : 'es'} apagada${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagadas, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  const forceClose = async (vid: string) => {
    try {
      await closeVote(groupId, vid)
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'votes'] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
      toast.success('votacao encerrada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  if (votes.isLoading) return <Loading />
  if (votes.error) return <ErrorBox error={votes.error} />

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Votacoes do grupo</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Historico completo. Apagar votacao limpa stages e ballots via cascade.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="tabular-nums text-nerv-orange">{list.length}</span> total
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          aria-label="buscar votacao"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar votacao..."
          className="h-8 min-w-[180px] flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
        />
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            {selected.size === filtered.length ? 'limpar' : 'tudo'}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setBulkConfirm(true)}
            className="rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10"
          >
            apagar {selected.size}
          </button>
        )}
      </div>

      {bulkConfirm && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
          <p className="text-xs text-nerv-red">
            apagar {selected.size} votacao{selected.size === 1 ? '' : 'es'}? nao da pra desfazer.
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
            <button
              onClick={deleteBulk}
              disabled={del.isPending}
              className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
            >
              sim, apagar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-nerv-dim">
          {q ? `nenhuma votacao pra "${q}"` : 'nenhuma votacao ainda'}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-nerv-line/30">
          {filtered.map((v) => {
            const on = selected.has(v.id)
            const confirming = pendingDelete === v.id
            const statusColor =
              v.status === 'open' ? 'text-nerv-green' : v.status === 'closed' ? 'text-nerv-dim' : 'text-nerv-amber'
            const winner = gameName(v.winner_game_id)
            return (
              <div key={v.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(v.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-nerv-orange"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{v.title}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${statusColor}`}>{v.status}</span>
                  </div>
                  <div className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {v.candidate_game_ids.length} cand · {v.ballots_count}/{v.eligible_voter_count} votos
                    {winner && <span className="text-nerv-orange"> · winner: {winner}</span>}
                  </div>
                </div>
                {v.status === 'open' && !confirming && (
                  <button
                    onClick={() => forceClose(v.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-amber/60 hover:text-nerv-amber"
                  >
                    encerrar
                  </button>
                )}
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setPendingDelete(null)} className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim">cancelar</button>
                    <button onClick={() => deleteOne(v.id)} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red">confirmar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(v.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
                  >
                    apagar
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
