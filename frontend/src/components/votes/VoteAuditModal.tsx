import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoteAudit } from '@/features/votes/hooks'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

type Props = {
  groupId: string
  voteId: string | null
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

export function VoteAuditModal({ groupId, voteId, onClose }: Props) {
  const audit = useVoteAudit(groupId, voteId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {voteId && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
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
            className="relative my-8 w-full max-w-3xl overflow-hidden rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <button
              onClick={onClose}
              aria-label="fechar"
              className="absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            <div className="border-b border-nerv-line/40 px-5 py-3">
              <div className="text-[11px] uppercase tracking-wider text-nerv-orange">
                Audit da votacao
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {audit.isLoading && <Loading />}
              {audit.error && <ErrorBox error={audit.error} />}
              {audit.data && <AuditBody data={audit.data} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AuditBody({ data }: { data: NonNullable<ReturnType<typeof useVoteAudit>['data']> }) {
  const { session, creator, games, voters, non_voters } = data
  const gameById = (gid: string) => games.find((g) => g.id === gid)
  const winner = session.winner_game_id ? gameById(session.winner_game_id) : null

  const timeline: { label: string; at: string | null }[] = [
    { label: 'criada', at: session.created_at },
    { label: 'aberta', at: session.opens_at },
    { label: 'fechava em', at: session.closes_at },
    { label: 'fechada', at: session.closed_at },
  ]

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl text-nerv-text">{session.title}</h2>
        {session.description && (
          <p className="mt-1 text-[11px] text-nerv-dim/80">{session.description}</p>
        )}
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span
            className={`rounded-sm border px-2 py-0.5 ${
              session.status === 'open'
                ? 'border-nerv-green/40 text-nerv-green'
                : 'border-nerv-dim/40'
            }`}
          >
            {session.status}
          </span>
          {session.total_stages && session.total_stages > 1 && (
            <span>
              stage {session.current_stage_number}/{session.total_stages}
            </span>
          )}
          <span>
            quorum {session.quorum_count}/{session.eligible_voter_count}
          </span>
        </div>
      </section>

      {winner && (
        <section className="flex items-center gap-3 rounded-sm border border-nerv-green/30 bg-nerv-green/5 p-3">
          {winner.cover_url && (
            <img
              src={winner.cover_url}
              alt=""
              className="h-12 w-20 rounded-sm border border-nerv-green/30 object-cover"
            />
          )}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-nerv-green">
              Vencedor
            </div>
            <div className="font-display text-base text-nerv-text">{winner.name}</div>
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
          {timeline.map(
            (t) =>
              t.at && (
                <div key={t.label} className="flex gap-3">
                  <span className="w-24 text-nerv-dim">{t.label}</span>
                  <span className="text-nerv-text">{fmt(t.at)}</span>
                </div>
              ),
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
          Candidatos ({session.candidate_game_ids.length})
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {session.candidate_game_ids.map((gid) => {
            const g = gameById(gid)
            const count = session.tallies[gid] ?? 0
            const isWinner = gid === session.winner_game_id
            return (
              <div
                key={gid}
                className={`flex items-center gap-2 rounded-sm border p-2 ${
                  isWinner
                    ? 'border-nerv-green/40 bg-nerv-green/5'
                    : 'border-nerv-line/40 bg-black/20'
                }`}
              >
                {g?.cover_url && (
                  <img
                    src={g.cover_url}
                    alt=""
                    className="h-8 w-14 shrink-0 rounded-sm object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-nerv-text">
                    {g?.name ?? '(removido)'}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-nerv-orange tabular-nums">
                  {count}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
          Quem votou ({voters.length})
        </div>
        {voters.length === 0 ? (
          <div className="rounded-sm border border-nerv-line/40 bg-black/20 py-4 text-center text-[11px] text-nerv-dim">
            ninguem votou ainda
          </div>
        ) : (
          <div className="space-y-2">
            {voters.map((v, i) => (
              <div
                key={`${v.user_id}-${v.stage_id ?? 'legacy'}-${i}`}
                className="rounded-sm border border-nerv-line/40 bg-black/20 p-3"
              >
                <div className="flex items-center gap-2">
                  <Avatar
                    discordId={v.discord_id}
                    hash={v.avatar_url}
                    name={v.display_name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-nerv-text">{v.display_name}</div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                      {fmt(v.submitted_at)}
                      {v.stage_number != null && ` · stage ${v.stage_number}`}
                    </div>
                  </div>
                </div>
                {v.approvals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1 pl-10">
                    {v.approvals.map((gid) => {
                      const g = gameById(gid)
                      return (
                        <span
                          key={gid}
                          className="rounded-sm border border-nerv-orange/30 bg-nerv-orange/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-orange"
                        >
                          {g?.name ?? 'removido'}
                        </span>
                      )
                    })}
                  </div>
                )}
                {v.approvals.length === 0 && (
                  <div className="mt-2 pl-10 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    (voto em branco)
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {non_voters.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Ainda nao votaram ({non_voters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_voters.map((p) => (
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
