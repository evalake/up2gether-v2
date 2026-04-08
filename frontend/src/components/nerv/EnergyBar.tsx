import { motion } from 'framer-motion'

export function EnergyBar({
  label,
  value,
  max = 100,
  color = 'orange',
}: {
  label: string
  value: number
  max?: number
  color?: 'orange' | 'green' | 'amber' | 'magenta'
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  const colorMap = {
    orange: 'bg-nerv-orange',
    green: 'bg-nerv-green',
    amber: 'bg-nerv-amber',
    magenta: 'bg-nerv-magenta',
  }
  return (
    <div className="flex items-center gap-3 font-mono text-[10px]">
      <span className="w-24 shrink-0 uppercase tracking-wider text-nerv-dim">{label}</span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-sm border border-nerv-line bg-black/40">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full ${colorMap[color]}`}
        />
      </div>
      <span className="w-10 shrink-0 text-right tabular-nums text-nerv-text">{Math.round(value)}</span>
    </div>
  )
}
