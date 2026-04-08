import type { ReactNode } from 'react'

type Props = { children: ReactNode; cursor?: boolean }

export function Terminal({ children, cursor = false }: Props) {
  return (
    <div className="border border-nerv-green/40 bg-black p-3 font-mono text-sm text-nerv-green">
      <span className="mr-2 text-nerv-green/60">{'>'}</span>
      <span className={cursor ? 'nerv-cursor' : ''}>{children}</span>
    </div>
  )
}
