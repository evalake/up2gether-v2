import { useState } from 'react'
import { STAGE_VALUES } from '@/lib/constants'

const GENRE_LIMIT = 5

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
  const activeCount = stageFilter.size + genreFilter.size + (search ? 1 : 0)
  const hasActive = activeCount > 0
  return (
    <div className="space-y-1.5 rounded-sm border border-up-line/40 bg-up-panel/20 p-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-up-dim"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            aria-label="filtrar jogos na biblioteca"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="filtrar na biblioteca..."
            className="rounded-sm border border-up-line bg-black/40 py-1 pl-8 pr-3 text-xs placeholder:text-up-dim focus-visible:border-up-orange focus-visible:outline-none transition-colors"
          />
        </div>
        {STAGE_VALUES.map((s) => {
          const active = stageFilter.has(s)
          return (
            <button
              key={s}
              onClick={() => toggleStage(s)}
              className={`rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                active
                  ? 'border-up-orange bg-up-orange/10 text-up-orange'
                  : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
              }`}
            >
              {s}
            </button>
          )
        })}
        {hasActive && (
          <button
            onClick={onClear}
            className="rounded-sm border border-up-orange/40 bg-up-orange/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/15"
          >
            limpar {activeCount > 1 ? `(${activeCount})` : ''}
          </button>
        )}
        {totalShown < totalAll && (
          <span className="ml-auto font-mono text-[10px] tabular-nums uppercase tracking-wider text-up-dim">
            {totalShown}/{totalAll}
          </span>
        )}
      </div>
      {topGenres.length > 0 && (
        <GenreRow genres={topGenres} genreFilter={genreFilter} toggleGenre={toggleGenre} />
      )}
    </div>
  )
}

function GenreRow({ genres, genreFilter, toggleGenre }: { genres: string[]; genreFilter: Set<string>; toggleGenre: (g: string) => void }) {
  const [expanded, setExpanded] = useState(false)
  const needsCollapse = genres.length > GENRE_LIMIT
  const visible = expanded || !needsCollapse ? genres : genres.slice(0, GENRE_LIMIT)

  return (
    <div className="flex flex-wrap items-center gap-1 pl-1">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-up-dim">generos</span>
      {visible.map((g) => {
        const active = genreFilter.has(g)
        return (
          <button
            key={g}
            onClick={() => toggleGenre(g)}
            className={`rounded-sm border px-2 py-0.5 text-[10px] transition-colors ${
              active
                ? 'border-up-magenta/60 bg-up-magenta/10 text-up-magenta'
                : 'border-up-line text-up-dim hover:border-up-magenta hover:text-up-magenta'
            }`}
          >
            {g}
          </button>
        )
      })}
      {needsCollapse && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="px-1 text-[10px] text-up-dim transition-colors hover:text-up-magenta"
        >
          {expanded ? 'ver menos' : `+${genres.length - GENRE_LIMIT} mais`}
        </button>
      )}
    </div>
  )
}
