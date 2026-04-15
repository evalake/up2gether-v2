import { useEffect, useMemo, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { useGames } from '@/features/games/hooks'
import { useCreateSession, useSessions } from '@/features/sessions/hooks'
import { SessionDetailModal } from '@/components/sessions/SessionDetailModal'
import { useGroup } from '@/features/groups/hooks'
import { SessionListSkeleton } from '@/components/ui/CardSkeletons'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { useTitle } from '@/lib/useTitle'
import { SessionDraftModal } from './sessions/SessionDraftModal'
import { WeekHeader } from './sessions/WeekHeader'
import { UpcomingStrip } from './sessions/UpcomingStrip'
import { CalendarGrid } from './sessions/CalendarGrid'
import { PastSessions } from './sessions/PastSessions'

const PRIME_HOURS = Array.from({ length: 8 }, (_, i) => i + 16) // 16..23
const FULL_HOURS = Array.from({ length: 16 }, (_, i) => i + 8) // 08..23
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

export function SessionsPage() {
  const { id = '' } = useParams()
  const location = useLocation()
  const sessions = useSessions(id)
  const games = useGames(id)
  const create = useCreateSession(id)
  const toast = useToast()
  const group = useGroup(id)
  useTitle(group.data ? `sessoes · ${group.data.name}` : undefined)

  const [weekAnchor, setWeekAnchor] = useState(() => {
    const state = location.state as { weekOf?: string } | null
    if (state?.weekOf) return startOfWeek(new Date(state.weekOf))
    return startOfWeek(new Date())
  })
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(tick)
  }, [])

  const [draft, setDraft] = useState<{ start: Date } | null>(null)
  const [title, setTitle] = useState('')
  const [gameId, setGameId] = useState('')
  const [duration, setDuration] = useState(120)
  const [openPast, setOpenPast] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [fullDay, setFullDay] = useState(false)

  useEffect(() => {
    if (detailId && sessions.data && !sessions.data.some((s) => s.id === detailId)) {
      setDetailId(null)
    }
  }, [detailId, sessions.data])

  const hours = useMemo(() => {
    if (fullDay) return FULL_HOURS
    const extras = new Set<number>()
    for (const s of sessions.data ?? []) {
      const d = new Date(s.start_at)
      const h = d.getHours()
      if (d >= weekAnchor && d < addDays(weekAnchor, 7) && (h < 16 || h > 23)) {
        extras.add(h)
      }
    }
    if (extras.size === 0) return PRIME_HOURS
    return Array.from(new Set([...PRIME_HOURS, ...extras])).sort((a, b) => a - b)
  }, [fullDay, sessions.data, weekAnchor])

  const canDelete = group.data?.user_role === 'admin' || group.data?.user_role === 'mod'

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
    const nowDate = new Date()
    const all = sessions.data ?? []
    return {
      upcoming: all.filter((s) => new Date(s.start_at) >= nowDate).sort((a, b) => a.start_at.localeCompare(b.start_at)),
      past: all.filter((s) => new Date(s.start_at) < nowDate).sort((a, b) => b.start_at.localeCompare(a.start_at)),
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
        <WeekHeader
          weekLabel={weekLabel}
          fullDay={fullDay}
          onPrev={() => setWeekAnchor(addDays(weekAnchor, -7))}
          onNext={() => setWeekAnchor(addDays(weekAnchor, 7))}
          onToday={() => setWeekAnchor(startOfWeek(new Date()))}
          onToggleFullDay={() => setFullDay((v) => !v)}
        />
      </header>

      {sessions.isLoading && <SessionListSkeleton count={4} />}
      {sessions.error && <ErrorBox error={sessions.error} />}

      {!sessions.isLoading && (sessions.data?.length ?? 0) === 0 && (
        <EmptyState
          glyph="◈"
          title="nada agendado ainda"
          hint="toca num horário livre no calendário abaixo pra marcar a primeira sessão. o grupo inteiro é notificado."
        />
      )}

      <UpcomingStrip
        upcoming={upcoming}
        games={games.data ?? []}
        onOpen={(s, st) => {
          setWeekAnchor(startOfWeek(st))
          setDetailId(s.id)
        }}
      />

      <CalendarGrid
        weekAnchor={weekAnchor}
        hours={hours}
        sessions={sessions.data ?? []}
        games={games.data ?? []}
        now={now}
        onOpenSlot={openDraft}
        onOpenDetail={setDetailId}
      />

      <PastSessions
        past={past}
        games={games.data ?? []}
        isOpen={openPast}
        onToggle={() => setOpenPast((v) => !v)}
        onOpenDetail={setDetailId}
      />

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
