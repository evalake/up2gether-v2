import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { Game } from '@/features/games/api'
import { useSetInterest, useToggleOwnership } from '@/features/games/hooks'
import { steamCover } from '@/lib/steamCover'
import { SIGNALS, STAGES, STAGE_COLOR } from '@/lib/constants'

type Props = {
  game: Game
  index: number
  groupId: string
}

export function GameCard({ game: g, index: i, groupId }: Props) {
  const navigate = useNavigate()
  const setInt = useSetInterest(groupId)
  const toggleOwn = useToggleOwnership(groupId)
  const cover = steamCover(g)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
    >
      <div
        onClick={() => navigate(`/groups/${groupId}/games/${g.id}`)}
        className="group relative z-0 cursor-pointer overflow-hidden rounded-sm border border-up-orange/15 bg-up-panel/30 transition-[colors,box-shadow] duration-200 hover:z-10 hover:border-up-orange hover:shadow-[0_0_20px_rgba(255,102,0,0.12)]"
      >
        {cover ? (
          <div className="relative h-26 overflow-hidden">
            <img
              src={cover}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              alt={g.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/30 to-transparent" />
            <div className={`absolute right-2 top-2 rounded-sm bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-sm ${STAGE_COLOR[g.stage]}`}>
              {STAGES.find((s) => s.value === g.stage)?.label ?? g.stage}
            </div>
            {g.is_free && (
              <div className="absolute left-2 top-2 rounded-sm border border-up-green/60 bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-green backdrop-blur-sm">
                gratuito
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-26 items-center justify-center bg-gradient-to-br from-up-line to-black">
            <span className="font-display text-4xl text-up-orange/30">?</span>
          </div>
        )}

        <div className="px-2.5 pb-2 pt-2">
          <div className="mb-1 line-clamp-2 min-h-[2.25rem] text-sm font-semibold leading-tight text-up-text">{g.name}</div>

          <div className="mb-1">
            <div className="mb-0.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-up-dim">
              <span>viabilidade</span>
              <span className="text-up-orange tabular-nums">{g.viability.viability_score.toFixed(0)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-sm bg-up-line/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.viability.viability_score}%` }}
                transition={{ duration: 0.6, delay: i * 0.03 }}
                className="h-full bg-gradient-to-r from-up-orange to-up-amber"
              />
            </div>
          </div>

          <div className="mb-1 flex gap-3 text-[10px] uppercase tracking-wider text-up-dim">
            <span>quero <span className="text-up-green tabular-nums">{g.viability.interest_want_count}</span></span>
            <span>tem <span className="text-up-amber tabular-nums">{g.viability.ownership_count}</span></span>
          </div>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {SIGNALS.map((s) => (
              <button
                key={s.value}
                onClick={() => setInt.mutate({ gameId: g.id, signal: s.value })}
                aria-label={`marcar interesse: ${s.label}`}
                className={`flex-1 rounded-sm border px-1 py-0.5 text-[10px] uppercase tracking-wider min-h-[44px] sm:min-h-0 transition-colors ${
                  g.user_interest === s.value
                    ? `${s.color} bg-current/10`
                    : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleOwn.mutate({ gameId: g.id, owns: !g.user_owns_game }) }}
            className={`mt-1 w-full rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider min-h-[44px] sm:min-h-0 transition-colors ${
              g.user_owns_game
                ? 'border-up-green/40 text-up-green'
                : 'border-up-line/60 text-up-dim hover:border-up-green/40 hover:text-up-green'
            }`}
          >
            {g.user_owns_game ? 'tenho' : 'nao tenho'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
