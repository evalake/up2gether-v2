import { motion } from 'framer-motion'

export function DeckTile({
  i,
  tone,
  label,
  empty,
  emptyMsg,
  emptyCta,
  onClick,
  cover,
  children,
}: {
  i: number
  tone: 'orange' | 'magenta' | 'amber'
  label: string
  empty?: boolean
  emptyMsg: string
  emptyCta?: string
  onClick: () => void
  cover?: string | null
  children: React.ReactNode
}) {
  const borderTone = {
    orange: 'border-up-orange/25 transition-colors hover:border-up-orange',
    magenta: 'border-up-magenta/25 transition-colors hover:border-up-magenta',
    amber: 'border-up-amber/25 transition-colors hover:border-up-amber',
  }[tone]
  const labelTone = {
    orange: 'text-up-orange',
    magenta: 'text-up-magenta',
    amber: 'text-up-amber',
  }[tone]
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`group relative h-44 overflow-hidden border bg-up-panel/30 text-left transition-colors ${borderTone}`}
      style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
    >
      <span className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${labelTone.replace('text-', 'border-')}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${labelTone.replace('text-', 'border-')}`} />
      {cover && (
        <div className="absolute inset-0">
          <img
            src={cover}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-25 transition-opacity group-hover:opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/80 to-transparent" />
        </div>
      )}
      <div className="relative flex h-full flex-col p-4">
        <div className={`font-mono text-[10px] uppercase tracking-[0.25em] ${labelTone}`}>{label}</div>
        <div className="mt-2 flex-1">
          {empty ? (
            <div className="flex h-full flex-col items-center justify-center gap-1.5 text-center">
              <span className="text-xs text-up-dim">{emptyMsg}</span>
              {emptyCta && (
                <span className={`rounded-sm border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${labelTone} ${labelTone.replace('text-', 'border-')}/40 group-hover:${labelTone.replace('text-', 'bg-')}/10`}>
                  {emptyCta}
                </span>
              )}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </motion.button>
  )
}
