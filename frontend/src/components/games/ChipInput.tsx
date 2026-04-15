import { useState } from 'react'

export function ChipInput({
  label,
  value,
  onChange,
  max,
  placeholder,
}: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  max: number
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (!t || value.includes(t) || value.length >= max) return
    onChange([...value, t])
    setDraft('')
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wider text-nerv-dim">
        <span>{label}</span>
        <span className="text-[10px]">
          {value.length}/{max}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-sm border border-nerv-line bg-black/40 p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-sm border border-nerv-orange/40 bg-nerv-orange/10 px-2 py-0.5 text-[11px] text-nerv-orange">
            {t}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x !== t))}
              title="remover filtro"
              className="transition-colors hover:text-nerv-red"
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault()
              add()
            }
          }}
          onBlur={add}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-xs text-nerv-text placeholder:text-nerv-dim/60 focus-visible:outline-none"
        />
      </div>
    </div>
  )
}
