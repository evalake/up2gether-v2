import type { ReactNode } from 'react'

type Props = {
  eyebrow?: string
  title: string
  body: ReactNode
  visual: ReactNode
  reverse?: boolean
}

export function MomentRow({ eyebrow, title, body, visual, reverse = false }: Props) {
  return (
    <div
      className={`grid items-center gap-10 md:grid-cols-[1.05fr_1fr] ${reverse ? 'md:[&>:first-child]:order-2' : ''}`}
    >
      <div>
        {eyebrow && (
          <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.35em] text-up-amber">
            {eyebrow}
          </div>
        )}
        <h3 className="font-display text-3xl leading-tight text-up-text sm:text-4xl">
          {title}
        </h3>
        <div className="mt-4 max-w-md text-sm leading-relaxed text-up-dim">{body}</div>
      </div>
      <div>{visual}</div>
    </div>
  )
}
