import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeAudit } from '@/features/themes/hooks'
import { Avatar } from '@/components/core/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'

type Props = {
  groupId: string
  themeId?: string | null
  cycleId?: string | null
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

const TIEBREAK_LABEL: Record<string, string> = {
  tiebreak_coin: 'cara ou coroa',
  tiebreak_roulette: 'roleta',
  admin: 'decisão do admin',
}

export function ThemeAuditModal({ groupId, themeId, cycleId, onClose }: Props) {
  const audit = useThemeAudit(groupId, { themeId, cycleId })
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const open = !!(themeId || cycleId)

  useEffect(() => {
    if (!open) return
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
  }, [onClose, open])

  return createPortal(
    <AnimatePresence>
      {open && (
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
                Auditoria do tema
              </div>
            </div>

            <div className="max-h-[80vh] overflow-y-auto p-5">
              {audit.isLoading && <Loading />}
              {audit.error && <ErrorBox error={audit.error} />}
              {audit.data && <AuditBody data={audit.data} onOpenProfile={setProfileUserId} />}
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

function AuditBody({ data, onOpenProfile }: {
  data: NonNullable<ReturnType<typeof useThemeAudit>['data']>
  onOpenProfile: (userId: string) => void
}) {
  const { theme, cycle, opener, decided_by, votes, non_voters, non_suggesters } = data
  const votesBySuggestion = new Map<string, typeof votes>()
  for (const v of votes) {
    const arr = votesBySuggestion.get(v.suggestion_id) ?? []
    arr.push(v)
    votesBySuggestion.set(v.suggestion_id, arr)
  }
  const winnerSug = cycle?.winner_suggestion_id
    ? cycle.suggestions.find((s) => s.id === cycle.winner_suggestion_id)
    : null

  // ordena sugestoes por votos
  const sortedSuggestions = cycle
    ? [...cycle.suggestions].sort((a, b) => b.vote_count - a.vote_count)
    : []

  const tiebreakLabel = cycle?.tiebreak_kind
    ? TIEBREAK_LABEL[cycle.tiebreak_kind] ?? cycle.tiebreak_kind
    : null

  return (
    <div className="space-y-4">
      {/* header */}
      <section>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="font-display text-xl text-up-text">
            {theme?.theme_name ?? winnerSug?.name ?? 'Tema'}
          </h2>
          {cycle?.phase && (
            <span className={`rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider ${
              cycle.phase === 'decided' ? 'border-up-green/40 text-up-green' :
              cycle.phase === 'cancelled' ? 'border-up-red/40 text-up-red' :
              'border-up-magenta/40 text-up-magenta'
            }`}>
              {cycle.phase === 'decided' ? 'encerrado' :
               cycle.phase === 'cancelled' ? 'cancelado' :
               cycle.phase === 'voting' ? 'votação' : 'sugestões'}
            </span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
          <span>{theme?.month_year ?? cycle?.month_year}</span>
          {cycle && <span>· <span className="tabular-nums text-up-text">{cycle.suggestions.length}</span> sugestões</span>}
          {cycle && <span>· <span className="tabular-nums text-up-text">{cycle.total_votes}</span> votos</span>}
        </div>
        {theme?.description && (
          <p className="mt-2 text-[11px] text-up-dim">{theme.description}</p>
        )}
        {theme?.image_url && (
          <img
            src={theme.image_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="mt-3 h-40 w-full rounded-sm border border-up-line object-cover"
          />
        )}
      </section>

      {/* vencedor */}
      {winnerSug && (
        <section className="flex items-center gap-3 rounded-sm border border-up-green/30 bg-up-green/5 p-3">
          {winnerSug.image_url && (
            <img
              src={winnerSug.image_url}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              className="h-12 w-20 rounded-sm border border-up-green/30 object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-up-green">Vencedor</div>
            <div className="font-display text-base text-up-text">{winnerSug.name}</div>
            <div className="mt-0.5 font-mono text-[10px] text-up-dim">
              por {winnerSug.user_name ?? '?'} · {winnerSug.vote_count} votos
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded-sm border border-up-green/40 bg-up-green/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-green">
              {winnerSug.vote_count} votos
            </span>
            {tiebreakLabel && (
              <span className="rounded-sm border border-up-amber/40 bg-up-amber/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-up-amber">
                {tiebreakLabel}
              </span>
            )}
          </div>
        </section>
      )}

      {/* pessoas + timeline */}
      <section className="grid gap-4 sm:grid-cols-2">
        {opener && (
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-up-dim">Abriu o ciclo</div>
            <button
              type="button"
              onClick={() => opener.id && onOpenProfile(opener.id)}
              disabled={!opener.id}
              className="flex items-center gap-2 rounded-sm transition-colors hover:text-up-orange disabled:cursor-default"
            >
              <Avatar
                discordId={opener.discord_id}
                hash={opener.avatar_url}
                name={opener.display_name}
                size="sm"
              />
              <span className="text-sm text-up-text">
                {opener.display_name ?? '(desconhecido)'}
              </span>
            </button>
          </div>
        )}
        {decided_by && (
          <div>
            <div className="mb-1.5 text-[11px] uppercase tracking-wider text-up-dim">Decidiu</div>
            <button
              type="button"
              onClick={() => decided_by.id && onOpenProfile(decided_by.id)}
              disabled={!decided_by.id}
              className="flex items-center gap-2 rounded-sm transition-colors hover:text-up-orange disabled:cursor-default"
            >
              <Avatar
                discordId={decided_by.discord_id}
                hash={decided_by.avatar_url}
                name={decided_by.display_name}
                size="sm"
              />
              <span className="text-sm text-up-text">
                {decided_by.display_name ?? '(desconhecido)'}
              </span>
            </button>
          </div>
        )}
      </section>

      {/* timeline */}
      {(theme?.decided_at || cycle?.decided_at) && (
        <section>
          <div className="mb-1.5 text-[11px] uppercase tracking-wider text-up-dim">Timeline</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
            {cycle?.decided_at && (
              <div>
                <span className="text-up-dim">decidido</span>{' '}
                <span className="text-up-text">{fmt(cycle.decided_at)}</span>
              </div>
            )}
            {theme?.decided_at && !cycle?.decided_at && (
              <div>
                <span className="text-up-dim">decidido</span>{' '}
                <span className="text-up-text">{fmt(theme.decided_at)}</span>
              </div>
            )}
            {theme?.decided_by && (
              <div>
                <span className="text-up-dim">método</span>{' '}
                <span className="text-up-text">{theme.decided_by}</span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* sugestoes ordenadas */}
      {sortedSuggestions.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
            Sugestões ({sortedSuggestions.length})
          </div>
          <div className="space-y-1.5">
            {sortedSuggestions.map((s) => {
              const voters = votesBySuggestion.get(s.id) ?? []
              const isWinner = s.id === cycle?.winner_suggestion_id
              return (
                <div
                  key={s.id}
                  className={`rounded-sm border p-3 ${
                    isWinner
                      ? 'border-up-green/40 bg-up-green/5'
                      : 'border-up-line bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {s.image_url && (
                      <img
                        src={s.image_url}
                        alt=""
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        className="h-10 w-16 shrink-0 rounded-sm object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-up-text">{s.name}</div>
                      {s.description && (
                        <div className="truncate text-[10px] text-up-dim">{s.description}</div>
                      )}
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim">
                        <Avatar
                          discordId={s.user_discord_id ?? null}
                          hash={s.user_avatar ?? null}
                          name={s.user_name ?? null}
                          size="xs"
                        />
                        <span>por {s.user_name ?? '?'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] uppercase tracking-wider tabular-nums text-up-orange">
                      {s.vote_count}
                    </div>
                    {isWinner && (
                      <span className="shrink-0 rounded-sm bg-up-green/15 px-1 py-0.5 text-[10px] uppercase tracking-wider text-up-green">
                        W
                      </span>
                    )}
                  </div>
                  {voters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-2">
                      {voters.map((v) => (
                        <button
                          type="button"
                          key={v.user_id}
                          onClick={() => onOpenProfile(v.user_id)}
                          className="flex items-center gap-1 rounded-sm border border-up-orange/30 bg-up-orange/5 px-1.5 py-0.5 transition-colors hover:border-up-orange"
                        >
                          <Avatar
                            discordId={v.discord_id}
                            hash={v.avatar_url}
                            name={v.display_name}
                            size="xs"
                          />
                          <span className="font-mono text-[10px] uppercase tracking-wider text-up-orange">
                            {v.display_name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {non_voters.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
            Não votaram ({non_voters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_voters.map((p, i) => (
              <button
                type="button"
                key={p.id ?? p.discord_id ?? `nv-${i}`}
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
                <span className="text-[11px] text-up-dim">{p.display_name ?? '?'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {non_suggesters.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-up-dim">
            Não sugeriram ({non_suggesters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_suggesters.map((p, i) => (
              <button
                type="button"
                key={p.id ?? p.discord_id ?? `ns-${i}`}
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
                <span className="text-[11px] text-up-dim">{p.display_name ?? '?'}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
