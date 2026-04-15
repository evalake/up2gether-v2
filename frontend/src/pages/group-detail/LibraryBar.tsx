import { motion } from 'framer-motion'
import type { GameStage } from '@/features/games/api'

const STAGE_LABEL: Record<GameStage, string> = {
  exploring: 'explorando',
  campaign: 'em campanha',
  endgame: 'endgame',
  paused: 'pausados',
  abandoned: 'largados',
}
const STAGE_COLOR: Record<GameStage, string> = {
  exploring: 'bg-nerv-orange',
  campaign: 'bg-nerv-green',
  endgame: 'bg-nerv-magenta',
  paused: 'bg-nerv-amber',
  abandoned: 'bg-nerv-line',
}

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

type Props = {
  breakdown: { stage: GameStage; count: number }[]
  onExplore: () => void
}

export function LibraryBar({ breakdown, onExplore }: Props) {
  if (breakdown.length === 0) return null
  const total = breakdown.reduce((acc, s) => acc + s.count, 0)
  return (
    <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-dim">
        <span>biblioteca</span>
        <button onClick={onExplore} className="transition-colors hover:text-nerv-orange">
          explorar →
        </button>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-nerv-line/30">
        {breakdown.map((s, i) => (
          <motion.div
            key={s.stage}
            initial={{ width: 0 }}
            animate={{ width: `${(s.count / total) * 100}%` }}
            transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
            className={`${STAGE_COLOR[s.stage]}`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
        {breakdown.map((s) => (
          <span key={s.stage} className="flex items-center gap-1.5">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${STAGE_COLOR[s.stage]}`} />
            {STAGE_LABEL[s.stage]}{' '}
            <span className="tabular-nums text-nerv-text/80">{s.count}</span>
          </span>
        ))}
      </div>
    </motion.section>
  )
}
