import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useT } from '@/i18n'
import { useGames } from '@/features/games/hooks'
import { GameGridSkeleton } from '@/components/ui/CardSkeletons'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { Button } from '@/components/core/Button'
import { useTitle } from '@/lib/useTitle'
import { GameCard } from '@/components/games/GameCard'
import { GameFilters } from '@/components/games/GameFilters'
import { GameCreateForm } from '@/components/games/GameCreateForm'

export function GamesPage() {
  const t = useT()
  useTitle(t.games.library)
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const games = useGames(id)

  const [showForm, setShowForm] = useState(false)
  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set())
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of games.data ?? []) {
      for (const x of g.genres) counts.set(x, (counts.get(x) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g)
  }, [games.data])

  const filteredGames = useMemo(
    () =>
      games.data?.filter((g) => {
        if (stageFilter.size > 0 && !stageFilter.has(g.stage)) return false
        if (genreFilter.size > 0 && !g.genres.some((x) => genreFilter.has(x))) return false
        if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
        return true
      }),
    [games.data, stageFilter, genreFilter, search],
  )

  const toggleStage = (s: string) =>
    setStageFilter((p) => {
      const n = new Set(p)
      if (n.has(s)) n.delete(s)
      else n.add(s)
      return n
    })
  const toggleGenre = (g: string) =>
    setGenreFilter((p) => {
      const n = new Set(p)
      if (n.has(g)) n.delete(g)
      else n.add(g)
      return n
    })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-up-text">{t.games.library}</h1>
          <p className="mt-1 text-xs text-up-dim">
            <Link to={`/groups/${id}`} className="text-up-dim transition-colors hover:text-up-orange">
              {t.games.group}
            </Link>
            {' · '}
            <span className="tabular-nums">{games.data?.length ?? 0}</span> {t.games.gamesLabel}
          </p>
        </div>
        <Button variant="subtle" size="sm" onClick={() => setShowForm(true)}>
          {t.games.addGame}
        </Button>
      </header>

      <AnimatePresence>
        {showForm && (
          <GameCreateForm
            groupId={id}
            onCreated={(createdId) => {
              setShowForm(false)
              navigate(`/groups/${id}/games/${createdId}`)
            }}
            onCancel={() => setShowForm(false)}
          />
        )}
      </AnimatePresence>

      {games.data && games.data.length > 0 && (
        <GameFilters
          search={search}
          onSearch={setSearch}
          stageFilter={stageFilter}
          toggleStage={toggleStage}
          genreFilter={genreFilter}
          toggleGenre={toggleGenre}
          topGenres={topGenres}
          totalShown={filteredGames?.length ?? 0}
          totalAll={games.data.length}
          onClear={() => {
            setStageFilter(new Set())
            setGenreFilter(new Set())
            setSearch('')
          }}
        />
      )}

      {games.isLoading && <GameGridSkeleton count={8} />}
      {games.error && <ErrorBox error={games.error} />}
      {games.data && games.data.length === 0 && (
        <EmptyState
          glyph="◇"
          title={t.games.emptyLibrary}
          hint={t.games.emptyHint}
          action={<Button onClick={() => setShowForm(true)}>{t.games.addFirstGame}</Button>}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredGames?.map((g, i) => (
          <GameCard key={g.id} game={g} index={i} groupId={id} />
        ))}
      </div>
    </div>
  )
}
