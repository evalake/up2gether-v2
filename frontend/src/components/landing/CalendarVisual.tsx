import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MockCursor, type CursorStep } from './MockCursor'
import { Cover } from './Cover'
import { MOCK } from './mockGames'
import { useT } from '@/i18n'

// Foco: uma proxima sessao com RSVP. Sem grid semanal, sem modal:
// capa grande do jogo, avatares de quem ja confirmou, botoes vou/talvez/nao.
// Cursor clica "vou" -> 4o avatar acende, counter vai pra 4/4,
// rodape transita pra "lembrete agendado".

type Member = { id: string; initial: string; color: string }

const MEMBERS: Member[] = [
  { id: 'y', initial: 'Y', color: 'bg-orange-500/80' },
  { id: 'l', initial: 'L', color: 'bg-sky-500/80' },
  { id: 'r', initial: 'R', color: 'bg-emerald-500/80' },
  { id: 'm', initial: 'M', color: 'bg-violet-500/80' },
]

const INITIAL_CONFIRMED = ['y', 'l', 'r']
const PENDING_ID = 'm'

export function CalendarVisual() {
  const t = useT()
  const [hovering, setHovering] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [reminderSet, setReminderSet] = useState(false)
  const [tick, setTick] = useState(0)

  const cursorSteps: CursorStep[] = useMemo(
    () => [
      { x: 96, y: 96, ms: 800 },
      { x: 18, y: 82, ms: 1100 },
      { x: 18, y: 82, ms: 280, click: true, hold: 550 },
      { x: 110, y: 108, ms: 1000 },
    ],
    [],
  )

  useEffect(() => {
    setHovering(false)
    setConfirmed(false)
    setReminderSet(false)
    const timers: ReturnType<typeof setTimeout>[] = []
    timers.push(setTimeout(() => setHovering(true), 1500))
    timers.push(setTimeout(() => setConfirmed(true), 2300))
    timers.push(setTimeout(() => setReminderSet(true), 3000))
    timers.push(setTimeout(() => setTick((t) => t + 1), 7200))
    return () => timers.forEach(clearTimeout)
  }, [tick])

  const game = MOCK.drg
  const confirmedCount = confirmed ? MEMBERS.length : INITIAL_CONFIRMED.length

  return (
    <div className="relative overflow-hidden rounded-md border border-up-orange/25 bg-up-panel/60 shadow-[0_30px_80px_-30px_rgba(255,102,0,0.3)]">
      <MockCursor key={tick} steps={cursorSteps} loop={false} />

      <div className="flex items-center justify-between border-b border-up-line/60 bg-black/30 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up-orange" />
          <span className="font-mono text-[10px] uppercase tracking-widest text-up-dim">
            {t.landing.nextSessionHeader}
          </span>
        </div>
        <span className="rounded-sm border border-up-orange/40 bg-up-orange/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-orange">
          {t.landing.inHours}
        </span>
      </div>

      <div className="relative">
        <Cover
          src={game.cover}
          name={t.landing.dgrLocalTitle}
          gradient={game.gradient}
          showTitle={false}
          className="h-36 w-full"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-up-panel via-up-panel/85 to-transparent px-4 pt-10 pb-3">
          <div className="font-display text-xl leading-tight text-up-text">
            {t.landing.dgrLocalTitle}
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-up-dim">
            Deep Rock Galactic{t.landing.gameSubtitleSuffix}
          </div>
        </div>
      </div>

      <div className="space-y-3 px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
            {t.landing.whoGoes}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={confirmedCount}
              initial={{ scale: 1.25, opacity: 0.6 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
              className={`font-mono text-[11px] tabular-nums ${
                confirmed ? 'text-up-green' : 'text-up-amber'
              }`}
            >
              {confirmedCount}/{MEMBERS.length} {t.landing.confirmedSuffix}
            </motion.span>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2">
          {MEMBERS.map((m) => {
            const isInitial = INITIAL_CONFIRMED.includes(m.id)
            const isConfirmed = isInitial || confirmed
            const justConfirmed = !isInitial && confirmed
            return (
              <motion.div
                key={m.id}
                animate={{
                  scale: justConfirmed ? [1, 1.18, 1] : 1,
                }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded-full border font-mono text-[11px] font-bold transition-all ${
                    isConfirmed
                      ? `border-black/40 ${m.color} text-black/80`
                      : 'border-dashed border-up-line bg-up-panel/80 text-up-dim'
                  }`}
                >
                  {m.initial}
                </div>
                {isConfirmed && (
                  <motion.span
                    initial={justConfirmed ? { scale: 0 } : false}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.3, delay: justConfirmed ? 0.2 : 0 }}
                    className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border border-up-panel bg-up-green shadow-[0_0_6px_rgba(0,255,102,0.6)]"
                  />
                )}
              </motion.div>
            )
          })}
          {!confirmed && (
            <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-up-dim/70">
              {PENDING_ID.toUpperCase()} {t.landing.pendingSuffix}
            </span>
          )}
        </div>

        <div className="flex gap-1.5 pt-1">
          <motion.button
            animate={
              confirmed
                ? {
                    backgroundColor: 'rgba(0,255,102,0.12)',
                    borderColor: 'rgba(0,255,102,0.6)',
                    color: '#00ff66',
                  }
                : hovering
                  ? {
                      borderColor: 'rgba(255,102,0,0.7)',
                      color: '#ff6600',
                    }
                  : {}
            }
            transition={{ duration: 0.25 }}
            className="flex-1 rounded-sm border border-up-line bg-black/30 py-2 font-mono text-[11px] uppercase tracking-widest text-up-dim"
          >
            {t.landing.rsvpYes}
          </motion.button>
          <button className="flex-1 rounded-sm border border-up-line bg-black/30 py-2 font-mono text-[11px] uppercase tracking-widest text-up-dim">
            {t.landing.rsvpMaybe}
          </button>
          <button className="flex-1 rounded-sm border border-up-line bg-black/30 py-2 font-mono text-[11px] uppercase tracking-widest text-up-dim">
            {t.landing.rsvpNo}
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {reminderSet ? (
          <motion.div
            key="set"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2 border-t border-up-green/30 bg-up-green/5 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-up-green"
          >
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-up-green" />
            {t.landing.reminderSet}
          </motion.div>
        ) : (
          <motion.div
            key="unset"
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 border-t border-up-line/60 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-up-dim"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-up-line" />
            {t.landing.reminderUnset}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
