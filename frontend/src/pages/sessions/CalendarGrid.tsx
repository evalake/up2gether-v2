import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import { SlotStack } from './SlotStack'

const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']

const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

type Props = {
  weekAnchor: Date
  hours: number[]
  sessions: PlaySession[]
  games: Game[]
  now: Date
  fullDay: boolean
  onToggleFullDay: () => void
  onOpenSlot: (start: Date) => void
  onOpenDetail: (sessionId: string) => void
}

export function CalendarGrid({ weekAnchor, hours, sessions, games, now, fullDay, onToggleFullDay, onOpenSlot, onOpenDetail }: Props) {
  return (
    <div className="overflow-x-auto rounded-sm border border-up-orange/15 bg-up-panel/30">
      <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', gridTemplateRows: `auto repeat(${hours.length}, minmax(56px, auto)) auto` }}>
        <div className="border-b border-up-orange/10" />
        {WEEKDAYS.map((wd, i) => {
          const day = addDays(weekAnchor, i)
          const today = sameDay(day, new Date())
          return (
            <div key={wd} className={`border-b border-up-orange/10 px-2 py-2 text-center text-[10px] uppercase ${today ? 'text-up-orange' : 'text-up-dim'}`}>
              <div className="tracking-wider">{wd}</div>
              <div className={`mt-0.5 font-display text-base ${today ? '' : 'text-up-text'}`}>{day.getDate()}</div>
            </div>
          )
        })}
        {hours.map((h) => (
          <div key={h} className="contents">
            <div className="border-t border-up-orange/5 px-1 py-0.5 text-right font-mono text-[9px] text-up-dim">
              {String(h).padStart(2, '0')}
            </div>
            {WEEKDAYS.map((_, i) => {
              const day = addDays(weekAnchor, i)
              const slot = new Date(day)
              slot.setHours(h, 0, 0, 0)
              const isPast = slot < now
              const inSlot = sessions.filter((s) => {
                const st = new Date(s.start_at)
                return sameDay(st, day) && st.getHours() === h
              })
              return (
                <div
                  key={`${h}-${i}`}
                  className={`group/cell relative min-h-[44px] border-l border-t border-up-orange/5 ${
                    isPast ? 'bg-up-line/5' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => !isPast && onOpenSlot(slot)}
                    disabled={isPast}
                    aria-label="novo horário"
                    title={isPast ? undefined : 'agendar sessão'}
                    className={`absolute inset-0 ${isPast ? 'cursor-not-allowed' : inSlot.length === 0 ? 'group/empty transition-colors hover:bg-up-orange/5' : ''}`}
                  >
                    {!isPast && inSlot.length === 0 && (
                      <span className="absolute inset-0 grid place-items-center text-up-orange/0 transition-colors group-hover/empty:text-up-orange/30 text-lg">+</span>
                    )}
                  </button>
                  {inSlot.length > 0 && !isPast && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onOpenSlot(slot) }}
                      aria-label="adicionar outra no mesmo horário"
                      className="absolute right-0.5 top-0.5 z-20 hidden h-4 w-4 place-items-center rounded-full border border-up-orange/50 bg-up-panel text-[10px] leading-none text-up-orange hover:bg-up-orange transition-colors hover:text-up-panel group-hover/cell:grid"
                    >
                      +
                    </button>
                  )}
                  {inSlot.length > 0 && (
                    <SlotStack
                      sessions={inSlot}
                      games={games}
                      isPast={isPast}
                      onOpen={onOpenDetail}
                    />
                  )}
                  {isPast && inSlot.length === 0 && (
                    <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_4px,rgba(255,102,0,0.04)_4px,rgba(255,102,0,0.04)_5px)]" />
                  )}
                </div>
              )
            })}
          </div>
        ))}
        <div className="col-span-8 border-t border-up-orange/10 px-2 py-1.5 text-center">
          <button
            type="button"
            onClick={onToggleFullDay}
            className="font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
            title={fullDay ? 'mostrar só horários relevantes' : 'mostrar todas as horas do dia'}
          >
            {fullDay ? '− compactar horários' : '+ mostrar 24h'}
          </button>
        </div>
      </div>
    </div>
  )
}
