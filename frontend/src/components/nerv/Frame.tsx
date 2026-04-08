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
    <div className={`nerv-frame ${large ? 'nerv-frame-lg' : ''} relative border border-nerv-orange/20 bg-nerv-panel/40 ${className}`}>
      <span className="nerv-frame-c1" />
      <span className="nerv-frame-c2" />
      {(code || title || right) && (
        <div className="flex items-center justify-between border-b border-nerv-orange/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em]">
          <div className="flex items-center gap-2 text-nerv-dim">
            {code && <span className="text-nerv-orange/70">{code}</span>}
            {title && <span className="nerv-bracket text-nerv-text">{title}</span>}
          </div>
          {right && <div className="text-nerv-dim">{right}</div>}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  )
}
