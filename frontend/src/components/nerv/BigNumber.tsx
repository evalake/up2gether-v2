type Props = {
  value: number | string
  label: string
  color?: 'orange' | 'green' | 'magenta' | 'amber'
}

const colorMap: Record<NonNullable<Props['color']>, string> = {
  orange: 'text-nerv-orange',
  green: 'text-nerv-green',
  magenta: 'text-nerv-magenta',
  amber: 'text-nerv-amber',
}

export function BigNumber({ value, label, color = 'orange' }: Props) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-nerv-line bg-black/30 px-3 py-2.5">
      <span className="text-[10px] uppercase tracking-wider text-nerv-dim">{label}</span>
      <span className={`font-display text-2xl tabular-nums leading-none ${colorMap[color]}`}>{value}</span>
    </div>
  )
}
