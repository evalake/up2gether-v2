import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSessions } from '@/features/sessions/hooks'

const WEEKDAYS = ['s', 't', 'q', 'q', 's', 's', 'd']
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const STORAGE_KEY = 'up2.minicalendar.collapsed'

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function startOfMonth(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), 1)
  x.setHours(0, 0, 0, 0)
  return x
}

function gridStart(d: Date) {
  const first = startOfMonth(d)
  const offset = (first.getDay() + 6) % 7
  const x = new Date(first)
  x.setDate(first.getDate() - offset)
  return x
}

export function MiniCalendar({ groupId }: { groupId: string }) {
  const sessions = useSessions(groupId)
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  })
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  const byDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of sessions.data ?? []) {
      const d = new Date(s.start_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      map.set(key, (map.get(key) ?? 0) + 1)
    }
    return map
  }, [sessions.data])

  const days = useMemo(() => {
    const start = gridStart(cursor)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      return d
    })
  }, [cursor])

  const today = new Date()
  const monthLabel = `${MONTHS[cursor.getMonth()]} ${cursor.getFullYear()}`

  const shift = (n: number) => {
    const x = new Date(cursor)
    x.setMonth(x.getMonth() + n)
    setCursor(x)
  }

  const onDayClick = (d: Date) => {
    navigate(`/groups/${groupId}/sessions`, { state: { weekOf: d.toISOString() } })
  }

  if (collapsed) {
    return (
      <aside className="hidden lg:flex h-full w-8 shrink-0 flex-col items-center border-l border-nerv-orange/15 bg-nerv-panel/40 py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="expandir mini calendário"
          title="expandir calendário"
          className="grid h-7 w-7 place-items-center rounded-sm border border-nerv-orange/30 text-nerv-orange transition-colors hover:bg-nerv-orange/10"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <div className="mt-2 font-mono text-[9px] uppercase tracking-wider text-nerv-dim [writing-mode:vertical-rl] rotate-180">
          calendar
        </div>
      </aside>
    )
  }

  return (
    <aside className="hidden lg:flex h-full w-56 shrink-0 flex-col border-l border-nerv-orange/15 bg-nerv-panel/40 px-3 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">calendar</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="recolher mini calendário"
          title="recolher"
          className="grid h-6 w-6 place-items-center rounded-sm text-nerv-dim transition-colors hover:bg-nerv-orange/10 hover:text-nerv-orange"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          aria-label="mês anterior"
          title="mês anterior"
          className="grid h-6 w-6 place-items-center rounded-sm text-nerv-dim transition-colors hover:bg-nerv-orange/10 hover:text-nerv-orange"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          onClick={() => setCursor(startOfMonth(new Date()))}
          className="font-mono text-[11px] uppercase tracking-wider text-nerv-text transition-colors hover:text-nerv-orange"
          title="hoje"
        >
          {monthLabel}
        </button>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="próximo mês"
          title="próximo mês"
          className="grid h-6 w-6 place-items-center rounded-sm text-nerv-dim transition-colors hover:bg-nerv-orange/10 hover:text-nerv-orange"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 gap-0.5 text-center font-mono text-[9px] uppercase text-nerv-dim/70">
        {WEEKDAYS.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const outside = d.getMonth() !== cursor.getMonth()
          const isToday = sameDay(d, today)
          const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
          const count = byDay.get(key) ?? 0
          const isPast = d < today && !isToday
          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onDayClick(d)}
              className={`relative aspect-square rounded-sm text-[10px] transition-colors ${
                outside ? 'text-nerv-dim/30' : isPast ? 'text-nerv-dim/60' : 'text-nerv-text/80'
              } ${isToday ? 'border border-nerv-orange text-nerv-orange' : 'hover:bg-nerv-orange/10 hover:text-nerv-orange'}`}
              title={count > 0 ? `${count} sessão${count > 1 ? 'ões' : ''}` : 'sem sessões'}
            >
              <span className="absolute left-1 top-0.5 tabular-nums">{d.getDate()}</span>
              {count > 0 && (
                <span className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-0.5">
                  {Array.from({ length: Math.min(count, 3) }, (_, i) => (
                    <span key={i} className={`h-1 w-1 rounded-full ${isPast ? 'bg-nerv-dim/50' : 'bg-nerv-orange'}`} />
                  ))}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {sessions.data && sessions.data.length === 0 && (
        <div className="mt-3 text-[10px] text-nerv-dim/70">sem sessões ainda</div>
      )}
    </aside>
  )
}
