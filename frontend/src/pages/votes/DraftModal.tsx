import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'

export function DraftModal({
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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])
  const [query, setQuery] = useState('')
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const q = norm(query.trim())
  const filtered = q
    ? games.filter((g) => picked.includes(g.id) || norm(g.name).includes(q))
    : games
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
      >
        <button
          onClick={onCancel}
          aria-label="fechar"
          className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
        <div className="border-b border-nerv-orange/15 px-5 py-4">
          <div className="text-[10px] uppercase tracking-wider text-nerv-dim">nova votação</div>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="qual jogo na sexta?"
            className="mt-1 h-9 w-full rounded-sm border-0 border-b border-nerv-line/40 bg-transparent px-0 text-base text-nerv-text focus-visible:border-nerv-orange focus-visible:outline-none"
          />
        </div>
        <div className="border-b border-nerv-orange/10 px-5 py-2">
          <input
            aria-label="buscar jogo"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="buscar jogo..."
            className="h-9 w-full rounded-sm border border-nerv-line/30 bg-black/20 px-3 text-xs text-nerv-text placeholder:text-nerv-dim focus-visible:border-nerv-orange/60 focus-visible:outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-nerv-dim">
            <span>candidatos · {picked.length} selecionados {picked.length < 2 && '(mínimo 2)'}</span>
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
                    on ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange' : 'border-nerv-line text-nerv-text transition-colors hover:border-nerv-orange/40'
                  }`}
                >
                  {cover && <img loading="lazy" src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-6 w-10 shrink-0 rounded-sm object-cover" />}
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
            className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text"
          >
            cancelar
          </button>
          <button
            onClick={onCreate}
            disabled={isPending || !title || picked.length < 2}
            className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
          >
            {isPending ? 'criando...' : 'criar'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
