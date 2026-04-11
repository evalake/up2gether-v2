import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useGroup } from '@/features/groups/hooks'
import { useVotes } from '@/features/votes/hooks'
import { useGames } from '@/features/games/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { VoteAuditModal } from '@/components/votes/VoteAuditModal'
import { useTitle } from '@/lib/useTitle'

// historico derivado: votes fechados com vencedor, ordem desc.
// nao captura override manual pq n temos log disso ainda
export function HistoryPage() {
  useTitle('historico')
  const { id = '' } = useParams()
  const group = useGroup(id)
  const votes = useVotes(id)
  const games = useGames(id)
  const [q, setQ] = useState('')
  const [auditId, setAuditId] = useState<string | null>(null)

  if (group.isLoading || votes.isLoading || games.isLoading) return <Loading />
  if (group.error) return <ErrorBox error={group.error} />
  if (votes.error) return <ErrorBox error={votes.error} />

  const gameById = (gid: string) => games.data?.find((g) => g.id === gid)
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())

  // inclui qualquer vote nao-aberto (closed, archived). se n tem winner, mostra
  // como "sem vencedor" ao inves de sumir
  const chapters = (votes.data ?? [])
    .filter((v) => v.status !== 'open')
    .slice()
    .sort((a, b) => {
      const at = a.closed_at ?? a.created_at
      const bt = b.closed_at ?? b.created_at
      return at < bt ? 1 : -1
    })

  const filtered = query
    ? chapters.filter((v) => {
        const g = v.winner_game_id ? gameById(v.winner_game_id) : null
        return (
          (g && norm(g.name).includes(query)) ||
          norm(v.title).includes(query)
        )
      })
    : chapters

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-orange/80">Historico</div>
          <h1 className="mt-1 font-display text-3xl text-nerv-text">
            {group.data?.name ?? 'Grupo'}
          </h1>
          <p className="mt-1 text-xs text-nerv-dim">
            Games que ja foram escolhidos pelo grupo. Derivado das votacoes fechadas.
          </p>
        </div>
        <Link
          to={`/groups/${id}`}
          className="text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
        >
          ← voltar
        </Link>
      </header>

      <div className="flex items-center gap-2">
        <input
          aria-label="buscar historico"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar por jogo ou titulo da votacao..."
          className="h-9 w-full max-w-md rounded-sm border border-nerv-line bg-black/40 px-3 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
        />
        <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="tabular-nums text-nerv-orange">{chapters.length}</span> capitulos
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          tone="soft"
          glyph="✧"
          title={q ? `nada pra ${JSON.stringify(q)}` : 'nenhum capitulo ainda'}
          hint={q ? 'tenta outro termo ou limpa a busca' : 'quando uma votação fechar com vencedor, vai aparecer aqui como um capitulo da timeline.'}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((v, i) => {
            const g = v.winner_game_id ? gameById(v.winner_game_id) : null
            const when = v.closed_at ?? v.created_at
            const dt = new Date(when).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
            const isLatest = i === 0 && !q
            return (
              <button
                key={v.id}
                onClick={() => setAuditId(v.id)}
                className={`flex w-full items-center gap-4 rounded-sm border p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${
                  isLatest
                    ? 'border-nerv-green/40 bg-nerv-green/5 hover:border-nerv-green/60 hover:bg-nerv-green/10'
                    : 'border-nerv-line/40 bg-nerv-panel/20 hover:border-nerv-orange/40 hover:bg-nerv-panel/40'
                }`}
              >
                {g?.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt=""
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    className="h-16 w-28 shrink-0 rounded-sm border border-nerv-line object-cover"
                  />
                ) : (
                  <div className="h-16 w-28 shrink-0 rounded-sm border border-nerv-line bg-black/40" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`truncate font-display text-lg ${g ? 'text-nerv-text' : 'text-nerv-dim'}`}>
                      {g ? g.name : v.winner_game_id ? '(jogo removido)' : '(sem vencedor)'}
                    </span>
                    {isLatest && (
                      <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-green">
                        atual
                      </span>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-nerv-dim">
                    {v.title}
                  </div>
                  <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {dt} · {v.ballots_count} voto{v.ballots_count === 1 ? '' : 's'} · audit →
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {auditId && (
        <VoteAuditModal
          groupId={id}
          voteId={auditId}
          onClose={() => setAuditId(null)}
        />
      )}
    </div>
  )
}
