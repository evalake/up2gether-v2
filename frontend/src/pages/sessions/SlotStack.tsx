import { useState } from 'react'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'

export function SlotStack({
  sessions,
  games,
  isPast,
  onOpen,
}: {
  sessions: PlaySession[]
  games: Game[]
  isPast: boolean
  onOpen: (id: string) => void
}) {
  const [active, setActive] = useState(0)
  const idx = Math.min(active, sessions.length - 1)
  const s = sessions[idx]
  const game = games.find((g) => g.id === s.game_id)
  const cover = game ? steamCover(game) : null
  const gName = game?.name
  const st = new Date(s.start_at)
  const multi = sessions.length > 1
  return (
    <span className="absolute inset-0.5 z-10 flex flex-col">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onOpen(s.id) }}
        className={`group/slot relative flex min-h-0 flex-1 items-stretch overflow-hidden rounded-[3px] text-left shadow-sm ring-1 transition-all hover:scale-[1.02] hover:shadow-lg ${
          isPast
            ? 'bg-nerv-panel/60 ring-nerv-line/30'
            : 'bg-gradient-to-br from-nerv-orange/25 via-nerv-orange/10 to-nerv-magenta/15 ring-nerv-orange/50 hover:ring-nerv-orange'
        }`}
      >
        {cover ? (
          <span className="relative block w-[40%] shrink-0 overflow-hidden">
            <img src={cover} alt="" className={`h-full w-full object-cover ${isPast ? 'opacity-40 grayscale' : 'opacity-90'}`} />
            <span className="absolute inset-0 bg-gradient-to-r from-transparent to-nerv-panel/60" />
          </span>
        ) : (
          <span className={`grid w-[40%] shrink-0 place-items-center ${isPast ? 'bg-nerv-line/20' : 'bg-nerv-orange/20'} font-display text-lg ${isPast ? 'text-nerv-dim/50' : 'text-nerv-orange/70'}`}>◈</span>
        )}
        <span className="flex min-w-0 flex-1 flex-col justify-center px-2 py-1">
          <span className={`truncate font-display text-[12px] leading-tight ${isPast ? 'text-nerv-dim' : 'text-nerv-text'}`}>
            {s.title}
          </span>
          <span className={`mt-0.5 truncate font-mono text-[9px] uppercase tracking-wider ${isPast ? 'text-nerv-dim/60' : 'text-nerv-orange/80'}`}>
            {String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')} · {s.rsvp_yes} vao
          </span>
        </span>
        <span className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-56 -translate-x-1/2 rounded-sm border border-nerv-orange/40 bg-nerv-panel p-2 text-left text-[10px] shadow-lg group-hover/slot:block">
          <span className="block truncate font-medium text-nerv-text">{s.title}</span>
          {gName && gName !== s.title && (
            <span className="block truncate text-nerv-orange/80">{gName}</span>
          )}
          <span className="mt-1 block text-nerv-dim">
            {st.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {s.duration_minutes / 60}h
          </span>
          <span className="mt-1 block text-nerv-dim">
            <span className="text-nerv-green">{s.rsvp_yes}</span> vao · <span className="text-nerv-amber">{s.rsvp_maybe}</span> talvez · <span className="text-nerv-red/70">{s.rsvp_no}</span> fora
          </span>
        </span>
      </button>
      {multi && (
        <span className="flex h-3 shrink-0 items-center justify-center gap-1 pt-0.5">
          {sessions.map((ss, i) => (
            <button
              key={ss.id}
              type="button"
              onClick={(e) => { e.stopPropagation(); setActive(i) }}
              aria-label={`sessao ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-4 bg-nerv-orange' : 'w-1.5 bg-nerv-orange/30 hover:bg-nerv-orange/60'}`}
            />
          ))}
        </span>
      )}
    </span>
  )
}
