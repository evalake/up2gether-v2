import { useRef } from 'react'

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

type ViewMode = 'grid' | 'list'

type Props = {
  weekAnchor: Date
  viewMode: ViewMode
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onJump: (d: Date) => void
  onViewChange: (v: ViewMode) => void
}

function fmtRange(anchor: Date): string {
  const end = new Date(anchor)
  end.setDate(anchor.getDate() + 6)
  const sameMonth = anchor.getMonth() === end.getMonth()
  const a = `${MONTHS_SHORT[anchor.getMonth()]} ${anchor.getDate()}`
  const b = sameMonth ? `${end.getDate()}` : `${MONTHS_SHORT[end.getMonth()]} ${end.getDate()}`
  return `${a} a ${b}`
}

export function WeekHeader({ weekAnchor, viewMode, onPrev, onNext, onToday, onJump, onViewChange }: Props) {
  const dateRef = useRef<HTMLInputElement>(null)
  const today = new Date()
  const isThisWeek = (() => {
    const d = new Date(today)
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
    return d.getTime() === weekAnchor.getTime()
  })()

  const openPicker = () => {
    const el = dateRef.current
    if (!el) return
    el.showPicker?.() ?? el.click()
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-0.5 rounded-full border border-up-line/60 bg-up-panel/40 p-1 text-up-dim">
        <button
          type="button"
          onClick={onPrev}
          aria-label="semana anterior"
          title="semana anterior"
          className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-up-orange/10 hover:text-up-orange"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <button
          type="button"
          onClick={openPicker}
          title="escolher data"
          className="relative min-w-[110px] rounded-full px-3 py-0.5 text-center text-[12px] text-up-text/90 tabular-nums transition-colors hover:bg-up-orange/10 hover:text-up-orange"
        >
          {fmtRange(weekAnchor)}
          <input
            ref={dateRef}
            type="date"
            defaultValue={weekAnchor.toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && onJump(new Date(e.target.value + 'T00:00:00'))}
            className="pointer-events-none absolute inset-0 opacity-0"
            tabIndex={-1}
            aria-hidden
          />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="próxima semana"
          title="próxima semana"
          className="grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-up-orange/10 hover:text-up-orange"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
        <button
          type="button"
          onClick={onToday}
          disabled={isThisWeek}
          aria-label="semana de hoje"
          title="ir pra semana de hoje"
          className="ml-0.5 grid h-7 w-7 place-items-center rounded-full transition-colors hover:bg-up-orange/10 hover:text-up-orange disabled:cursor-default disabled:text-up-dim/40 disabled:hover:bg-transparent disabled:hover:text-up-dim/40"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11l9-8 9 8v10a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" /></svg>
        </button>
      </div>
      <div className="flex items-center rounded-full border border-up-line/60 bg-up-panel/40 p-1 text-[10px] uppercase tracking-wider text-up-dim">
        <button
          type="button"
          onClick={() => onViewChange('grid')}
          aria-pressed={viewMode === 'grid'}
          title="grade por horário"
          className={`rounded-full px-3 py-1 transition-colors ${viewMode === 'grid' ? 'bg-up-orange/15 text-up-orange' : 'hover:text-up-orange'}`}
        >
          grade
        </button>
        <button
          type="button"
          onClick={() => onViewChange('list')}
          aria-pressed={viewMode === 'list'}
          title="lista por dia"
          className={`rounded-full px-3 py-1 transition-colors ${viewMode === 'list' ? 'bg-up-orange/15 text-up-orange' : 'hover:text-up-orange'}`}
        >
          lista
        </button>
      </div>
    </div>
  )
}
