import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useVoteAudit } from '@/features/votes/hooks'
import { Avatar } from '@/components/core/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'

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
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  useEffect(() => {
    if (!voteId) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, voteId])

  return createPortal(
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
            className="relative my-8 w-full max-w-3xl overflow-hidden rounded-lg border border-up-orange/25 bg-up-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <button
              onClick={onClose}
              aria-label="fechar"
              className="absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-sm bg-black/40 text-up-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-up-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            <div className="border-b border-up-orange/15 px-5 py-3">
              <div className="text-[11px] uppercase tracking-wider text-up-orange">
                Auditoria da votação
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {audit.isLoading && <Loading />}
              {audit.error && <ErrorBox error={audit.error} />}
              {audit.data && (
                <AuditBody data={audit.data} onOpenProfile={setProfileUserId} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
      <MemberProfileModal
        groupId={groupId}
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
      />
    </AnimatePresence>,
    document.body,
  )
}

function AuditBody({
  data,
  onOpenProfile,
}: {
  data: NonNullable<ReturnType<typeof useVoteAudit>['data']>
  onOpenProfile: (userId: string) => void
}) {
  const { session, creator, games, voters, non_voters } = data
  const gameById = (gid: string) => games.find((g) => g.id === gid)
  const winner = session.winner_game_id ? gameById(session.winner_game_id) : null

  const timeline: { label: string; at: string | null }[] = [
    { label: 'criada', at: session.created_at },
    { label: 'aberta', at: session.opens_at },
    { label: 'fechava em', at: session.closes_at },
    { label: 'fechada', at: session.closed_at },
  ]

  // candidatos ordenados por votos (mais votado primeiro)
  const sortedCandidates = [...session.candidate_game_ids].sort((a, b) => {
    const ca = session.tallies[a] ?? 0
    const cb = session.tallies[b] ?? 0
    return cb - ca
  })

  return (
    <div className="space-y-4">
      {/* header enriquecido */}
      <section>
        <h2 className="font-display text-xl text-up-text">{session.title}</h2>
        {session.description && (
          <p className="mt-1 text-[11px] text-up-dim">{session.description}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
          <span
            className={`rounded-sm border px-2 py-0.5 ${
              session.status === 'open'
                ? 'border-up-green/40 text-up-green'
                : 'border-up-dim/40'
            }`}
          >
            {session.status === 'open' ? 'aberta' : 'encerrada'}
          </span>
          <span className="tabular-nums">{voters.length}/{session.eligible_voter_count} votaram</span>
          <span>{session.candidate_game_ids.length} candidatos</span>
          {session.total_stages && session.total_stages > 1 && (
            <span>fase {session.current_stage_number}/{session.total_stages}</span>
          )}
        </div>
      </section>

      {/* vencedor */}
      {winner && (
        <section className="flex items-center gap-3 rounded-sm border border-up-green/30 bg-up-green/5 p-3">
          {winner.cover_url && (
            <img
              src={winner.cover_url}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              className="h-12 w-20 rounded-sm border border-up-green/30 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-up-green">
              Vencedor
            </div>
            <div className="font-display text-base text-up-text">{winner.name}</div>
          </div>
          <span className="shrink-0 rounded-sm border border-up-green/40 bg-up-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-green">
            {session.tallies[session.winner_game_id!] ?? 0} votos
          </span>
        </section>
      )}

      {/* criador + timeline */}
      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-up-dim">Criador</div>
          <button
            type="button"
            onClick={() => creator.id && onOpenProfile(creator.id)}
            disabled={!creator.id}
            className="flex items-center gap-2 rounded-sm transition-colors hover:text-up-orange disabled:cursor-default"
          >
            <Avatar
              discordId={creator.discord_id}
              hash={creator.avatar_url}
              name={creator.display_name}
              size="sm"
            />
            <span className="text-sm text-up-text">
              {creator.display_name ?? '(desconhecido)'}
            </span>
          </button>
        </div>
        <div>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-up-dim">Timeline</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
            {timeline.map(
              (t) =>
                t.at && (
                  <div key={t.label}>
                    <span className="text-up-dim">{t.label}</span>{' '}
                    <span className="text-up-text">{fmt(t.at)}</span>
                  </div>
                ),
            )}
          </div>
        </div>
      </section>

      {/* candidatos ordenados por votos */}
      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
          Candidatos ({session.candidate_game_ids.length})
        </div>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {sortedCandidates.map((gid) => {
            const g = gameById(gid)
            const count = session.tallies[gid] ?? 0
            const isWinner = gid === session.winner_game_id
            return (
              <div
                key={gid}
                className={`flex items-center gap-2 rounded-sm border p-2 ${
                  isWinner
                    ? 'border-up-green/40 bg-up-green/5'
                    : 'border-up-line bg-black/20'
                }`}
              >
                {g?.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt=""
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    className="h-8 w-14 shrink-0 rounded-sm object-cover"
                  />
                ) : (
                  <div className="h-8 w-14 shrink-0 rounded-sm bg-up-line/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-up-text" title={g?.name ?? undefined}>
                    {g?.name ?? '(removido)'}
                  </div>
                </div>
                <div className="shrink-0 font-mono text-[10px] uppercase tracking-wider tabular-nums text-up-orange">
                  {count}
                </div>
                {isWinner && (
                  <span className="shrink-0 rounded-sm bg-up-green/15 px-1 py-0.5 text-[10px] uppercase tracking-wider text-up-green">
                    W
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
          Quem votou ({voters.length})
        </div>
        {voters.length === 0 ? (
          <div className="rounded-sm border border-up-line bg-black/20 py-4 text-center text-[11px] text-up-dim">
            ninguém votou ainda
          </div>
        ) : (
          <div className="space-y-1.5">
            {voters.map((v, i) => (
              <div
                key={`${v.user_id}-${v.stage_id ?? 'legacy'}-${i}`}
                className="rounded-sm border border-up-line bg-black/20 px-3 py-2"
              >
                <button
                  type="button"
                  onClick={() => onOpenProfile(v.user_id)}
                  className="flex w-full items-center gap-2 text-left transition-colors hover:text-up-orange"
                >
                  <Avatar
                    discordId={v.discord_id}
                    hash={v.avatar_url}
                    name={v.display_name}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-up-text" title={v.display_name ?? undefined}>{v.display_name}</div>
                    <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
                      {fmt(v.submitted_at)}
                      {v.stage_number != null && ` · stage ${v.stage_number}`}
                    </div>
                  </div>
                </button>
                {v.approvals.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 pl-10">
                    {v.approvals.map((gid) => {
                      const g = gameById(gid)
                      return (
                        <span
                          key={gid}
                          className="inline-flex items-center gap-1.5 rounded-sm border border-up-orange/30 bg-up-orange/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-orange"
                        >
                          {g?.cover_url && (
                            <img loading="lazy" src={g.cover_url} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-4 w-7 rounded-[2px] object-cover" />
                          )}
                          {g?.name ?? 'removido'}
                        </span>
                      )
                    })}
                  </div>
                )}
                {v.approvals.length === 0 && (
                  <div className="mt-2 pl-10 font-mono text-[10px] uppercase tracking-wider text-up-dim">
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
          <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
            Ainda não votaram ({non_voters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_voters.map((p, i) => (
              <button
                key={p.id ?? p.discord_id ?? `nv-${i}`}
                type="button"
                onClick={() => p.id && onOpenProfile(p.id)}
                disabled={!p.id}
                className="flex items-center gap-2 rounded-sm border border-up-line bg-black/20 px-2 py-1 transition-colors hover:border-up-orange disabled:cursor-default"
              >
                <Avatar
                  discordId={p.discord_id}
                  hash={p.avatar_url}
                  name={p.display_name}
                  size="xs"
                />
                <span className="text-[11px] text-up-dim">
                  {p.display_name ?? '?'}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
