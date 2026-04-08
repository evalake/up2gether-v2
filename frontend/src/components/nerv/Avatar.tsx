import { useState } from 'react'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { px: number; cls: string; text: string }> = {
  xs: { px: 32, cls: 'h-6 w-6', text: 'text-[9px]' },
  sm: { px: 64, cls: 'h-8 w-8', text: 'text-xs' },
  md: { px: 128, cls: 'h-10 w-10', text: 'text-sm' },
  lg: { px: 256, cls: 'h-16 w-16', text: 'text-lg' },
}

export function Avatar({
  discordId,
  hash,
  name,
  size = 'sm',
  className = '',
}: {
  discordId: string | null | undefined
  hash: string | null | undefined
  name: string | null | undefined
  size?: Size
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const s = SIZE[size]
  const url = !broken && discordId && hash
    ? `https://cdn.discordapp.com/avatars/${discordId}/${hash}.png?size=${s.px}`
    : null
  const initial = (name ?? '?').charAt(0).toUpperCase()
  if (url) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setBroken(true)}
        className={`${s.cls} shrink-0 rounded-full border border-nerv-orange/20 object-cover ${className}`}
      />
    )
  }
  return (
    <div
      className={`${s.cls} ${s.text} shrink-0 flex items-center justify-center rounded-full border border-nerv-orange/30 bg-black/40 font-display text-nerv-orange ${className}`}
    >
      {initial}
    </div>
  )
}
