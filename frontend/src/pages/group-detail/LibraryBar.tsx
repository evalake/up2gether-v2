import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { GameStage } from '@/features/games/api'
import { useT } from '@/i18n'

const STAGE_BORDER: Record<GameStage, string> = {
  exploring: 'border-up-amber',
  campaign: 'border-up-green',
  endgame: 'border-up-orange',
  paused: 'border-up-line',
  abandoned: 'border-up-red',
}
const STAGE_TEXT: Record<GameStage, string> = {
  exploring: 'text-up-amber',
  campaign: 'text-up-green',
  endgame: 'text-up-orange',
  paused: 'text-up-dim',
  abandoned: 'text-up-red',
}
const STAGE_BG: Record<GameStage, string> = {
  exploring: 'bg-up-amber/10',
  campaign: 'bg-up-green/10',
  endgame: 'bg-up-orange/10',
  paused: 'bg-up-line/10',
  abandoned: 'bg-up-red/10',
}

type Props = {
  groupId: string
  breakdown: { stage: GameStage; count: number }[]
}

export function LibraryBar({ groupId, breakdown }: Props) {
  const t = useT()
  const navigate = useNavigate()
  if (breakdown.length === 0) return null
  const total = breakdown.reduce((acc, s) => acc + s.count, 0)
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="space-y-3"
    >
      <button
        type="button"
        onClick={() => navigate(`/groups/${groupId}/games`)}
        className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-dim transition-colors hover:text-up-text"
      >
        {t.games.library} <span className="tabular-nums text-up-orange">{total}</span>
      </button>
      <div className="flex flex-wrap gap-2">
        {breakdown.map((s, i) => (
          <motion.button
            key={s.stage}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.25 + i * 0.06 }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate(`/groups/${groupId}/games?stage=${s.stage}`)}
            className={`flex items-center gap-2 rounded-sm border ${STAGE_BORDER[s.stage]} ${STAGE_BG[s.stage]} px-3 py-2 transition-colors hover:bg-up-panel/50`}
          >
            <span className={`font-display text-lg tabular-nums ${STAGE_TEXT[s.stage]}`}>{s.count}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-up-dim">{t.stageLabels[s.stage]}</span>
          </motion.button>
        ))}
      </div>
    </motion.section>
  )
}
