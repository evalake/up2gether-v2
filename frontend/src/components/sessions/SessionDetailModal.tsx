import { useEffect, useMemo } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { useSessionAudit } from '@/features/sessions/hooks'
import { useSetRsvp, useDeleteSession } from '@/features/sessions/hooks'
import type { SessionRsvp } from '@/features/sessions/api'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

type Props = {
  groupId: string
  sessionId: string | null
  canDelete?: boolean
  onClose: () => void
}

const weekday = (d: Date) =>
  d.toLocaleDateString('pt-BR', { weekday: 'long' })

const dateLine = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })

const hourLine = (d: Date) =>
  d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

function relFuture(ms: number) {
  if (ms <= 0) return null
  const min = Math.round(ms / 60_000)
  if (min < 60) return `em ${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `em ${h}h`
  const d = Math.round(h / 24)
  return `em ${d}d`
}

export function SessionDetailModal({ groupId, sessionId, canDelete, onClose }: Props) {
  const audit = useSessionAudit(groupId, sessionId)
  const rsvp = useSetRsvp(groupId)
  const del = useDeleteSession(groupId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {sessionId && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xl overflow-hidden rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <button
              onClick={onClose}
              aria-label="fechar"
              className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            {audit.isLoading && (
              <div className="p-10"><Loading /></div>
            )}
            {audit.error && (
              <div className="p-6"><ErrorBox error={audit.error} /></div>
            )}
            {audit.data && (
              <Body
                data={audit.data}
                canDelete={canDelete}
                onRsvp={(v) =>
                  rsvp.mutate({ sessionId: audit.data!.session.id, status: v })
                }
                onDelete={async () => {
                  if (!confirm('remover esta sessao?')) return
                  await del.mutateAsync(audit.data!.session.id)
                  onClose()
                }}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({
  data,
  onRsvp,
  onDelete,
  canDelete,
}: {
  data: NonNullable<ReturnType<typeof useSessionAudit>['data']>
  onRsvp: (v: SessionRsvp) => void
  onDelete: () => void
  canDelete?: boolean
}) {
  const toast = useToast()
  const { session, game, creator, rsvps, non_respondents } = data
  const start = useMemo(() => new Date(session.start_at), [session.start_at])
  const end = useMemo(
    () => new Date(start.getTime() + session.duration_minutes * 60_000),
    [start, session.duration_minutes],
  )
  const countdown = relFuture(start.getTime() - Date.now())
  const isPast = start < new Date()

  const yes = rsvps.filter((r) => r.status === 'yes')
  const maybe = rsvps.filter((r) => r.status === 'maybe')
  const no = rsvps.filter((r) => r.status === 'no')

  const stagger = {
    animate: { transition: { staggerChildren: 0.04, delayChildren: 0.08 } },
  }
  const pop: Variants = {
    initial: { opacity: 0, y: 6, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
  }

  return (
    <div className="flex flex-col">
      {/* hero */}
      <div className="relative h-40 w-full overflow-hidden">
        {game?.cover_url ? (
          <>
            <img
              src={game.cover_url}
              alt=""
              className="h-full w-full scale-110 object-cover blur-[2px]"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/70 to-nerv-panel/20" />
          </>
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-nerv-orange/20 via-nerv-panel to-nerv-magenta/10" />
        )}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="absolute inset-x-0 bottom-0 p-5"
        >
          {countdown && !isPast && (
            <span className="mb-2 inline-block rounded-full border border-nerv-orange/40 bg-nerv-orange/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-orange">
              {countdown}
            </span>
          )}
          {isPast && (
            <span className="mb-2 inline-block rounded-full border border-nerv-line/60 bg-black/40 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
              ja rolou
            </span>
          )}
          <h2 className="font-display text-2xl leading-tight text-nerv-text">
            {session.title}
          </h2>
          {game && game.name !== session.title && (
            <div className="mt-0.5 truncate text-[11px] text-nerv-orange/80">
              {game.name}
            </div>
          )}
        </motion.div>
      </div>

      {/* meta row */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-nerv-line/30 px-5 py-3 text-[11px] text-nerv-dim"
      >
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
          <span className="capitalize">{weekday(start)}</span>
          <span>·</span>
          <span>{dateLine(start)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
          <span>{hourLine(start)} → {hourLine(end)}</span>
        </div>
        {creator.display_name && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="text-nerv-dim/70">por</span>
            <Avatar discordId={creator.discord_id} hash={creator.avatar_url} name={creator.display_name} size="xs" />
            <span className="text-nerv-text/80">{creator.display_name}</span>
          </div>
        )}
      </motion.div>

      {/* content */}
      <div className="space-y-5 p-5">
        {session.description && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="whitespace-pre-wrap text-[12px] text-nerv-text/70"
          >
            {session.description}
          </motion.p>
        )}

        {/* your rsvp */}
        {!isPast && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-1.5"
          >
            <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
              voce vai?
            </div>
            <div className="flex gap-1.5">
              {(['yes', 'maybe', 'no'] as const).map((v) => {
                const active = session.user_rsvp === v
                const label = v === 'yes' ? 'bora' : v === 'maybe' ? 'talvez' : 'nao rola'
                const tone =
                  v === 'yes'
                    ? 'border-nerv-green/60 bg-nerv-green/10 text-nerv-green'
                    : v === 'maybe'
                      ? 'border-nerv-amber/60 bg-nerv-amber/10 text-nerv-amber'
                      : 'border-red-500/60 bg-red-500/10 text-red-400'
                return (
                  <motion.button
                    key={v}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onRsvp(v)}
                    className={`flex-1 rounded-sm border px-3 py-2 text-[11px] uppercase tracking-wider transition-all ${
                      active
                        ? tone
                        : 'border-nerv-line/60 bg-black/20 text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-text'
                    }`}
                  >
                    {label}
                  </motion.button>
                )
              })}
            </div>
          </motion.div>
        )}

        {/* who */}
        <motion.div
          variants={stagger}
          initial="initial"
          animate="animate"
          className="space-y-3"
        >
          <Group title="bora" tone="text-nerv-green" people={yes} pop={pop} />
          {maybe.length > 0 && (
            <Group title="talvez" tone="text-nerv-amber" people={maybe} pop={pop} />
          )}
          {no.length > 0 && (
            <Group title="nao rola" tone="text-red-400/80" people={no} pop={pop} />
          )}
          {non_respondents.length > 0 && (
            <GroupMuted title="silenciosos" people={non_respondents} pop={pop} />
          )}
        </motion.div>
      </div>

      {/* footer */}
      <div className="flex items-center gap-2 border-t border-nerv-line/30 px-5 py-3">
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(
                `${window.location.origin}/share/sessions/${session.id}`,
              )
              toast.success('link copiado')
            } catch {
              toast.error('falha ao copiar')
            }
          }}
          className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-orange"
        >
          convite
        </button>
        {canDelete && (
          <button
            onClick={onDelete}
            className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-red hover:text-nerv-red"
          >
            remover
          </button>
        )}
      </div>
    </div>
  )
}

type Person = {
  user_id?: string
  id?: string | null
  discord_id: string | null
  display_name: string | null
  avatar_url: string | null
}

function Group({
  title,
  tone,
  people,
  pop,
}: {
  title: string
  tone: string
  people: Person[]
  pop: Variants
}) {
  if (people.length === 0) {
    return (
      <div>
        <div className={`mb-1.5 text-[10px] uppercase tracking-wider ${tone}`}>
          {title} <span className="tabular-nums text-nerv-dim">0</span>
        </div>
        <div className="text-[11px] text-nerv-dim/60">ninguem ainda</div>
      </div>
    )
  }
  return (
    <div>
      <div className={`mb-1.5 text-[10px] uppercase tracking-wider ${tone}`}>
        {title} <span className="tabular-nums">{people.length}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {people.map((p, i) => (
          <motion.div
            key={(p.user_id ?? p.id ?? i) + title}
            variants={pop}
            className="flex items-center gap-1.5 rounded-full border border-nerv-line/40 bg-black/20 px-2 py-1"
          >
            <Avatar
              discordId={p.discord_id}
              hash={p.avatar_url}
              name={p.display_name}
              size="xs"
            />
            <span className="text-[11px] text-nerv-text/80">
              {p.display_name ?? '?'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function GroupMuted({
  title,
  people,
  pop,
}: {
  title: string
  people: Person[]
  pop: Variants
}) {
  return (
    <div>
      <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim/60">
        {title} <span className="tabular-nums">{people.length}</span>
      </div>
      <div className="flex flex-wrap gap-1">
        {people.map((p, i) => (
          <motion.div
            key={(p.id ?? i) + 'mute'}
            variants={pop}
            title={p.display_name ?? '?'}
          >
            <Avatar
              discordId={p.discord_id}
              hash={p.avatar_url}
              name={p.display_name}
              size="xs"
            />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
