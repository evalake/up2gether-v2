type Props = { error: unknown }

export function ErrorBox({ error }: Props) {
  const msg = error instanceof Error ? error.message : 'erro desconhecido'
  return (
    <div className="flex items-start gap-3 rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-4 py-3">
      <span className="mt-0.5 nerv-pulse text-nerv-red">▲</span>
      <div className="flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-nerv-red">erro</div>
        <div className="mt-0.5 text-sm text-nerv-text">{msg}</div>
      </div>
    </div>
  )
}
