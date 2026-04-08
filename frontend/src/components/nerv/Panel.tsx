import type { ReactNode } from 'react'

type Props = {
  code?: string
  label?: string
  status?: 'normal' | 'caution' | 'warning' | 'alert'
  children: ReactNode
  className?: string
  noPadding?: boolean
  right?: ReactNode
}

const statusColor: Record<NonNullable<Props['status']>, string> = {
  normal: 'text-nerv-green',
  caution: 'text-nerv-amber',
  warning: 'text-nerv-orange',
  alert: 'text-nerv-red',
}

export function Panel({
  code,
  label,
  status = 'normal',
  children,
  className = '',
  noPadding = false,
  right,
}: Props) {
  return (
    <div
      className={`relative rounded-sm border border-nerv-orange/25 bg-nerv-panel/60 backdrop-blur-sm ${className}`}
    >
      {/* corner accents */}
      <span className="pointer-events-none absolute -left-px -top-px h-2 w-2 border-l border-t border-nerv-orange" />
      <span className="pointer-events-none absolute -right-px -top-px h-2 w-2 border-r border-t border-nerv-orange" />
      <span className="pointer-events-none absolute -bottom-px -left-px h-2 w-2 border-b border-l border-nerv-orange" />
      <span className="pointer-events-none absolute -bottom-px -right-px h-2 w-2 border-b border-r border-nerv-orange" />

      {(code || label) && (
        <div className="flex items-center justify-between border-b border-nerv-orange/20 bg-black/30 px-4 py-2 text-xs">
          <div className="flex items-center gap-2">
            {code && <span className="font-mono text-nerv-orange">{code}</span>}
            {label && <span className="uppercase tracking-wider text-nerv-dim">{label}</span>}
          </div>
          {right ?? (
            <span className={`flex items-center gap-1.5 text-[10px] uppercase tracking-wider ${statusColor[status]}`}>
              <span className="inline-block h-1.5 w-1.5 rounded-full nerv-pulse" style={{ background: 'currentColor' }} />
              {status}
            </span>
          )}
        </div>
      )}
      <div className={noPadding ? '' : 'p-4'}>{children}</div>
    </div>
  )
}
