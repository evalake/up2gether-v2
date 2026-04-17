import type { ReactNode } from 'react'

type Props = {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}

export function SettingsCard({ title, description, action, children }: Props) {
  return (
    <section className="rounded-sm border border-up-line bg-up-panel/40 p-5">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base text-up-text">{title}</h2>
          {description && (
            <p className="mt-1 text-xs leading-relaxed text-up-dim">{description}</p>
          )}
        </div>
        {action}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  )
}
