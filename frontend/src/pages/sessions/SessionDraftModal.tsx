import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'

export function SessionDraftModal({
  start,
  games,
  gameId,
  setGameId,
  title,
  setTitle,
  duration,
  setDuration,
  onCancel,
  onSave,
  isPending,
}: {
  start: Date
  games: Game[]
  gameId: string
  setGameId: (v: string) => void
  title: string
  setTitle: (v: string) => void
  duration: number
  setDuration: (v: number) => void
  onCancel: () => void
  onSave: () => void
  isPending: boolean
}) {
  const [query, setQuery] = useState('')
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const q = norm(query.trim())
  const filtered = useMemo(() => {
    if (!q) return games
    return games.filter((g) => g.id === gameId || norm(g.name).includes(q))
  }, [games, q, gameId])
  const selected = games.find((g) => g.id === gameId) ?? null
  const selectedCover = selected ? steamCover(selected) : null
  const end = new Date(start.getTime() + duration * 60_000)
  const hour = (d: Date) => d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <motion.div
      key="draft-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        key="draft-panel"
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', stiffness: 340, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl overflow-hidden rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
      >
        <button
          onClick={onCancel}
          aria-label="fechar"
          className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="relative h-36 w-full overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedCover ? (
              <motion.img
                key={selectedCover}
                src={selectedCover}
                alt=""
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0 h-full w-full object-cover blur-[2px]"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-br from-nerv-orange/20 via-nerv-panel to-nerv-magenta/10"
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/70 to-nerv-panel/20" />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="absolute inset-x-0 bottom-0 p-5"
          >
            <span className="mb-2 inline-block rounded-full border border-nerv-orange/40 bg-nerv-orange/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-orange">
              agendar
            </span>
            <h2 className="font-display text-2xl capitalize leading-tight text-nerv-text">
              {start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h2>
            <div className="mt-0.5 font-mono text-[11px] text-nerv-orange/80">
              {hour(start)} {'\u2192'} {hour(end)} · {duration / 60}h
            </div>
          </motion.div>
        </div>

        <div className="space-y-4 p-5">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
          >
            <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-nerv-dim">
              <span>jogo</span>
              {selected && (
                <span className="truncate text-nerv-orange/80">{selected.name}</span>
              )}
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="buscar jogo..."
              className="h-9 w-full rounded-md border border-nerv-line/40 bg-black/30 px-3 text-xs text-nerv-text placeholder:text-nerv-dim focus:border-nerv-orange/60 focus:outline-none"
            />
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-nerv-line/30 bg-black/20">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-nerv-dim">
                  nenhum jogo pra {JSON.stringify(query)}
                </div>
              ) : (
                <div className="grid gap-1 p-1.5 sm:grid-cols-2">
                  {filtered.map((g) => {
                    const on = g.id === gameId
                    const cover = steamCover(g)
                    return (
                      <motion.button
                        key={g.id}
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setGameId(g.id)}
                        className={`flex items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition-all ${
                          on
                            ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                            : 'border-transparent text-nerv-text hover:border-nerv-orange/30 hover:bg-nerv-orange/5'
                        }`}
                      >
                        {cover ? (
                          <img src={cover} alt="" className="h-6 w-10 shrink-0 rounded-sm object-cover" />
                        ) : (
                          <div className="h-6 w-10 shrink-0 rounded-sm bg-nerv-line/30" />
                        )}
                        <span className="truncate text-[11px]">{g.name}</span>
                      </motion.button>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
          >
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim">
              titulo (opcional)
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selected?.name ?? 'usa o nome do jogo se vazio'}
              className="h-9 w-full rounded-md border border-nerv-line/40 bg-black/30 px-3 text-xs text-nerv-text placeholder:text-nerv-dim focus:border-nerv-orange/60 focus:outline-none"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim">
              duracao
            </div>
            <div className="flex gap-1.5">
              {[60, 120, 180, 240].map((m) => {
                const on = duration === m
                return (
                  <motion.button
                    key={m}
                    type="button"
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setDuration(m)}
                    className={`flex-1 rounded-md border px-3 py-2 text-[11px] uppercase tracking-wider transition-all ${
                      on
                        ? 'border-nerv-orange/60 bg-nerv-orange/10 text-nerv-orange'
                        : 'border-nerv-line/60 bg-black/20 text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-text'
                    }`}
                  >
                    {m / 60}h
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-nerv-line/30 px-5 py-3">
          <button
            onClick={onCancel}
            className="rounded-sm border border-nerv-line px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            cancelar
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSave}
            disabled={!gameId || isPending}
            className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-4 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/25 disabled:opacity-40"
          >
            {isPending ? 'salvando...' : 'agendar'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
