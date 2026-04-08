import type { ReactNode } from 'react'

export function StatusBar({
  code,
  title,
  subtitle,
  right,
}: {
  code: string
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <div className="mb-4 flex items-center justify-between border-b border-nerv-orange/20 pb-2">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-orange/70">{code}</span>
        <span className="font-display text-lg uppercase tracking-wider text-nerv-text nerv-bracket">{title}</span>
        {subtitle && <span className="text-[11px] text-nerv-dim">{subtitle}</span>}
      </div>
      {right && <div className="text-[11px] text-nerv-dim">{right}</div>}
    </div>
  )
}
