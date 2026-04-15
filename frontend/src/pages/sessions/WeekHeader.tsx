type Props = {
  weekLabel: string
  fullDay: boolean
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onToggleFullDay: () => void
}

export function WeekHeader({ weekLabel, fullDay, onPrev, onNext, onToday, onToggleFullDay }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-nerv-line/60 bg-nerv-panel/40 px-1 py-1 text-[11px] text-nerv-dim">
      <button
        onClick={onPrev}
        aria-label="semana anterior"
        title="semana anterior"
        className="grid h-7 w-7 place-items-center rounded-full hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
      </button>
      <span className="min-w-[110px] text-center text-nerv-text/90 tabular-nums">{weekLabel}</span>
      <button
        onClick={onNext}
        aria-label="próxima semana"
        title="próxima semana"
        className="grid h-7 w-7 place-items-center rounded-full hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>
      <button
        onClick={onToday}
        className="ml-1 rounded-full px-3 h-7 text-[10px] uppercase tracking-wider hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
      >
        hoje
      </button>
      <button
        onClick={onToggleFullDay}
        title={fullDay ? 'mostrar só prime time' : 'mostrar dia todo'}
        className={`ml-1 rounded-full px-3 h-7 text-[10px] uppercase tracking-wider transition-colors ${fullDay ? 'bg-nerv-orange/15 text-nerv-orange' : 'hover:bg-nerv-orange/10 hover:text-nerv-orange'}`}
      >
        {fullDay ? 'dia todo' : 'noite'}
      </button>
    </div>
  )
}
