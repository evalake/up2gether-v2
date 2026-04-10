import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useGames } from '@/features/games/hooks'
import {
  useCreateSession,
  useSessions,
} from '@/features/sessions/hooks'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { useGroup } from '@/features/groups/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { steamCover } from '@/lib/steamCover'
import { useTitle } from '@/lib/useTitle'
import { SlotStack } from './sessions/SlotStack'
import { SessionDraftModal } from './sessions/SessionDraftModal'

const PRIME_HOURS = Array.from({ length: 8 }, (_, i) => i + 16) // 16..23
const FULL_HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08..23
const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const MAX_FUTURE_YEARS = 1

function startOfWeek(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}
const addDays = (d: Date, n: number) => {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

export function SessionsPage() {
  const { id = '' } = useParams()
  const sessions = useSessions(id)
  const games = useGames(id)
  const create = useCreateSession(id)
  const toast = useToast()

  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()))
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])
  const [draft, setDraft] = useState<{ start: Date } | null>(null)
  const [title, setTitle] = useState('')
  const [gameId, setGameId] = useState('')
  const [duration, setDuration] = useState(120)
  const [openPast, setOpenPast] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  useEffect(() => {
    if (detailId && sessions.data && !sessions.data.some((s) => s.id === detailId)) {
      setDetailId(null)
    }
  }, [detailId, sessions.data])
  const [fullDay, setFullDay] = useState(false)
  const HOURS = useMemo(() => {
    if (fullDay) return FULL_HOURS
    // auto-expand se tiver sessao fora do prime
    const extras = new Set<number>()
    for (const s of sessions.data ?? []) {
      const h = new Date(s.start_at).getHours()
      const d = new Date(s.start_at)
      if (d >= weekAnchor && d < addDays(weekAnchor, 7) && (h < 16 || h > 23)) {
        extras.add(h)
      }
    }
    if (extras.size === 0) return PRIME_HOURS
    return Array.from(new Set([...PRIME_HOURS, ...extras])).sort((a, b) => a - b)
  }, [fullDay, sessions.data, weekAnchor])
  const group = useGroup(id)
  useTitle(group.data ? `sessoes · ${group.data.name}` : undefined)
  const canDelete =
    group.data?.user_role === 'admin' || group.data?.user_role === 'mod'

  const openDraft = (start: Date) => {
    if (start < new Date()) return
    setDraft({ start })
    setTitle('')
    setGameId('')
    setDuration(120)
  }

  const onSave = async () => {
    if (!draft || !gameId) return
    if (draft.start < new Date()) {
      toast.error('passado não dá pra agendar, viajante')
      return
    }
    const limit = new Date()
    limit.setFullYear(limit.getFullYear() + MAX_FUTURE_YEARS)
    if (draft.start > limit) {
      toast.error('as chances de todos os amigos estarem vivos é de 0.000000001%, melhor não')
      return
    }
    try {
      await create.mutateAsync({
        game_id: gameId,
        title: title || (games.data?.find((g) => g.id === gameId)?.name ?? 'sessão'),
        start_at: draft.start.toISOString(),
        duration_minutes: duration,
      })
      setDraft(null)
      toast.success('agendado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao agendar')
    }
  }

  const { upcoming, past } = useMemo(() => {
    const now = new Date()
    const all = sessions.data ?? []
    return {
      upcoming: all.filter((s) => new Date(s.start_at) >= now).sort((a, b) => a.start_at.localeCompare(b.start_at)),
      past: all.filter((s) => new Date(s.start_at) < now).sort((a, b) => b.start_at.localeCompare(a.start_at)),
    }
  }, [sessions.data])

  const weekLabel = `${weekAnchor.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} – ${addDays(weekAnchor, 6).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}`

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-nerv-text">sessões</h1>
          <p className="mt-1 text-xs text-nerv-dim">toque num horário livre para agendar</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-nerv-line/60 bg-nerv-panel/40 px-1 py-1 text-[11px] text-nerv-dim">
          <button
            onClick={() => setWeekAnchor(addDays(weekAnchor, -7))}
            aria-label="semana anterior"
            className="grid h-7 w-7 place-items-center rounded-full hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>
          <span className="min-w-[110px] text-center text-nerv-text/90 tabular-nums">{weekLabel}</span>
          <button
            onClick={() => setWeekAnchor(addDays(weekAnchor, 7))}
            aria-label="próxima semana"
            className="grid h-7 w-7 place-items-center rounded-full hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
          <button
            onClick={() => setWeekAnchor(startOfWeek(new Date()))}
            className="ml-1 rounded-full px-3 h-7 text-[10px] uppercase tracking-wider hover:bg-nerv-orange/10 hover:text-nerv-orange transition-colors"
          >
            hoje
          </button>
          <button
            onClick={() => setFullDay((v) => !v)}
            title={fullDay ? 'mostrar so prime time' : 'mostrar dia todo'}
            className={`ml-1 rounded-full px-3 h-7 text-[10px] uppercase tracking-wider transition-colors ${fullDay ? 'bg-nerv-orange/15 text-nerv-orange' : 'hover:bg-nerv-orange/10 hover:text-nerv-orange'}`}
          >
            {fullDay ? 'dia todo' : 'noite'}
          </button>
        </div>
      </header>

      {sessions.isLoading && <Loading />}
      {sessions.error && <ErrorBox error={sessions.error} />}

      {!sessions.isLoading && (sessions.data?.length ?? 0) === 0 && (
        <EmptyState
          glyph="◈"
          title="nada agendado ainda"
          hint="toca num horário livre no calendário abaixo pra marcar a primeira sessão. o grupo inteiro é notificado."
        />
      )}

      {upcoming.length > 0 && (
        <div className="flex items-stretch gap-3">
          {upcoming.slice(0, 4).map((s, idx) => {
            const game = games.data?.find((g) => g.id === s.game_id)
            const cover = game ? steamCover(game) : null
            const st = new Date(s.start_at)
            const gName = (game as { name?: string } | undefined)?.name
            const diffMs = st.getTime() - Date.now()
            const rel =
              diffMs < 3600_000
                ? `em ${Math.max(1, Math.round(diffMs / 60_000))}min`
                : diffMs < 86400_000
                  ? `em ${Math.round(diffMs / 3600_000)}h`
                  : `em ${Math.round(diffMs / 86400_000)}d`
            const isHero = idx === 0
            if (isHero) {
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setWeekAnchor(startOfWeek(st))
                    setDetailId(s.id)
                  }}
                  className="group/hero relative flex h-28 w-[360px] shrink-0 items-stretch overflow-hidden rounded-sm border border-nerv-orange/50 bg-nerv-panel text-left shadow-[0_0_30px_-10px_rgba(255,102,0,0.5)] transition-all hover:border-nerv-orange hover:shadow-[0_0_40px_-8px_rgba(255,102,0,0.7)]"
                >
                  {cover ? (
                    <div className="relative h-full w-40 shrink-0 overflow-hidden">
                      <img src={cover} alt="" className="h-full w-full object-cover transition-transform group-hover/hero:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-nerv-panel/30 to-nerv-panel" />
                    </div>
                  ) : (
                    <div className="grid h-full w-40 shrink-0 place-items-center bg-nerv-orange/15 font-display text-3xl text-nerv-orange/70">◈</div>
                  )}
                  <div className="flex min-w-0 flex-col justify-center gap-1 px-4 pr-6">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-nerv-orange/50 bg-nerv-orange/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-orange">
                      proxima · {rel}
                    </span>
                    <span className="truncate font-display text-lg leading-tight text-nerv-text group-hover/hero:text-nerv-orange">
                      {s.title}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
                      <span>{st.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}</span>
                      <span>·</span>
                      <span>{String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')}</span>
                      {gName && gName !== s.title && (
                        <>
                          <span>·</span>
                          <span className="truncate text-nerv-orange/70">{gName}</span>
                        </>
                      )}
                      {s.user_rsvp && (
                        <span className={`ml-1 h-2 w-2 shrink-0 rounded-full ${s.user_rsvp === 'yes' ? 'bg-nerv-green' : s.user_rsvp === 'maybe' ? 'bg-nerv-amber' : 'bg-nerv-red/70'}`} />
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
                onClick={() => {
                  setWeekAnchor(startOfWeek(st))
                  setDetailId(s.id)
                }}
                className="group/chip flex h-28 w-[200px] shrink-0 items-stretch overflow-hidden rounded-sm border border-nerv-orange/20 bg-nerv-panel/40 text-left transition-all hover:border-nerv-orange/60 hover:bg-nerv-panel"
              >
                {cover ? (
                  <img src={cover} alt="" className="h-full w-20 shrink-0 object-cover opacity-80 group-hover/chip:opacity-100" />
                ) : (
                  <span className="grid h-full w-20 shrink-0 place-items-center bg-nerv-orange/10 font-display text-xl text-nerv-orange/60">◈</span>
                )}
                <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3 pr-4">
                  <span className="max-w-[160px] truncate text-sm text-nerv-text group-hover/chip:text-nerv-orange">{s.title}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {st.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                  </span>
                  <span className="font-mono text-[10px] text-nerv-orange/80">
                    {String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')}
                  </span>
                </span>
                {s.user_rsvp && (
                  <span className={`mr-2 mt-2 h-1.5 w-1.5 shrink-0 self-start rounded-full ${s.user_rsvp === 'yes' ? 'bg-nerv-green' : s.user_rsvp === 'maybe' ? 'bg-nerv-amber' : 'bg-nerv-red/70'}`} />
                )}
              </button>
            )
          })}
          {upcoming.length > 4 && (
            <div className="flex h-28 shrink-0 items-center px-2 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
              +{upcoming.length - 4} no calendario
            </div>
          )}
        </div>
      )}

      <div className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30" style={{ height: 'calc(100vh - 260px)', minHeight: 420 }}>
        <div className="grid h-full min-w-[760px]" style={{ gridTemplateColumns: '40px repeat(7, 1fr)', gridTemplateRows: `auto repeat(${HOURS.length}, minmax(0, 1fr))` }}>
          <div className="border-b border-nerv-orange/10" />
          {WEEKDAYS.map((wd, i) => {
            const day = addDays(weekAnchor, i)
            const today = sameDay(day, new Date())
            return (
              <div key={wd} className={`border-b border-nerv-orange/10 px-2 py-2 text-center text-[10px] uppercase ${today ? 'text-nerv-orange' : 'text-nerv-dim'}`}>
                <div className="tracking-wider">{wd}</div>
                <div className={`mt-0.5 font-display text-base ${today ? '' : 'text-nerv-text/80'}`}>{day.getDate()}</div>
              </div>
            )
          })}
          {HOURS.map((h) => (
            <div key={h} className="contents">
              <div className="border-t border-nerv-orange/5 px-1 py-0.5 text-right font-mono text-[9px] text-nerv-dim/60">
                {String(h).padStart(2, '0')}
              </div>
              {WEEKDAYS.map((_, i) => {
                const day = addDays(weekAnchor, i)
                const slot = new Date(day)
                slot.setHours(h, 0, 0, 0)
                const isPast = slot < now
                const inSlot = (sessions.data ?? []).filter((s) => {
                  const st = new Date(s.start_at)
                  return sameDay(st, day) && st.getHours() === h
                })
                return (
                  <div
                    key={`${h}-${i}`}
                    className={`group/cell relative min-h-[44px] border-l border-t border-nerv-orange/5 ${
                      isPast ? 'bg-nerv-line/5' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => !isPast && openDraft(slot)}
                      disabled={isPast}
                      aria-label="novo horario"
                      className={`absolute inset-0 ${isPast ? 'cursor-not-allowed' : inSlot.length === 0 ? 'hover:bg-nerv-orange/5' : ''}`}
                    />
                    {inSlot.length > 0 && !isPast && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openDraft(slot) }}
                        aria-label="adicionar outra no mesmo horario"
                        className="absolute right-0.5 top-0.5 z-20 hidden h-4 w-4 place-items-center rounded-full border border-nerv-orange/50 bg-nerv-panel text-[10px] leading-none text-nerv-orange hover:bg-nerv-orange hover:text-nerv-panel group-hover/cell:grid"
                      >
                        +
                      </button>
                    )}
                    {inSlot.length > 0 && (
                      <SlotStack
                        sessions={inSlot}
                        games={games.data ?? []}
                        isPast={isPast}
                        onOpen={(sid) => setDetailId(sid)}
                      />
                    )}
                    {isPast && inSlot.length === 0 && (
                      <span className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent_0,transparent_4px,rgba(255,102,0,0.04)_4px,rgba(255,102,0,0.04)_5px)]" />
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {past.length > 0 && (
        <section className="space-y-3">
          <button
            onClick={() => setOpenPast((v) => !v)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-nerv-dim hover:text-nerv-orange"
          >
            <span>{openPast ? '−' : '+'}</span>
            <span>histórico</span>
            <span className="text-nerv-orange tabular-nums">{past.length}</span>
          </button>
          {openPast && (
            <div className="grid gap-3 sm:grid-cols-2">
              {past.map((s) => {
                const game = games.data?.find((g) => g.id === s.game_id)
                const cover = game ? steamCover(game) : null
                const start = new Date(s.start_at)
                return (
                  <button key={s.id} type="button" onClick={() => setDetailId(s.id)} className="flex gap-3 rounded-sm border border-nerv-line/60 bg-nerv-panel/30 p-3 text-left transition-colors hover:border-nerv-orange/30">
                    {cover ? (
                      <img src={cover} alt="" className="h-20 w-32 shrink-0 rounded-sm object-cover opacity-70" />
                    ) : (
                      <div className="h-20 w-32 shrink-0 rounded-sm bg-nerv-line/20" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
                        {start.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' · '}
                        {start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="mt-0.5 truncate text-sm text-nerv-text/90">{s.title}</div>
                      <div className="mt-1 truncate text-xs text-nerv-dim">{game?.name ?? '?'}</div>
                      <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-nerv-dim">
                        <span><span className="text-nerv-green tabular-nums">{s.rsvp_yes}</span> vieram</span>
                        {s.rsvp_no > 0 && <span><span className="text-nerv-red/70 tabular-nums">{s.rsvp_no}</span> não</span>}
                        <span className="ml-auto text-nerv-dim/70">{s.duration_minutes / 60}h</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {draft && (
          <SessionDraftModal
            start={draft.start}
            games={games.data ?? []}
            gameId={gameId}
            setGameId={setGameId}
            title={title}
            setTitle={setTitle}
            duration={duration}
            setDuration={setDuration}
            onCancel={() => setDraft(null)}
            onSave={onSave}
            isPending={create.isPending}
          />
        )}
      </AnimatePresence>
      <SessionDetailModal
        groupId={id}
        sessionId={detailId}
        canDelete={canDelete}
        onClose={() => setDetailId(null)}
      />
    </div>
  )
}

