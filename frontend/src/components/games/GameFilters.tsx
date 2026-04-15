import { STAGE_VALUES } from '@/lib/constants'

type Props = {
  search: string
  onSearch: (v: string) => void
  stageFilter: Set<string>
  toggleStage: (s: string) => void
  genreFilter: Set<string>
  toggleGenre: (g: string) => void
  topGenres: string[]
  totalShown: number
  totalAll: number
  onClear: () => void
}

export function GameFilters({
  search, onSearch,
  stageFilter, toggleStage,
  genreFilter, toggleGenre,
  topGenres, totalShown, totalAll,
  onClear,
}: Props) {
  const hasActive = stageFilter.size > 0 || genreFilter.size > 0 || !!search
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="buscar jogo"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="buscar..."
          className="rounded-sm border border-nerv-line bg-black/40 px-3 py-1 text-xs focus-visible:border-nerv-orange focus-visible:outline-none"
        />
        {STAGE_VALUES.map((s) => {
          const active = stageFilter.has(s)
          return (
            <button
              key={s}
              onClick={() => toggleStage(s)}
              className={`rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider transition-all ${
                active
                  ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                  : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
              }`}
            >
              {s}
            </button>
          )
        })}
        {hasActive && (
          <button
            onClick={onClear}
            className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
          >
            limpar
          </button>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-nerv-dim">
          {totalShown} de {totalAll}
        </span>
      </div>
      {topGenres.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pl-1">
          <span className="text-[9px] uppercase tracking-wider text-nerv-dim/60">gêneros</span>
          {topGenres.map((g) => {
            const active = genreFilter.has(g)
            return (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`rounded-full border px-2.5 py-0.5 text-[10px] transition-all ${
                  active
                    ? 'border-nerv-magenta/60 bg-nerv-magenta/10 text-nerv-magenta'
                    : 'border-nerv-line/50 text-nerv-dim transition-colors hover:border-nerv-magenta/40 hover:text-nerv-magenta/80'
                }`}
              >
                {g}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
