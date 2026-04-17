type Props = { jp: string; en: string; className?: string }

// accent discreto: kanji minusculo + texto en
export function KanjiLabel({ jp, en, className = '' }: Props) {
  return (
    <div className={`flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-up-dim ${className}`}>
      <span className="font-display text-up-orange/60">{jp}</span>
      <span>{en}</span>
    </div>
  )
}
