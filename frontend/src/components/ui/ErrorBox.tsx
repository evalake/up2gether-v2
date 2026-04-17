type Props = { error: unknown }

export function ErrorBox({ error }: Props) {
  const msg = error instanceof Error ? error.message : 'erro desconhecido'
  return (
    <div className="flex items-start gap-3 rounded-md border border-up-red/60 bg-up-red/10 px-4 py-3">
      <span className="mt-0.5 up-pulse text-up-red">▲</span>
      <div className="flex-1">
        <div className="text-xs font-medium uppercase tracking-wider text-up-red">erro</div>
        <div className="mt-0.5 text-sm text-up-text">{msg}</div>
      </div>
    </div>
  )
}
