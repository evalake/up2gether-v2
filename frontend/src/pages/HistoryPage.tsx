import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useGroup } from '@/features/groups/hooks'
import { useVotes } from '@/features/votes/hooks'
import { useGames } from '@/features/games/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

// historico derivado: votes fechados com vencedor, ordem desc.
// nao captura override manual pq n temos log disso ainda. TODO: dps
export function HistoryPage() {
  const { id = '' } = useParams()
  const group = useGroup(id)
  const votes = useVotes(id)
  const games = useGames(id)
  const [q, setQ] = useState('')

  if (group.isLoading || votes.isLoading || games.isLoading) return <Loading />
  if (group.error) return <ErrorBox error={group.error} />
  if (votes.error) return <ErrorBox error={votes.error} />

  const gameById = (gid: string) => games.data?.find((g) => g.id === gid)
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())

  const chapters = (votes.data ?? [])
    .filter((v) => v.status === 'closed' && v.winner_game_id)
    .slice()
    .sort((a, b) => {
      const at = a.closed_at ?? a.created_at
      const bt = b.closed_at ?? b.created_at
      return at < bt ? 1 : -1
    })

  const filtered = query
    ? chapters.filter((v) => {
        const g = gameById(v.winner_game_id!)
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
          className="rounded-sm border border-nerv-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/50 hover:text-nerv-orange"
        >
          Voltar
        </Link>
      </header>

      <div className="flex items-center gap-2">
        <input
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
        <div className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 py-12 text-center text-xs text-nerv-dim">
          {q ? `nada pra "${q}"` : 'nenhum game escolhido ainda'}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((v, i) => {
            const g = gameById(v.winner_game_id!)
            const when = v.closed_at ?? v.created_at
            const dt = new Date(when).toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: 'long',
              year: 'numeric',
            })
            const isLatest = i === 0 && !q
            return (
              <div
                key={v.id}
                className={`flex items-center gap-4 rounded-sm border p-4 transition-colors ${
                  isLatest
                    ? 'border-nerv-green/40 bg-nerv-green/5'
                    : 'border-nerv-line/40 bg-nerv-panel/20 hover:border-nerv-orange/30'
                }`}
              >
                {g?.cover_url ? (
                  <img
                    src={g.cover_url}
                    alt=""
                    className="h-16 w-28 shrink-0 rounded-sm border border-nerv-line object-cover"
                  />
                ) : (
                  <div className="h-16 w-28 shrink-0 rounded-sm border border-nerv-line bg-black/40" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {g ? (
                      <Link
                        to={`/groups/${id}/games/${g.id}`}
                        className="truncate font-display text-lg text-nerv-text hover:text-nerv-orange"
                      >
                        {g.name}
                      </Link>
                    ) : (
                      <span className="truncate font-display text-lg text-nerv-dim">
                        (jogo removido)
                      </span>
                    )}
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
                    {dt} · {v.ballots_count} voto{v.ballots_count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
