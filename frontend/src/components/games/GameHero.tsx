import type { Game } from '@/features/games/api'
import { formatPlayers } from '@/lib/players'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import { STAGE_COLOR, STAGE_BORDER } from '@/lib/constants'
import { useStages, useT } from '@/i18n'

export function GameHero({ game }: { game: Game }) {
  const t = useT()
  const stages = useStages()
  const hero = steamHeaderLarge(game.steam_appid) ?? steamCover(game)
  const cover = steamCover(game)
  const onSale = !game.is_free && game.discount_percent != null && game.discount_percent > 0 && game.price_original != null

  return (
    <div className="relative overflow-hidden rounded-sm border border-up-orange/15 bg-up-panel/30">
      {hero && (
        <div className="absolute inset-0">
          <img
            src={hero}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/70 to-transparent" />
        </div>
      )}
      <div className="relative flex items-end gap-3 p-4">
        {cover && (
          <img
            src={cover}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            className="hidden h-28 w-48 shrink-0 rounded-sm border border-up-orange/30 object-cover sm:block"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider ${STAGE_COLOR[game.stage] ?? 'text-up-dim'} ${STAGE_BORDER[game.stage] ?? 'border-up-dim'}`}>
              {stages.find((s) => s.value === game.stage)?.label ?? game.stage}
            </span>
            {game.is_free && (
              <span className="rounded-sm border border-up-green/60 bg-up-green/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-green">{t.games.freeToPlay}</span>
            )}
          </div>

          <h1 className="mt-1.5 font-display text-2xl text-up-text">{game.name}</h1>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-1 text-[11px] tracking-wide text-up-dim">
            {game.developer && <span className="text-up-text">{game.developer}</span>}
            {game.release_date && <>{game.developer && <span className="text-up-line">&middot;</span>}<span>{game.release_date}</span></>}
            {game.metacritic_score != null && (
              <>
                <span className="text-up-line">&middot;</span>
                <span className={`rounded-sm px-1.5 py-0.5 font-mono tabular-nums ${game.metacritic_score >= 75 ? 'bg-up-green/15 text-up-green' : game.metacritic_score >= 50 ? 'bg-up-amber/15 text-up-amber' : 'bg-up-red/15 text-up-red'}`}>
                  {game.metacritic_score}
                </span>
              </>
            )}
            {game.steam_appid && <><span className="text-up-line">&middot;</span><span className="font-mono tabular-nums">Steam #{game.steam_appid}</span></>}
            {game.source && game.source !== 'steam' && (
              <><span className="text-up-line">&middot;</span><span className="rounded-sm border border-up-magenta/40 bg-up-magenta/10 px-1.5 py-0.5 text-up-magenta">{game.source}</span></>
            )}
            <span className="text-up-line">&middot;</span>
            <span>{formatPlayers(game.player_min, game.player_max, game.tags)} {t.games.players}</span>
            <span className="text-up-line">&middot;</span>
            <span>{t.games.hardware} {{ low: t.games.hwLight, mid: t.games.hwMedium, high: t.games.hwHeavyLabel, unknown: t.games.hwNA }[game.min_hardware_tier] ?? game.min_hardware_tier}</span>
          </div>

          {onSale && game.price_current != null && (
            <div className="mt-2 flex items-center gap-2">
              <span className="rounded-sm bg-up-green px-2 py-0.5 font-mono text-sm font-bold tabular-nums text-black">
                -{game.discount_percent}%
              </span>
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-[10px] tabular-nums text-up-dim line-through">
                  R$ {game.price_original!.toFixed(2)}
                </span>
                <span className="font-display text-base tabular-nums text-up-green">
                  R$ {game.price_current.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {!onSale && !game.is_free && game.price_current != null && (
            <div className="mt-1.5">
              <span className="font-display text-base tabular-nums text-up-orange">
                R$ {game.price_current.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
