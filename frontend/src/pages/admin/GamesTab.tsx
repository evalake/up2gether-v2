import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames, useArchiveGame } from '@/features/games/hooks'
import type { Game } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'

export function GamesTab({ groupId }: { groupId: string }) {
  const t = useT()
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
      toast.success(t.admin.gameDeleted(g.name))
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(g.id)
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
      ids.map(async (gid) => {
        try {
          await archive.mutateAsync(gid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(t.admin.gamesDeleted(ok, fail))
    else toast.error(t.admin.gamesDeleted(ok, fail))
    setSelected(new Set())
    setBulkConfirm(false)
  }

  if (games.isLoading) return <Loading />
  if (games.error) return <ErrorBox error={games.error} />

  return (
    <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-up-dim">{t.admin.gamesTitle}</div>
          <p className="mt-1 text-[11px] text-up-dim">
            {t.admin.gamesSubtitle}
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
          <span className="tabular-nums text-up-orange">{list.length}</span> total
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          aria-label={t.admin.searchGame}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t.admin.searchGame}
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

      <AnimatePresence>
      {bulkConfirm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-up-red/40 bg-black/30 p-3">
          <p className="text-xs text-up-red">
            {t.admin.deleteConfirm(selected.size)}
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text">
              {t.common.cancel}
            </button>
            <button
              onClick={deleteBulk}
              disabled={archive.isPending}
              className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-up-red disabled:opacity-40"
            >
              {t.common.confirm}
            </button>
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-up-dim">
          {q ? t.admin.noGamesFor(q) : t.admin.noGamesYet}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-up-line/30">
          {filtered.map((g) => {
            const on = selected.has(g.id)
            const confirming = pendingDelete === g.id
            return (
              <div key={g.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(g.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-up-orange"
                />
                {g.cover_url ? (
                  <img loading="lazy" src={g.cover_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-8 w-14 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-8 w-14 shrink-0 rounded-sm bg-up-line/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-up-text">{g.name}</div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
                    {g.viability.interest_want_count}w · {g.viability.ownership_count}own
                  </div>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setPendingDelete(null)}
                      className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:text-up-text"
                    >
                      {t.common.cancel}
                    </button>
                    <button
                      onClick={() => deleteOne(g)}
                      className="rounded-sm border border-up-red/60 bg-up-red/10 px-2 py-1 font-mono text-[10px] text-up-red"
                    >
                      {t.common.confirm}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(g.id)}
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
