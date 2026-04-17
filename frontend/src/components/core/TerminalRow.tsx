import type { ReactNode } from 'react'

export function TerminalRow({
  k,
  v,
  color = 'text-up-text',
}: {
  k: string
  v: ReactNode
  color?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-up-line py-1 font-mono text-[11px] last:border-b-0">
      <span className="uppercase tracking-wider text-up-dim">{k}</span>
      <span className={`tabular-nums ${color}`}>{v}</span>
    </div>
  )
}
