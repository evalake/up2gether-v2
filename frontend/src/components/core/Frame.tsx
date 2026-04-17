import type { ReactNode } from 'react'

export function Frame({
  code,
  title,
  right,
  children,
  className = '',
  large = false,
}: {
  code?: string
  title?: string
  right?: ReactNode
  children: ReactNode
  className?: string
  large?: boolean
}) {
  return (
    <div className={`up-frame ${large ? 'up-frame-lg' : ''} relative border border-up-orange/20 bg-up-panel/40 ${className}`}>
      <span className="up-frame-c1" />
      <span className="up-frame-c2" />
      {(code || title || right) && (
        <div className="flex items-center justify-between border-b border-up-orange/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]">
          <div className="flex items-center gap-2 text-up-dim">
            {code && <span className="text-up-orange/70">{code}</span>}
            {title && <span className="up-bracket text-up-text">{title}</span>}
          </div>
          {right && <div className="text-up-dim">{right}</div>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  )
}
