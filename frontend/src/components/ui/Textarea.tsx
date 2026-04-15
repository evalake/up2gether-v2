import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  autoResize?: boolean
  showCounter?: boolean
  className?: string
}

export function Textarea({
  autoResize = true,
  showCounter = true,
  rows = 2,
  maxLength,
  value,
  className,
  ...rest
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    if (!autoResize) return
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }, [value, autoResize])

  const len = typeof value === 'string' ? value.length : 0
  const showCount = showCounter && typeof maxLength === 'number'
  const near = showCount && len >= (maxLength as number) * 0.85

  return (
    <div className="relative">
      <textarea
        ref={ref}
        rows={rows}
        maxLength={maxLength}
        value={value}
        {...rest}
        className={
          className ??
          'w-full resize-none rounded-sm border border-nerv-line bg-black/40 px-2 py-1.5 text-xs transition-colors focus-visible:border-nerv-orange focus-visible:outline-none'
        }
      />
      {showCount && (
        <div
          className={`pointer-events-none absolute bottom-1.5 right-2 font-mono text-[9px] tabular-nums ${
            near ? 'text-nerv-amber' : 'text-nerv-dim/60'
          }`}
        >
          {len}/{maxLength}
        </div>
      )}
    </div>
  )
}
