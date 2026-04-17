import { useState } from 'react'

type Props = {
  src: string
  name: string
  gradient: string
  className?: string
  showTitle?: boolean
  titleSize?: 'xs' | 'sm' | 'base'
}

// Renderiza capa da Steam com fallback de gradiente + overlay escuro.
// Usado em todas as sims da landing.

export function Cover({ src, name, gradient, className = '', showTitle = true, titleSize = 'xs' }: Props) {
  const [err, setErr] = useState(false)
  const titleCls =
    titleSize === 'base'
      ? 'text-base'
      : titleSize === 'sm'
        ? 'text-sm'
        : 'text-[11px]'

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {!err ? (
        <img
          src={src}
          alt={name}
          onError={() => setErr(true)}
          loading="lazy"
          draggable={false}
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
      {showTitle && (
        <div
          className={`absolute bottom-1 left-2 right-2 truncate font-display ${titleCls} text-up-text drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]`}
        >
          {name}
        </div>
      )}
    </div>
  )
}
