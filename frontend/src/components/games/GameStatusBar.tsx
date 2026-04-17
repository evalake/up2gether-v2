import { SIGNALS } from '@/lib/constants'
import type { Game } from '@/features/games/api'

export function GameStatusBar({
  game,
  onSetInterest,
  onToggleOwnership,
  setInterestPending,
  toggleOwnPending,
}: {
  game: Game
  onSetInterest: (gameId: string, signal: string) => void
  onToggleOwnership: (gameId: string, owns: boolean) => void
  setInterestPending: boolean
  toggleOwnPending: boolean
}) {
  return (
    <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* interesse */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-up-dim">seu interesse</span>
          {SIGNALS.map((s) => (
            <button
              key={s.value}
              disabled={setInterestPending}
              aria-pressed={game.user_interest === s.value}
              onClick={() => onSetInterest(game.id, s.value)}
              className={`min-h-[44px] rounded-sm border px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 sm:min-h-0 ${
                game.user_interest === s.value
                  ? `${s.color} bg-current/10`
                  : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* biblioteca */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-up-dim">biblioteca</span>
          <button
            disabled={toggleOwnPending}
            aria-pressed={game.user_owns_game}
            onClick={() => onToggleOwnership(game.id, !game.user_owns_game)}
            className={`min-h-[44px] rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors disabled:opacity-40 sm:min-h-0 ${
              game.user_owns_game
                ? 'border-up-green/60 bg-up-green/10 text-up-green'
                : 'border-up-line text-up-dim hover:border-up-green hover:text-up-green'
            }`}
          >
            {game.user_owns_game ? 'tenho' : 'nao tenho'}
          </button>
        </div>
      </div>
    </section>
  )
}
