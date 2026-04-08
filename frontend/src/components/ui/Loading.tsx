type Props = { label?: string }

export function Loading({ label = 'carregando' }: Props) {
  return (
    <div className="flex items-center gap-3 text-sm text-nerv-orange">
      <span className="inline-block h-2 w-2 nerv-pulse rounded-full" style={{ background: 'currentColor' }} />
      <span>{label}</span>
    </div>
  )
}
