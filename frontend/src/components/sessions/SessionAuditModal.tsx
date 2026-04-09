import { useEffect } from 'react'
import { useSessionAudit } from '@/features/sessions/hooks'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

type Props = {
  groupId: string
  sessionId: string | null
  onClose: () => void
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

const statusColor = (s: string) =>
  s === 'yes'
    ? 'border-nerv-green/40 text-nerv-green bg-nerv-green/5'
    : s === 'no'
      ? 'border-red-500/40 text-red-400 bg-red-500/5'
      : 'border-nerv-orange/40 text-nerv-orange bg-nerv-orange/5'

const statusLabel = (s: string) =>
  s === 'yes' ? 'vai' : s === 'no' ? 'nao vai' : 'talvez'

export function SessionAuditModal({ groupId, sessionId, onClose }: Props) {
  const audit = useSessionAudit(groupId, sessionId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!sessionId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-3xl rounded-sm border border-nerv-orange/30 bg-nerv-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-nerv-line/40 px-5 py-3">
          <div className="text-[11px] uppercase tracking-wider text-nerv-orange">
            Audit da sessao
          </div>
          <button
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            fechar [esc]
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5">
          {audit.isLoading && <Loading />}
          {audit.error && <ErrorBox error={audit.error} />}
          {audit.data && <AuditBody data={audit.data} />}
        </div>
      </div>
    </div>
  )
}

function AuditBody({ data }: { data: NonNullable<ReturnType<typeof useSessionAudit>['data']> }) {
  const { session, creator, game, rsvps, non_respondents } = data
  const end = new Date(
    new Date(session.start_at).getTime() + session.duration_minutes * 60_000,
  ).toISOString()

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl text-nerv-text">{session.title}</h2>
        {session.description && (
          <p className="mt-1 text-[11px] text-nerv-dim/80">{session.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="rounded-sm border border-nerv-dim/40 px-2 py-0.5">
            {session.status}
          </span>
          <span>{session.duration_minutes} min</span>
          {session.max_participants != null && (
            <span>max {session.max_participants}</span>
          )}
        </div>
      </section>

      {game && (
        <section className="flex items-center gap-3 rounded-sm border border-nerv-line/40 bg-black/20 p-3">
          {game.cover_url && (
            <img
              src={game.cover_url}
              alt=""
              className="h-12 w-20 rounded-sm border border-nerv-line object-cover"
            />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
              Jogo
            </div>
            <div className="font-display text-base text-nerv-text">{game.name}</div>
          </div>
        </section>
      )}

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
          Criador
        </div>
        <div className="flex items-center gap-2">
          <Avatar
            discordId={creator.discord_id}
            hash={creator.avatar_url}
            name={creator.display_name}
            size="sm"
          />
          <span className="text-sm text-nerv-text">
            {creator.display_name ?? '(desconhecido)'}
          </span>
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
          Timeline
        </div>
        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex gap-3">
            <span className="w-24 text-nerv-dim">criada</span>
            <span className="text-nerv-text">{fmt(session.created_at)}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-24 text-nerv-dim">inicio</span>
            <span className="text-nerv-text">{fmt(session.start_at)}</span>
          </div>
          <div className="flex gap-3">
            <span className="w-24 text-nerv-dim">fim previsto</span>
            <span className="text-nerv-text">{fmt(end)}</span>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
          Respostas ({rsvps.length})
        </div>
        {rsvps.length === 0 ? (
          <div className="rounded-sm border border-nerv-line/40 bg-black/20 py-4 text-center text-[11px] text-nerv-dim">
            ninguem respondeu ainda
          </div>
        ) : (
          <div className="space-y-2">
            {rsvps.map((r) => (
              <div
                key={r.user_id}
                className="flex items-center gap-2 rounded-sm border border-nerv-line/40 bg-black/20 p-3"
              >
                <Avatar
                  discordId={r.discord_id}
                  hash={r.avatar_url}
                  name={r.display_name}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-nerv-text">{r.display_name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {fmt(r.updated_at)}
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-sm border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider ${statusColor(r.status)}`}
                >
                  {statusLabel(r.status)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {non_respondents.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Nao responderam ({non_respondents.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_respondents.map((p) => (
              <div
                key={p.id ?? Math.random()}
                className="flex items-center gap-2 rounded-sm border border-nerv-line/40 bg-black/20 px-2 py-1"
              >
                <Avatar
                  discordId={p.discord_id}
                  hash={p.avatar_url}
                  name={p.display_name}
                  size="xs"
                />
                <span className="text-[11px] text-nerv-dim">
                  {p.display_name ?? '?'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
