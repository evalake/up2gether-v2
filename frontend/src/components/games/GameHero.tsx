import type { Game } from '@/features/games/api'
import { formatPlayers } from '@/lib/players'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'

export function GameHero({ game }: { game: Game }) {
  const hero = steamHeaderLarge(game.steam_appid) ?? steamCover(game)
  const cover = steamCover(game)

  return (
    <div className="relative overflow-hidden rounded-sm border border-nerv-orange/20 bg-nerv-panel/30">
      {hero && (
        <div className="absolute inset-0">
          <img
            src={hero}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/70 to-transparent" />
        </div>
      )}
      <div className="relative flex items-end gap-4 p-5">
        {cover && (
          <img
            src={cover}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            className="hidden h-32 w-56 shrink-0 rounded-sm border border-nerv-orange/30 object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-sm border border-nerv-orange/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-orange">{game.stage}</span>
            {game.is_free && (
              <span className="rounded-sm border border-nerv-green/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-green">free to play</span>
            )}
          </div>
          <h1 className="mt-2 font-display text-3xl text-nerv-text">{game.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-nerv-dim">
            {game.developer && <span className="text-nerv-text/70">{game.developer}</span>}
            {game.release_date && <span>{game.release_date}</span>}
            {game.metacritic_score != null && (
              <span className={`rounded-sm px-1.5 py-0.5 ${game.metacritic_score >= 75 ? 'bg-nerv-green/15 text-nerv-green' : game.metacritic_score >= 50 ? 'bg-nerv-amber/15 text-nerv-amber' : 'bg-nerv-red/15 text-nerv-red'}`}>
                metacritic {game.metacritic_score}
              </span>
            )}
            {game.steam_appid && <span>steam #{game.steam_appid}</span>}
            {game.source && game.source !== 'steam' && (
              <span className="rounded-sm border border-nerv-magenta/40 bg-nerv-magenta/10 px-1.5 py-0.5 text-nerv-magenta">{game.source}</span>
            )}
            <span>jogadores {formatPlayers(game.player_min, game.player_max, game.tags)}</span>
            <span>hardware {game.min_hardware_tier}</span>
          </div>
          {!game.is_free && game.discount_percent != null && game.discount_percent > 0 && game.price_original && game.price_current && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="text-nerv-dim line-through tabular-nums">R$ {game.price_original.toFixed(2)}</span>
              <span className="text-nerv-green tabular-nums">R$ {game.price_current.toFixed(2)}</span>
              <span className="rounded-sm bg-nerv-green/20 px-1.5 py-0.5 text-[10px] text-nerv-green">-{game.discount_percent}%</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
