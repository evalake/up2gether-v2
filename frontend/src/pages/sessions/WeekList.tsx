import { useMemo } from 'react'
import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import { steamCover } from '@/lib/steamCover'

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
  sessions: PlaySession[]
  games: Game[]
  now: Date
  onOpenSlot: (start: Date) => void
  onOpenDetail: (sessionId: string) => void
}

export function WeekList({ weekAnchor, sessions, games, now, onOpenSlot, onOpenDetail }: Props) {
  const days = useMemo(() => {
    return WEEKDAYS.map((wd, i) => {
      const day = addDays(weekAnchor, i)
      const inDay = sessions
        .filter((s) => sameDay(new Date(s.start_at), day))
        .sort((a, b) => a.start_at.localeCompare(b.start_at))
      return { wd, day, inDay }
    })
  }, [weekAnchor, sessions])

  const today = new Date()

  return (
    <div className="divide-y divide-nerv-orange/10 rounded-sm border border-nerv-orange/15 bg-nerv-panel/30">
      {days.map(({ wd, day, inDay }) => {
        const isToday = sameDay(day, today)
        const isPastDay = day < today && !isToday
        return (
          <div key={wd} className="grid grid-cols-[72px_1fr] gap-3 px-3 py-3">
            <div className={`flex flex-col items-start justify-start pt-1 font-mono text-[10px] uppercase tracking-wider ${isToday ? 'text-nerv-orange' : 'text-nerv-dim'}`}>
              <span>{wd}</span>
              <span className={`mt-0.5 font-display text-xl ${isToday ? 'text-nerv-orange' : 'text-nerv-text/80'}`}>{day.getDate()}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-1.5">
              {inDay.length === 0 ? (
                <button
                  type="button"
                  disabled={isPastDay}
                  onClick={() => {
                    const slot = new Date(day)
                    const base = isToday && now.getHours() >= 8 ? now.getHours() + 1 : 20
                    slot.setHours(Math.min(base, 23), 0, 0, 0)
                    onOpenSlot(slot)
                  }}
                  className={`self-start rounded-sm border border-dashed px-3 py-1.5 text-[11px] transition-colors ${
                    isPastDay
                      ? 'cursor-not-allowed border-nerv-line/30 text-nerv-dim/40'
                      : 'border-nerv-orange/25 text-nerv-dim hover:border-nerv-orange/60 hover:text-nerv-orange'
                  }`}
                >
                  {isPastDay ? 'sem sessões' : '+ agendar'}
                </button>
              ) : (
                inDay.map((s) => {
                  const st = new Date(s.start_at)
                  const game = games.find((g) => g.id === s.game_id)
                  const cover = game ? steamCover(game) : null
                  const isPast = st < now
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onOpenDetail(s.id)}
                      className={`flex items-stretch gap-3 overflow-hidden rounded-sm border text-left transition-all ${
                        isPast
                          ? 'border-nerv-line/40 bg-nerv-panel/30 hover:border-nerv-line/70'
                          : 'border-nerv-orange/30 bg-gradient-to-r from-nerv-orange/10 via-transparent to-transparent hover:border-nerv-orange/60 hover:shadow-sm hover:shadow-nerv-orange/20'
                      }`}
                    >
                      {cover ? (
                        <img
                          loading="lazy"
                          src={cover}
                          alt=""
                          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                          className={`h-14 w-20 shrink-0 object-cover ${isPast ? 'opacity-60 grayscale-[40%]' : ''}`}
                        />
                      ) : (
                        <span className="grid h-14 w-20 shrink-0 place-items-center bg-nerv-orange/10 font-display text-nerv-orange/60">◈</span>
                      )}
                      <span className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
                        <span className="flex items-center gap-2">
                          <span className={`font-mono text-[10px] tabular-nums ${isPast ? 'text-nerv-dim' : 'text-nerv-orange'}`}>
                            {String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')}
                          </span>
                          <span className={`truncate text-sm ${isPast ? 'text-nerv-dim' : 'text-nerv-text'}`}>
                            {s.title}
                          </span>
                        </span>
                        <span className="mt-0.5 flex items-center gap-3 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                          {game?.name && <span className="truncate">{game.name}</span>}
                          <span className="ml-auto shrink-0">
                            <span className="text-nerv-green">{s.rsvp_yes}</span>
                            {s.rsvp_maybe > 0 && <> · <span className="text-nerv-amber">{s.rsvp_maybe}</span></>}
                            {s.rsvp_no > 0 && <> · <span className="text-nerv-red/70">{s.rsvp_no}</span></>}
                          </span>
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
