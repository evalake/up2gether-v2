import { useState } from 'react'
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
