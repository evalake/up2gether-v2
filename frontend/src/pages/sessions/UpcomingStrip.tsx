import type { Game } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import { steamCover } from '@/lib/steamCover'

type Props = {
  upcoming: PlaySession[]
  games: Game[]
  onOpen: (s: PlaySession, start: Date) => void
}

function relLabel(st: Date) {
  const diffMs = st.getTime() - Date.now()
  if (diffMs < 3600_000) return `em ${Math.max(1, Math.round(diffMs / 60_000))}min`
  if (diffMs < 86400_000) return `em ${Math.round(diffMs / 3600_000)}h`
  return `em ${Math.round(diffMs / 86400_000)}d`
}

export function UpcomingStrip({ upcoming, games, onOpen }: Props) {
  if (upcoming.length === 0) return null
  return (
    <div className="flex items-stretch gap-3">
      {upcoming.slice(0, 4).map((s, idx) => {
        const game = games.find((g) => g.id === s.game_id)
        const cover = game ? steamCover(game) : null
        const st = new Date(s.start_at)
        const gName = game?.name
        if (idx === 0) {
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onOpen(s, st)}
              className="group/hero relative flex h-28 w-[360px] shrink-0 items-stretch overflow-hidden rounded-sm border border-up-orange/50 bg-up-panel text-left shadow-[0_0_30px_-10px_rgba(255,102,0,0.5)] transition-all hover:border-up-orange hover:shadow-[0_0_40px_-8px_rgba(255,102,0,0.7)]"
            >
              {cover ? (
                <div className="relative h-full w-40 shrink-0 overflow-hidden">
                  <img loading="lazy" src={cover} alt="" className="h-full w-full object-cover transition-transform group-hover/hero:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-up-panel/30 to-up-panel" />
                </div>
              ) : (
                <div className="grid h-full w-40 shrink-0 place-items-center bg-up-orange/15 font-display text-3xl text-up-orange/70">◈</div>
              )}
              <div className="flex min-w-0 flex-col justify-center gap-1 px-4 pr-6">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-up-orange/50 bg-up-orange/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-up-orange">
                  próxima · {relLabel(st)}
                </span>
                <span className="truncate font-display text-lg leading-tight text-up-text group-hover/hero:text-up-orange">
                  {s.title}
                </span>
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
                  <span>{st.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                  <span>·</span>
                  <span>{String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')}</span>
                  {gName && gName !== s.title && (
                    <>
                      <span>·</span>
                      <span className="truncate text-up-orange/70">{gName}</span>
                    </>
                  )}
                  {s.user_rsvp && (
                    <span className={`ml-1 h-2 w-2 shrink-0 rounded-full ${s.user_rsvp === 'yes' ? 'bg-up-green' : s.user_rsvp === 'maybe' ? 'bg-up-amber' : 'bg-up-red/70'}`} />
                  )}
                </span>
              </div>
            </button>
          )
        }
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s, st)}
            className="group/chip flex h-28 w-[200px] shrink-0 items-stretch overflow-hidden rounded-sm border border-up-orange/20 bg-up-panel/40 text-left transition-all hover:border-up-orange hover:bg-up-panel"
          >
            {cover ? (
              <img loading="lazy" src={cover} alt="" className="h-full w-20 shrink-0 object-cover opacity-80 group-hover/chip:opacity-100" />
            ) : (
              <span className="grid h-full w-20 shrink-0 place-items-center bg-up-orange/10 font-display text-xl text-up-orange">◈</span>
            )}
            <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3 pr-4">
              <span className="max-w-[160px] truncate text-sm text-up-text group-hover/chip:text-up-orange">{s.title}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-up-dim">
                {st.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
              </span>
              <span className="font-mono text-[10px] text-up-orange/80">
                {String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')}
              </span>
            </span>
            {s.user_rsvp && (
              <span className={`mr-2 mt-2 h-1.5 w-1.5 shrink-0 self-start rounded-full ${s.user_rsvp === 'yes' ? 'bg-up-green' : s.user_rsvp === 'maybe' ? 'bg-up-amber' : 'bg-up-red/70'}`} />
            )}
          </button>
        )
      })}
      {upcoming.length > 4 && (
        <div className="flex h-28 shrink-0 items-center px-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
          +{upcoming.length - 4} no calendário
        </div>
      )}
    </div>
  )
}
