import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames, useArchiveGame } from '@/features/games/hooks'
import type { Game } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

export function GamesTab({ groupId }: { groupId: string }) {
  const games = useGames(groupId)
  const archive = useArchiveGame(groupId)
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (games.data ?? []).filter((g) => !g.archived_at)
  const filtered = query ? list.filter((g) => norm(g.name).includes(query)) : list

  const toggleOne = (gid: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid)
      else next.add(gid)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((g) => g.id)))
  }

  const deleteOne = async (g: Game) => {
    try {
      await archive.mutateAsync(g.id)
      toast.success(`${g.name} apagado`)
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(g.id)
        return n
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao apagar')
    }
  }

  const deleteBulk = async () => {
    const ids = Array.from(selected)
    let ok = 0
    let fail = 0
    await Promise.all(
      ids.map(async (gid) => {
        try {
          await archive.mutateAsync(gid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(`${ok} jogo${ok === 1 ? '' : 's'} apagado${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagados, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  if (games.isLoading) return <Loading />
  if (games.error) return <ErrorBox error={games.error} />

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Games do grupo</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Lista completa. Use busca pra filtrar, selecione varios pra apagar em lote.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="tabular-nums text-nerv-orange">{list.length}</span> total
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          aria-label="buscar jogo"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar jogo..."
          className="h-8 min-w-[180px] flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
        />
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text"
          >
            {selected.size === filtered.length ? 'limpar' : 'tudo'}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setBulkConfirm(true)}
            className="rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red transition-colors hover:bg-nerv-red/10"
          >
            apagar {selected.size}
          </button>
        )}
      </div>

      <AnimatePresence>
      {bulkConfirm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
          <p className="text-xs text-nerv-red">
            apagar {selected.size} jogo{selected.size === 1 ? '' : 's'}? nao da pra desfazer.
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text">
              cancelar
            </button>
            <button
              onClick={deleteBulk}
              disabled={archive.isPending}
              className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
            >
              sim, apagar
            </button>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-nerv-dim">
          {q ? `nenhum jogo pra "${q}"` : 'nenhum jogo ainda'}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-nerv-line/30">
          {filtered.map((g) => {
            const on = selected.has(g.id)
            const confirming = pendingDelete === g.id
            return (
              <div key={g.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(g.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-nerv-orange"
                />
                {g.cover_url ? (
                  <img src={g.cover_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-8 w-14 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-8 w-14 shrink-0 rounded-sm bg-nerv-line/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-nerv-text">{g.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {g.viability.interest_want_count}w · {g.viability.ownership_count}own
                  </div>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setPendingDelete(null)}
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim transition-colors hover:text-nerv-text"
                    >
                      cancelar
                    </button>
                    <button
                      onClick={() => deleteOne(g)}
                      className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red"
                    >
                      confirmar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(g.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
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
