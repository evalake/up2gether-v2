import { AnimatePresence, motion } from 'framer-motion'
import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import { steamCover } from '@/lib/steamCover'
import { useT } from '@/i18n'
import { useLocaleStore } from '@/features/locale/store'

type Props = {
  past: PlaySession[]
  games: Game[]
  isOpen: boolean
  onToggle: () => void
  onOpenDetail: (sessionId: string) => void
}

export function PastSessions({ past, games, isOpen, onToggle, onOpenDetail }: Props) {
  const t = useT()
  const locale = useLocaleStore((s) => s.locale)
  const dtLocale = locale === 'pt' ? 'pt-BR' : 'en-US'
  if (past.length === 0) return null
  return (
    <section className="space-y-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
      >
        <span>{isOpen ? '−' : '+'}</span>
        <span>{t.sessions.history}</span>
        <span className="text-up-orange tabular-nums">{past.length}</span>
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
                  className="flex gap-3 rounded-sm border border-up-line bg-up-panel/30 p-3 text-left transition-[colors,box-shadow] duration-200 hover:border-up-orange hover:bg-up-panel/50 hover:shadow-[0_0_20px_rgba(255,102,0,0.12)]"
                >
                  {cover ? (
                    <img loading="lazy" src={cover} alt="" className="h-20 w-32 shrink-0 rounded-sm object-cover opacity-70" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                  ) : (
                    <div className="h-20 w-32 shrink-0 rounded-sm bg-up-line/20" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-up-dim">
                      {start.toLocaleDateString(dtLocale, { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' · '}
                      {start.toLocaleTimeString(dtLocale, { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="mt-0.5 truncate text-sm text-up-text">{s.title}</div>
                    <div className="mt-1 truncate text-xs text-up-dim">{game?.name ?? t.sessions.noGameFallback}</div>
                    <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-up-dim">
                      <span><span className="text-up-green tabular-nums">{s.rsvp_yes}</span> {t.sessions.cameShort}</span>
                      {s.rsvp_no > 0 && <span><span className="text-up-red tabular-nums">{s.rsvp_no}</span> {t.sessions.notShort}</span>}
                      <span className="ml-auto text-up-dim">{s.duration_minutes / 60}h</span>
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
