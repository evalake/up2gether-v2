import { useState } from 'react'
import type { PresenceStatus } from '@/features/groups/api'

type Size = 'xs' | 'sm' | 'md' | 'lg'

const SIZE: Record<Size, { px: number; cls: string; text: string; dot: string }> = {
  xs: { px: 32, cls: 'h-6 w-6', text: 'text-[9px]', dot: 'h-1.5 w-1.5 ring-1' },
  sm: { px: 64, cls: 'h-8 w-8', text: 'text-xs', dot: 'h-2 w-2 ring-2' },
  md: { px: 128, cls: 'h-10 w-10', text: 'text-sm', dot: 'h-2.5 w-2.5 ring-2' },
  lg: { px: 256, cls: 'h-16 w-16', text: 'text-lg', dot: 'h-3.5 w-3.5 ring-2' },
}

const DOT_COLOR: Record<PresenceStatus, string> = {
  online: 'bg-nerv-green',
  idle: 'bg-nerv-amber',
  dnd: 'bg-nerv-red',
  offline: 'bg-nerv-dim/50',
}

export function Avatar({
  discordId,
  hash,
  name,
  size = 'sm',
  className = '',
  presence,
}: {
  discordId: string | null | undefined
  hash: string | null | undefined
  name: string | null | undefined
  size?: Size
  className?: string
  presence?: PresenceStatus
}) {
  const [broken, setBroken] = useState(false)
  const s = SIZE[size]
  const url = !broken && discordId && hash
    ? `https://cdn.discordapp.com/avatars/${discordId}/${hash}.png?size=${s.px}`
    : null
  const initial = (name ?? '?').charAt(0).toUpperCase()
  const avatarEl = url ? (
    <img
      src={url}
      alt=""
      onError={() => setBroken(true)}
      className={`${s.cls} shrink-0 rounded-full border border-nerv-orange/20 object-cover ${className}`}
    />
  ) : (
    <div
      className={`${s.cls} ${s.text} shrink-0 flex items-center justify-center rounded-full border border-nerv-orange/30 bg-black/40 font-display text-nerv-orange ${className}`}
    >
      {initial}
    </div>
  )
  if (!presence) return avatarEl
  return (
    <span className="relative inline-block shrink-0">
      {avatarEl}
      <span
        className={`absolute bottom-0 right-0 block rounded-full ring-nerv-panel ${s.dot} ${DOT_COLOR[presence]}`}
        title={presence}
      />
    </span>
  )
}
