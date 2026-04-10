import { useEffect } from 'react'
import { useThemeAudit } from '@/features/themes/hooks'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

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

export function ThemeAuditModal({ groupId, themeId, cycleId, onClose }: Props) {
  const audit = useThemeAudit(groupId, { themeId, cycleId })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!themeId && !cycleId) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="my-8 w-full max-w-3xl rounded-sm border border-nerv-orange/30 bg-nerv-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-nerv-line/40 px-5 py-3">
          <div className="text-[11px] uppercase tracking-wider text-nerv-orange">
            Audit do tema
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

function AuditBody({ data }: { data: NonNullable<ReturnType<typeof useThemeAudit>['data']> }) {
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

  return (
    <div className="space-y-6">
      <section>
        <h2 className="font-display text-xl text-nerv-text">
          {theme?.theme_name ?? winnerSug?.name ?? 'Tema'}
        </h2>
        <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          {theme?.month_year ?? cycle?.month_year} · {cycle?.phase ?? 'sem ciclo'}
        </div>
        {theme?.description && (
          <p className="mt-2 text-[11px] text-nerv-dim/80">{theme.description}</p>
        )}
        {theme?.image_url && (
          <img
            src={theme.image_url}
            alt=""
            className="mt-3 h-40 w-full rounded-sm border border-nerv-line object-cover"
          />
        )}
      </section>

      {(opener || decided_by) && (
        <section className="grid gap-3 sm:grid-cols-2">
          {opener && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-nerv-dim">
                Abriu o ciclo
              </div>
              <div className="flex items-center gap-2">
                <Avatar
                  discordId={opener.discord_id}
                  hash={opener.avatar_url}
                  name={opener.display_name}
                  size="sm"
                />
                <span className="text-sm text-nerv-text">
                  {opener.display_name ?? '(desconhecido)'}
                </span>
              </div>
            </div>
          )}
          {decided_by && (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wider text-nerv-dim">
                Decidiu / criou
              </div>
              <div className="flex items-center gap-2">
                <Avatar
                  discordId={decided_by.discord_id}
                  hash={decided_by.avatar_url}
                  name={decided_by.display_name}
                  size="sm"
                />
                <span className="text-sm text-nerv-text">
                  {decided_by.display_name ?? '(desconhecido)'}
                </span>
              </div>
            </div>
          )}
        </section>
      )}

      {theme?.decided_at && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Timeline
          </div>
          <div className="space-y-1 font-mono text-[11px]">
            <div className="flex gap-3">
              <span className="w-24 text-nerv-dim">decidido</span>
              <span className="text-nerv-text">{fmt(theme.decided_at)}</span>
            </div>
            <div className="flex gap-3">
              <span className="w-24 text-nerv-dim">por</span>
              <span className="text-nerv-text">{theme.decided_by}</span>
            </div>
          </div>
        </section>
      )}

      {cycle && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Sugestoes ({cycle.suggestions.length})
          </div>
          <div className="space-y-2">
            {cycle.suggestions.map((s) => {
              const voters = votesBySuggestion.get(s.id) ?? []
              const isWinner = s.id === cycle.winner_suggestion_id
              return (
                <div
                  key={s.id}
                  className={`rounded-sm border p-3 ${
                    isWinner
                      ? 'border-nerv-green/40 bg-nerv-green/5'
                      : 'border-nerv-line/40 bg-black/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {s.image_url && (
                      <img
                        src={s.image_url}
                        alt=""
                        className="h-10 w-16 shrink-0 rounded-sm object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-nerv-text">{s.name}</div>
                      {s.description && (
                        <div className="truncate text-[10px] text-nerv-dim">{s.description}</div>
                      )}
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                        <Avatar
                          discordId={s.user_discord_id ?? null}
                          hash={s.user_avatar ?? null}
                          name={s.user_name ?? null}
                          size="xs"
                        />
                        <span>por {s.user_name ?? '?'}</span>
                      </div>
                    </div>
                    <div className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-nerv-orange tabular-nums">
                      {s.vote_count}
                    </div>
                  </div>
                  {voters.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1 pl-2">
                      {voters.map((v) => (
                        <div
                          key={v.user_id}
                          className="flex items-center gap-1 rounded-sm border border-nerv-orange/30 bg-nerv-orange/5 px-1.5 py-0.5"
                        >
                          <Avatar
                            discordId={v.discord_id}
                            hash={v.avatar_url}
                            name={v.display_name}
                            size="xs"
                          />
                          <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">
                            {v.display_name}
                          </span>
                        </div>
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
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Nao votaram ({non_voters.length})
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
                <span className="text-[11px] text-nerv-dim">{p.display_name ?? '?'}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {non_suggesters.length > 0 && (
        <section>
          <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">
            Nao sugeriram ({non_suggesters.length})
          </div>
          <div className="flex flex-wrap gap-2">
            {non_suggesters.map((p) => (
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
                <span className="text-[11px] text-nerv-dim">{p.display_name ?? '?'}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
