import { AnimatePresence, motion } from 'framer-motion'
import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import { steamCover } from '@/lib/steamCover'

type Props = {
  past: PlaySession[]
  games: Game[]
  isOpen: boolean
  onToggle: () => void
  onOpenDetail: (sessionId: string) => void
}

export function PastSessions({ past, games, isOpen, onToggle, onOpenDetail }: Props) {
  if (past.length === 0) return null
  return (
    <section className="space-y-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
      >
        <span>{isOpen ? '−' : '+'}</span>
        <span>histórico</span>
        <span className="text-nerv-orange tabular-nums">{past.length}</span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="grid gap-3 overflow-hidden sm:grid-cols-2"
          >
            {past.map((s) => {
              const game = games.find((g) => g.id === s.game_id)
              const cover = game ? steamCover(game) : null
              const start = new Date(s.start_at)
              return (
                <motion.button
                  layout
                  key={s.id}
                  type="button"
                  onClick={() => onOpenDetail(s.id)}
                  className="flex gap-3 rounded-sm border border-nerv-line/60 bg-nerv-panel/30 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-nerv-orange/40 hover:bg-nerv-panel/50 hover:shadow-lg hover:shadow-black/20"
                >
                  {cover ? (
                    <img loading="lazy" src={cover} alt="" className="h-20 w-32 shrink-0 rounded-sm object-cover opacity-70" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="h-20 w-32 shrink-0 rounded-sm bg-nerv-line/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
                      {start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' · '}
                      {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-nerv-text/90">{s.title}</div>
                    <div className="mt-1 truncate text-xs text-nerv-dim">{game?.name ?? '?'}</div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-nerv-dim">
                      <span><span className="text-nerv-green tabular-nums">{s.rsvp_yes}</span> vieram</span>
                      {s.rsvp_no > 0 && <span><span className="text-nerv-red/70 tabular-nums">{s.rsvp_no}</span> não</span>}
                      <span className="ml-auto text-nerv-dim/70">{s.duration_minutes / 60}h</span>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
