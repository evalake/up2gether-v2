import type { ReactNode } from 'react'

type Props = { children: ReactNode; cursor?: boolean }

export function Terminal({ children, cursor = false }: Props) {
  return (
    <div className="border border-up-green/40 bg-black p-3 font-mono text-sm text-up-green">
      <span className="mr-2 text-up-green/60">{'>'}</span>
      <span className={cursor ? 'up-cursor' : ''}>{children}</span>
    </div>
  )
}
