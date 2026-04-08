import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useGames } from '@/features/games/hooks'
import { useMembers } from '@/features/groups/hooks'
import {
  useCreateSession,
  useDeleteSession,
  useSessions,
  useSetRsvp,
} from '@/features/sessions/hooks'
import type { PlaySession, SessionRsvp } from '@/features/sessions/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/nerv/Avatar'
import { steamCover } from '@/lib/steamCover'

const HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08..23
const WEEKDAYS = ['seg', 'ter', 'qua', 'qui', 'sex', 'sab', 'dom']
const RSVPS: { v: SessionRsvp; label: string; tone: string }[] = [
  { v: 'yes', label: 'vou', tone: 'text-nerv-green border-nerv-green/60' },
  { v: 'maybe', label: 'talvez', tone: 'text-nerv-amber border-nerv-amber/60' },
  { v: 'no', label: 'não', tone: 'text-nerv-red/80 border-nerv-red/40' },
]

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

function googleCalendarUrl(title: string, start: Date, durationMin: number, details: string) {
  const end = new Date(start.getTime() + durationMin * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${fmt(start)}/${fmt(end)}`, details })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function SessionsPage() {
  const { id = '' } = useParams()
  const sessions = useSessions(id)
  const games = useGames(id)
  const members = useMembers(id)
  const create = useCreateSession(id)
  const del = useDeleteSession(id)
  const rsvp = useSetRsvp(id)
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
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const cardRefs = useMemo(() => new Map<string, HTMLDivElement>(), [])
  const focusSession = (sid: string) => {
    const el = cardRefs.get(sid)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightId(sid)
      setTimeout(() => setHighlightId((cur) => (cur === sid ? null : cur)), 1600)
    }
  }

  const memberName = (uid: string) => {
    const m = members.data?.find((mb) => mb.user_id === uid)
    return m?.user?.discord_display_name ?? m?.user?.discord_username ?? '?'
  }
  const memberAvatar = (uid: string) => members.data?.find((m) => m.user_id === uid)?.user ?? undefined

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
        </div>
      </header>

      {sessions.isLoading && <Loading />}
      {sessions.error && <ErrorBox error={sessions.error} />}

      <div className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30">
        <div className="grid min-w-[760px]" style={{ gridTemplateColumns: '40px repeat(7, 1fr)' }}>
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
                    className={`relative h-14 border-l border-t border-nerv-orange/5 ${
                      isPast ? 'bg-nerv-line/5' : ''
                    }`}
                  >
                    {inSlot.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => !isPast && openDraft(slot)}
                        disabled={isPast}
                        className={`absolute inset-0 ${isPast ? 'cursor-not-allowed' : 'hover:bg-nerv-orange/5'}`}
                      />
                    ) : (
                      <span className="absolute inset-x-0.5 top-0.5 bottom-0.5 flex gap-0.5">
                        {inSlot.map((s) => {
                          const game = games.data?.find((g) => g.id === s.game_id)
                          const cover = game ? steamCover(game) : null
                          const gName = (game as { name?: string } | undefined)?.name
                          const st = new Date(s.start_at)
                          return (
                            <button
                              key={s.id}
                              type="button"
                              onClick={() => focusSession(s.id)}
                              className={`group/slot relative flex min-w-0 flex-1 items-stretch overflow-hidden rounded-[3px] text-left shadow-sm ring-1 transition-all hover:scale-[1.02] hover:shadow-lg ${
                                isPast
                                  ? 'bg-nerv-panel/60 ring-nerv-line/30'
                                  : 'bg-gradient-to-br from-nerv-orange/25 via-nerv-orange/10 to-nerv-magenta/15 ring-nerv-orange/50 hover:ring-nerv-orange'
                              }`}
                            >
                              {cover ? (
                                <span className="relative block w-[38%] shrink-0 overflow-hidden">
                                  <img
                                    src={cover}
                                    alt=""
                                    className={`h-full w-full object-cover ${isPast ? 'opacity-40 grayscale' : 'opacity-90'}`}
                                  />
                                  <span className="absolute inset-0 bg-gradient-to-r from-transparent to-nerv-panel/60" />
                                </span>
                              ) : (
                                <span className={`grid w-[38%] shrink-0 place-items-center ${isPast ? 'bg-nerv-line/20' : 'bg-nerv-orange/20'} font-display text-lg ${isPast ? 'text-nerv-dim/50' : 'text-nerv-orange/70'}`}>
                                  ◈
                                </span>
                              )}
                              <span className="flex min-w-0 flex-1 flex-col justify-center px-1.5 py-0.5">
                                <span className={`truncate font-display text-[11px] leading-tight ${isPast ? 'text-nerv-dim' : 'text-nerv-text'}`}>
                                  {s.title}
                                </span>
                                <span className={`mt-0.5 truncate font-mono text-[8px] uppercase tracking-wider ${isPast ? 'text-nerv-dim/60' : 'text-nerv-orange/80'}`}>
                                  {String(st.getHours()).padStart(2, '0')}:{String(st.getMinutes()).padStart(2, '0')} · {s.rsvp_yes}
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
                                  <span className="text-nerv-green">{s.rsvp_yes}</span> vão ·<span className="text-nerv-amber">{s.rsvp_maybe}</span> talvez · <span className="text-nerv-red/70">{s.rsvp_no}</span> fora
                                </span>
                              </span>
                            </button>
                          )
                        })}
                      </span>
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

      {upcoming.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-[11px] uppercase tracking-wider text-nerv-dim">próximas</h2>
          <div className="space-y-2">
            {upcoming.map((s) => (
              <SessionCard
                key={s.id}
                s={s}
                game={games.data?.find((g) => g.id === s.game_id)}
                onRsvp={(v) => rsvp.mutate({ sessionId: s.id, status: v })}
                onDelete={() => del.mutate(s.id)}
                groupId={id}
                memberName={memberName}
                memberAvatar={memberAvatar}
                highlight={highlightId === s.id}
                registerRef={(el) => {
                  if (el) cardRefs.set(s.id, el)
                  else cardRefs.delete(s.id)
                }}
              />
            ))}
          </div>
        </section>
      )}

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
                  <div key={s.id} className="flex gap-3 rounded-sm border border-nerv-line/60 bg-nerv-panel/30 p-3 transition-colors hover:border-nerv-orange/30">
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
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}

      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDraft(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-sm border border-nerv-orange/30 bg-nerv-panel p-5 shadow-[0_0_60px_rgba(255,102,0,0.12)]"
            >
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-nerv-dim">agendar</div>
                <div className="mt-1 font-display text-lg text-nerv-text">
                  {draft.start.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </div>
                <div className="text-sm text-nerv-orange">
                  {draft.start.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-nerv-dim">jogo</div>
                  <select
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus:border-nerv-orange focus:outline-none"
                  >
                    <option value="">selecione...</option>
                    {games.data?.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-nerv-dim">titulo (opcional)</div>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="usa o nome do jogo se vazio"
                    className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-sm text-nerv-text focus:border-nerv-orange focus:outline-none"
                  />
                </div>
                <div>
                  <div className="mb-1 text-[10px] uppercase tracking-wider text-nerv-dim">duracao</div>
                  <div className="flex gap-1">
                    {[60, 120, 180, 240].map((m) => (
                      <button
                        key={m}
                        onClick={() => setDuration(m)}
                        className={`flex-1 rounded-sm border px-2 py-1.5 text-xs transition-all ${
                          duration === m ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange' : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                        }`}
                      >
                        {m / 60}h
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setDraft(null)}
                  className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim hover:border-nerv-line/70 hover:text-nerv-text"
                >
                  cancelar
                </button>
                <button
                  onClick={onSave}
                  disabled={!gameId || create.isPending}
                  className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/25 disabled:opacity-40"
                >
                  {create.isPending ? 'salvando...' : 'agendar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const RSVP_RING: Record<SessionRsvp, string> = {
  yes: 'ring-nerv-green/70',
  maybe: 'ring-nerv-amber/70',
  no: 'ring-nerv-red/40',
}

function RsvpAvatarRow({
  rsvps,
  status,
  memberName,
  memberAvatar,
}: {
  rsvps: PlaySession['rsvps']
  status: SessionRsvp
  memberName: (uid: string) => string
  memberAvatar: (uid: string) => { discord_id?: string; discord_avatar?: string | null; role?: string } | undefined
}) {
  const filtered = rsvps.filter((r) => r.status === status)
  if (filtered.length === 0) return null
  return (
    <div className="flex -space-x-1.5">
      {filtered.slice(0, 8).map((r) => {
        const u = memberAvatar(r.user_id)
        return (
          <div key={r.user_id} className="group/av relative">
            <Avatar
              discordId={u?.discord_id}
              hash={u?.discord_avatar}
              name={memberName(r.user_id)}
              size="xs"
              className={`ring-2 ring-nerv-panel ${RSVP_RING[status]}`}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded-sm border border-nerv-orange/30 bg-nerv-panel px-2 py-1 text-[10px] text-nerv-text opacity-0 shadow-lg transition-opacity group-hover/av:opacity-100">
              <div className="font-medium">{memberName(r.user_id)}</div>
              <div className="text-[9px] uppercase tracking-wider text-nerv-dim">
                {status === 'yes' ? 'confirmado' : status === 'maybe' ? 'talvez' : 'fora'}
              </div>
            </div>
          </div>
        )
      })}
      {filtered.length > 8 && (
        <span className="ml-2 text-[10px] text-nerv-dim">+{filtered.length - 8}</span>
      )}
    </div>
  )
}

function SessionCard({
  s, game, onRsvp, onDelete, groupId: _groupId, memberName, memberAvatar, highlight, registerRef,
}: {
  s: PlaySession
  game: ReturnType<typeof Object> | undefined
  onRsvp: (v: SessionRsvp) => void
  onDelete: () => void
  groupId: string
  memberName: (uid: string) => string
  memberAvatar: (uid: string) => { discord_id?: string; discord_avatar?: string | null; role?: string } | undefined
  highlight?: boolean
  registerRef?: (el: HTMLDivElement | null) => void
}) {
  const start = new Date(s.start_at)
  const cover = game ? steamCover(game as never) : null
  const gameName = (game as { name?: string } | undefined)?.name
  const inviteUrl = `${window.location.origin}/share/sessions/${s.id}`
  const [copied, setCopied] = useState(false)
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignora
    }
  }
  return (
    <div
      ref={registerRef}
      className={`flex gap-3 rounded-sm border bg-nerv-panel/30 p-3 transition-all ${
        highlight
          ? 'border-nerv-orange shadow-[0_0_30px_rgba(255,102,0,0.25)]'
          : 'border-nerv-orange/15 hover:border-nerv-orange/40'
      }`}
    >
      {cover && <img src={cover} alt="" className="hidden h-24 w-36 shrink-0 rounded-sm object-cover sm:block" />}
      <div className="min-w-0 flex-1">
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-nerv-text">{s.title}</div>
          {gameName && gameName !== s.title && (
            <div className="truncate text-xs text-nerv-orange/80">{gameName}</div>
          )}
          <div className="mt-0.5 text-[11px] text-nerv-dim">
            {start.toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            {' · '}{s.duration_minutes / 60}h
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-wider text-nerv-dim">
          <span><span className="text-nerv-green tabular-nums">{s.rsvp_yes}</span> vao</span>
          <span><span className="text-nerv-amber tabular-nums">{s.rsvp_maybe}</span> talvez</span>
          <span><span className="text-nerv-red/70 tabular-nums">{s.rsvp_no}</span> fora</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <RsvpAvatarRow rsvps={s.rsvps} status="yes" memberName={memberName} memberAvatar={memberAvatar} />
          <RsvpAvatarRow rsvps={s.rsvps} status="maybe" memberName={memberName} memberAvatar={memberAvatar} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1 text-[10px] uppercase tracking-wider">
          <button
            onClick={onCopy}
            title="copiar link de convite"
            className={`rounded-sm border px-2 py-0.5 transition-all ${
              copied
                ? 'border-nerv-green/60 text-nerv-green'
                : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-orange'
            }`}
          >
            {copied ? 'copiado' : 'convite'}
          </button>
          <a
            href={googleCalendarUrl(s.title, start, s.duration_minutes, gameName ?? '')}
            target="_blank"
            rel="noreferrer"
            className="rounded-sm border border-nerv-line px-2 py-0.5 text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-orange"
          >
            gcal
          </a>
          <button onClick={onDelete} className="ml-auto rounded-sm border border-nerv-line px-2 py-0.5 text-nerv-dim hover:border-nerv-red hover:text-nerv-red">remover</button>
        </div>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5 border-l border-nerv-orange/10 pl-3">
        <div className="text-[9px] uppercase tracking-wider text-nerv-dim">você vai?</div>
        {RSVPS.map((r) => {
          const active = s.user_rsvp === r.v
          return (
            <button
              key={r.v}
              onClick={() => onRsvp(r.v)}
              className={`w-20 rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider transition-all ${
                active ? r.tone : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-text'
              }`}
            >
              {r.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
