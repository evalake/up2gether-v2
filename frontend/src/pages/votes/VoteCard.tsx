import { motion } from 'framer-motion'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'

type VoteRow = {
  id: string
  title: string
  status: string
  candidate_game_ids: string[]
  your_approvals: string[]
  tallies: Record<string, number>
  ballots_count: number
  eligible_voter_count: number
  quorum_count: number
  winner_game_id: string | null
  max_selections: number
  closes_at: string | null
  total_stages?: number | null
  current_stage_number?: number | null
  stages?: { stage_number: number; candidate_game_ids: string[]; max_selections: number }[] | null
}

export function VoteCard({
  v, gameOf, onApprove, onClose, onAudit,
}: {
  v: VoteRow
  gameOf: (gid: string) => Game | undefined
  onApprove: (gid: string) => void
  onClose: () => void
  onAudit: () => void
}) {
  const tallies = v.tallies ?? {}
  const totalVotes = Object.values(tallies).reduce((a, b) => a + b, 0)
  const maxCount = Math.max(...Object.values(tallies), 0)
  const youVoted = v.your_approvals.length > 0
  const participationPct = Math.round((v.ballots_count / Math.max(v.eligible_voter_count, 1)) * 100)
  const quorumPct = Math.round((v.ballots_count / Math.max(v.quorum_count, 1)) * 100)

  // stage-aware max selections
  const currentStage = v.stages?.find((s) => s.stage_number === v.current_stage_number)
  const maxSel = currentStage?.max_selections ?? v.max_selections

  // tempo restante
  const timeLeft = (() => {
    const ca = v.closes_at
    if (!ca) return null
    const diff = new Date(ca).getTime() - Date.now()
    if (diff <= 0) return null
    const h = Math.floor(diff / 3_600_000)
    const m = Math.floor((diff % 3_600_000) / 60_000)
    if (h > 24) return `${Math.floor(h / 24)}d`
    if (h > 0) return `${h}h${m > 0 ? `${m}m` : ''}`
    return `${m}m`
  })()

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-sm border border-up-orange/20 bg-up-panel/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-up-magenta/40 bg-up-magenta/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-magenta">
              {v.total_stages && v.total_stages > 1 && v.current_stage_number
                ? `fase ${v.current_stage_number}/${v.total_stages}`
                : 'aberta'}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-up-dim">
              até {maxSel} {maxSel === 1 ? 'escolha' : 'escolhas'}
            </span>
            {timeLeft && (
              <span className="text-[10px] uppercase tracking-wider text-up-dim">
                · {timeLeft}
              </span>
            )}
            {youVoted && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-sm border border-up-green/50 bg-up-green/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-up-green"
              >
                votou
              </motion.span>
            )}
          </div>
          <div className="mt-1 truncate text-lg text-up-text">{v.title}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAudit}
            title="ver detalhes da votação"
            className="inline-flex items-center gap-1.5 rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            auditar
          </button>
          <button
            onClick={onClose}
            title="encerrar votação manualmente"
            className="rounded-sm border border-up-red/40 bg-up-red/5 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-red transition-colors hover:border-up-red hover:bg-up-red/10"
          >
            encerrar
          </button>
        </div>
      </div>

      {/* participation strip */}
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-up-dim">
        <span><span className="tabular-nums text-up-text">{v.ballots_count}</span>/<span className="tabular-nums">{v.eligible_voter_count}</span> votaram</span>
        <div className="h-1 max-w-[160px] flex-1 overflow-hidden rounded-full bg-up-line/30">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${participationPct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className={`h-full ${quorumPct >= 100 ? 'bg-up-green' : 'bg-up-amber/70'}`}
          />
        </div>
        <span className={quorumPct >= 100 ? 'text-up-green' : 'text-up-amber'}>
          {quorumPct >= 100 ? 'quorum ok' : `quorum ${v.ballots_count}/${v.quorum_count}`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
        {v.candidate_game_ids.map((gid) => {
          const g = gameOf(gid)
          const cover = g ? steamCover(g) : null
          const count = tallies[gid] ?? 0
          const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0
          const leading = count > 0 && count === maxCount
          const youPicked = v.your_approvals.includes(gid)
          return (
            <motion.button
              key={gid}
              type="button"
              onClick={() => onApprove(gid)}
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.97 }}
              className={`group relative flex items-center gap-3 overflow-hidden rounded-sm border bg-up-panel/50 p-2 text-left transition-colors ${
                youPicked
                  ? 'border-up-magenta shadow-[0_0_22px_rgba(255,0,102,0.18)]'
                  : leading
                  ? 'border-up-orange/80 shadow-[0_0_18px_rgba(255,102,0,0.15)]'
                  : 'border-up-line transition-colors hover:border-up-orange'
              }`}
            >
              {cover ? (
                <img loading="lazy" src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-12 w-20 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-sm bg-up-line/30">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-up-dim/40">
                    <rect x="2" y="2" width="20" height="20" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="m21 15-5-5L5 21" />
                  </svg>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-up-text">{g?.name ?? gid}</span>
                  {leading && !youPicked && (
                    <span className="shrink-0 rounded-sm bg-up-orange/90 px-1 text-[9px] uppercase tracking-wider text-black">top</span>
                  )}
                  {youPicked && (
                    <span className="shrink-0 rounded-sm bg-up-magenta/20 px-1 text-[9px] uppercase tracking-wider text-up-magenta">seu</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-up-line/30">
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                      className={`h-full ${youPicked ? 'bg-up-magenta' : leading ? 'bg-up-orange' : 'bg-up-amber/60'}`}
                    />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 1.4 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="min-w-[14px] text-right text-[10px] tabular-nums text-up-dim"
                  >
                    {count}
                  </motion.span>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>

      {!youVoted && (
        <p className="text-[10px] uppercase tracking-wider text-up-dim">
          toque nos jogos pra votar · escolha até {maxSel} · dá pra mudar a qualquer hora
        </p>
      )}
      {youVoted && v.your_approvals.length < maxSel && (
        <p className="text-[10px] uppercase tracking-wider text-up-dim">
          selecionados: {v.your_approvals.length} de {maxSel}
        </p>
      )}

      {/* eliminados em fases anteriores */}
      {(() => {
        if (!v.stages || v.stages.length <= 1 || !v.current_stage_number) return null
        const currentIds = new Set(v.candidate_game_ids)
        const eliminated: string[] = []
        for (const st of v.stages) {
          if (st.stage_number >= v.current_stage_number) continue
          for (const cid of st.candidate_game_ids) {
            if (!currentIds.has(cid) && !eliminated.includes(cid)) eliminated.push(cid)
          }
        }
        if (!eliminated.length) return null
        return (
          <details className="group rounded-sm border border-up-line bg-up-panel/20 p-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text">
              eliminados nas fases anteriores ({eliminated.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {eliminated.map((gid) => {
                const g = gameOf(gid)
                return (
                  <span
                    key={gid}
                    className="truncate rounded-sm border border-up-line bg-up-panel/30 px-2 py-0.5 text-[10px] text-up-dim line-through"
                  >
                    {g?.name ?? gid.slice(0, 6)}
                  </span>
                )
              })}
            </div>
          </details>
        )
      })()}
    </motion.section>
  )
}

export function LastClosedPreview({ vote, game, onAudit }: { vote: VoteRow; game: Game | null; onAudit: () => void }) {
  const cover = game ? steamCover(game) : null
  return (
    <button
      type="button"
      onClick={onAudit}
      className="group w-full rounded-sm border border-up-line/60 bg-up-panel/20 p-4 text-left transition-[colors,box-shadow] duration-200 hover:border-up-orange hover:shadow-[0_0_24px_rgba(255,102,0,0.1)]"
    >
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-up-dim">última votação encerrada</div>
        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-up-dim transition-colors group-hover:text-up-orange">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          auditar
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        {cover ? (
          <img loading="lazy" src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-16 w-28 shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="flex h-16 w-28 shrink-0 items-center justify-center rounded-sm border border-up-line/30 bg-gradient-to-br from-up-panel/60 to-black/40">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-up-dim/40">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-up-text">{vote.title}</div>
          {game ? (
            <div className="mt-1 truncate text-base text-up-orange">{game.name}</div>
          ) : (
            <div className="mt-1 text-xs text-up-dim">sem vencedor</div>
          )}
          <div className="mt-1 flex flex-wrap gap-x-3 text-[10px] uppercase tracking-wider text-up-dim">
            <span><span className="tabular-nums text-up-text">{vote.ballots_count}</span>/{vote.eligible_voter_count} votaram</span>
            <span>{vote.candidate_game_ids.length} candidatos</span>
          </div>
        </div>
      </div>
    </button>
  )
}
