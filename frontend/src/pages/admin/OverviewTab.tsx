import { Link } from 'react-router-dom'
import type { UseMutationResult } from '@tanstack/react-query'
import { useState } from 'react'
import type { CurrentGameAudit, GroupTier, GroupWithStats } from '@/features/groups/api'
import type { Game } from '@/features/games/api'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'

export type AdminTab = 'overview' | 'games' | 'votes' | 'sessions' | 'members' | 'config' | 'danger'

export function CurrentGameSection({
  groupId,
  currentGame,
  games,
  setCurrent,
}: {
  groupId: string
  currentGame: CurrentGameAudit | undefined
  games: Game[] | undefined
  setCurrent: UseMutationResult<unknown, Error, { gameId: string | null; lockManual?: boolean }>
}) {
  const t = useT()
  const toast = useToast()
  const [gameSearch, setGameSearch] = useState('')

  return (
    <section className="rounded-sm border border-up-green/20 bg-up-green/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-up-green">{t.admin.currentGame}</div>
          <p className="mt-1 text-[11px] text-up-dim">
            {t.admin.currentGameHint}
          </p>
          {currentGame ? (
            <Link
              to={`/groups/${groupId}/games/${currentGame.game_id}`}
              className="mt-3 flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              {currentGame.cover_url && (
                <img loading="lazy" src={currentGame.cover_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-14 w-24 rounded-sm border border-up-green/30 object-cover" />
              )}
              <div className="min-w-0">
                <div className="truncate font-display text-base text-up-text">{currentGame.name}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-up-dim">
                  {currentGame.source === 'manual' ? t.admin.manualLock : t.admin.setByVote}
                </div>
              </div>
            </Link>
          ) : (
            <div className="mt-3 text-[11px] text-up-dim">{t.admin.noCurrentGame}</div>
          )}
        </div>
        {currentGame && (
          <button
            onClick={async () => {
              try {
                await setCurrent.mutateAsync({ gameId: null })
                toast.success(t.admin.unlocked)
              } catch (e) {
                toast.error(e instanceof Error ? e.message : t.common.fail)
              }
            }}
            disabled={setCurrent.isPending}
            aria-label={t.admin.unlock}
            className="shrink-0 rounded-sm border border-up-red/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/10 disabled:opacity-40"
          >
            {t.admin.unlock}
          </button>
        )}
      </div>
      <div className="mt-4">
        <div className="text-[10px] uppercase tracking-wider text-up-dim">{t.admin.swapManually}</div>
        <input
          value={gameSearch}
          onChange={(e) => setGameSearch(e.target.value)}
          placeholder={t.admin.searchGame}
          className="mt-1 h-8 w-full max-w-sm rounded-sm border border-up-line bg-black/40 px-2 text-xs text-up-text focus-visible:border-up-green focus-visible:outline-none"
        />
        {gameSearch && games && (
          <div className="mt-2 max-h-48 overflow-y-auto rounded-sm border border-up-line">
            {games
              .filter((g) => !g.archived_at && g.name.toLowerCase().includes(gameSearch.toLowerCase()))
              .slice(0, 10)
              .map((g) => (
                <button
                  key={g.id}
                  onClick={async () => {
                    try {
                      await setCurrent.mutateAsync({ gameId: g.id, lockManual: true })
                      toast.success(t.admin.becameCurrent(g.name))
                      setGameSearch('')
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : t.common.fail)
                    }
                  }}
                  aria-label={`trocar game atual para ${g.name}`}
                  className="flex w-full items-center gap-2 border-b border-up-line px-2 py-1.5 text-left text-xs text-up-text transition-colors hover:bg-up-green/10"
                >
                  {g.cover_url && <img loading="lazy" src={g.cover_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-6 w-10 rounded-sm object-cover" />}
                  <span className="truncate">{g.name}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function OverviewCounters({
  games, members, votes, sessions, onJump,
}: {
  games: number
  members: number
  votes: number
  sessions: number
  onJump: (t: AdminTab) => void
}) {
  const t = useT()
  const cards: { key: AdminTab; label: string; value: number }[] = [
    { key: 'games', label: t.admin.counters.games, value: games },
    { key: 'members', label: t.admin.counters.members, value: members },
    { key: 'votes', label: t.admin.counters.votes, value: votes },
    { key: 'sessions', label: t.admin.counters.sessions, value: sessions },
  ]
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => onJump(c.key)}
          className="rounded-sm border border-up-line bg-up-panel/20 p-4 text-left transition-[colors,box-shadow] duration-200 hover:border-up-orange hover:shadow-[0_0_20px_rgba(255,102,0,0.12)]"
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{c.label}</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-up-text">{c.value}</div>
        </button>
      ))}
    </section>
  )
}

export function SeatIndicator({ group }: { group: GroupWithStats }) {
  const t = useT()
  const TIER_LABEL: Record<GroupTier, string> = {
    free: t.admin.tiers.free,
    pro: t.admin.tiers.pro,
    community: t.admin.tiers.community,
    creator: t.admin.tiers.creator,
    over: t.admin.tiers.over,
  }
  const { seat_count, seat_limit, tier, legacy_free } = group
  const pct = seat_limit ? Math.min(100, (seat_count / seat_limit) * 100) : 100
  const over = seat_limit != null && seat_count > seat_limit
  const near = seat_limit != null && !over && seat_count >= seat_limit * 0.8
  const barColor = over ? 'bg-up-red' : near ? 'bg-up-orange' : 'bg-up-green'
  return (
    <section className="rounded-sm border border-up-line bg-up-panel/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{t.admin.seats}</span>
          <span className="font-display text-lg tabular-nums text-up-text">{seat_count}</span>
          <span className="font-mono text-[11px] text-up-dim">/ {seat_limit ?? '∞'}</span>
        </div>
        <div className="flex items-center gap-2">
          {legacy_free && (
            <span className="rounded-sm border border-up-green/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-green">
              {t.admin.legacyFree}
            </span>
          )}
          <span className="font-mono text-[10px] uppercase tracking-wider text-up-orange">
            {t.admin.tierLabel(TIER_LABEL[tier])}
          </span>
        </div>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-up-line/30">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-up-dim">
        {over
          ? t.admin.overLimit
          : seat_limit == null
            ? t.admin.noSeatLimit
            : t.admin.seatsAvailable(seat_limit - seat_count, TIER_LABEL[tier])}
      </p>
    </section>
  )
}
