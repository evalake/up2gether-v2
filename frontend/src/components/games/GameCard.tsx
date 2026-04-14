import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { Game } from '@/features/games/api'
import { useSetInterest, useToggleOwnership } from '@/features/games/hooks'
import { steamCover } from '@/lib/steamCover'
import { SIGNALS, STAGE_COLOR } from '@/lib/constants'

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
        className="group relative cursor-pointer overflow-hidden rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 transition-all hover:-translate-y-0.5 hover:border-nerv-orange/50 hover:shadow-lg hover:shadow-black/20"
      >
        {cover ? (
          <div className="relative h-32 overflow-hidden">
            <img
              src={cover}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              alt={g.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/30 to-transparent" />
            <div className={`absolute right-2 top-2 rounded-sm bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-sm ${STAGE_COLOR[g.stage]}`}>
              {g.stage}
            </div>
            {g.is_free && (
              <div className="absolute left-2 top-2 rounded-sm border border-nerv-green/60 bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-nerv-green backdrop-blur-sm">
                free
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center bg-gradient-to-br from-nerv-line to-black">
            <span className="font-display text-4xl text-nerv-orange/30">?</span>
          </div>
        )}

        <div className="p-3">
          <div className="mb-2 truncate text-sm font-semibold text-nerv-text">{g.name}</div>

          <div className="mb-2">
            <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-nerv-dim">
              <span>viabilidade</span>
              <span className="text-nerv-orange">{g.viability.viability_score.toFixed(0)}%</span>
            </div>
            <div className="h-1 overflow-hidden rounded-sm bg-nerv-line">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${g.viability.viability_score}%` }}
                transition={{ duration: 0.6, delay: i * 0.03 }}
                className="h-full bg-gradient-to-r from-nerv-orange to-nerv-amber"
              />
            </div>
          </div>

          <div className="mb-2 flex gap-3 text-[9px] uppercase tracking-wider text-nerv-dim">
            <span>quero <span className="text-nerv-green">{g.viability.interest_want_count}</span></span>
            <span>tem <span className="text-nerv-amber">{g.viability.ownership_count}</span></span>
          </div>

          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            {SIGNALS.map((s) => (
              <button
                key={s.value}
                onClick={() => setInt.mutate({ gameId: g.id, signal: s.value })}
                className={`flex-1 rounded-sm border px-1 py-1 text-[9px] uppercase tracking-wider transition-all ${
                  g.user_interest === s.value
                    ? `${s.color} bg-current/10`
                    : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-text'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); toggleOwn.mutate({ gameId: g.id, owns: !g.user_owns_game }) }}
            className={`mt-1.5 w-full rounded-sm border px-2 py-1 text-[9px] uppercase tracking-wider transition-all ${
              g.user_owns_game
                ? 'border-nerv-green bg-nerv-green/10 text-nerv-green'
                : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
            }`}
          >
            {g.user_owns_game ? '✓ na biblioteca' : 'marcar como tenho'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}
