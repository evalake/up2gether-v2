import type { ReactNode } from 'react'

type Props = {
  title: string
  hint?: string
  action?: ReactNode
}

export function EmptyState({ title, hint, action }: Props) {
  return (
    <div className="rounded-sm border border-dashed border-nerv-orange/30 bg-black/20 p-10 text-center">
      <p className="text-base font-medium text-nerv-text">{title}</p>
      {hint && <p className="mt-2 text-sm text-nerv-dim">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}
