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
  total_stages?: number | null
  current_stage_number?: number | null
  stages?: { stage_number: number; candidate_game_ids: string[] }[] | null
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

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-nerv-magenta">
              {v.total_stages && v.total_stages > 1 && v.current_stage_number
                ? `fase ${v.current_stage_number}/${v.total_stages}`
                : 'votação aberta'}
            </span>
            {youVoted && (
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="rounded-full border border-nerv-green/50 bg-nerv-green/10 px-2 py-0.5 text-[9px] uppercase tracking-wider text-nerv-green"
              >
                ✓ você votou
              </motion.span>
            )}
          </div>
          <div className="mt-1 truncate text-lg text-nerv-text">{v.title}</div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onAudit}
            title="ver detalhes da votacao"
            className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/60 hover:text-nerv-orange"
          >
            audit
          </button>
          <button
            onClick={onClose}
            title="encerrar votacao manualmente"
            className="rounded-sm border border-nerv-red/40 bg-nerv-red/5 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red/80 transition-colors hover:border-nerv-red/60 hover:bg-nerv-red/10 hover:text-nerv-red"
          >
            encerrar
          </button>
        </div>
      </div>

      {/* participation strip */}
      <div className="flex items-center gap-3 text-[10px] uppercase tracking-wider text-nerv-dim">
        <span><span className="tabular-nums text-nerv-text">{v.ballots_count}</span>/<span className="tabular-nums">{v.eligible_voter_count}</span> votaram</span>
        <div className="h-1 max-w-[160px] flex-1 overflow-hidden rounded-full bg-white/5">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${participationPct}%` }}
            transition={{ type: 'spring', stiffness: 80, damping: 18 }}
            className={`h-full ${quorumPct >= 100 ? 'bg-nerv-green' : 'bg-nerv-amber/70'}`}
          />
        </div>
        <span className={quorumPct >= 100 ? 'text-nerv-green' : 'text-nerv-amber'}>
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
              className={`group relative flex items-center gap-3 overflow-hidden rounded-sm border bg-nerv-panel/50 p-2 text-left transition-colors ${
                youPicked
                  ? 'border-nerv-magenta shadow-[0_0_22px_rgba(255,0,102,0.18)]'
                  : leading
                  ? 'border-nerv-orange/80 shadow-[0_0_18px_rgba(255,102,0,0.15)]'
                  : 'border-nerv-line transition-colors hover:border-nerv-orange/50'
              }`}
            >
              {cover ? (
                <img src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-12 w-20 shrink-0 rounded-sm object-cover" />
              ) : (
                <div className="h-12 w-20 shrink-0 rounded-sm bg-nerv-line/30" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-nerv-text">{g?.name ?? gid}</span>
                  {leading && !youPicked && (
                    <span className="shrink-0 rounded-sm bg-nerv-orange/90 px-1 text-[8px] uppercase tracking-wider text-black">top</span>
                  )}
                  {youPicked && (
                    <span className="shrink-0 text-[10px] text-nerv-magenta">✓</span>
                  )}
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      animate={{ width: `${pct}%` }}
                      transition={{ type: 'spring', stiffness: 90, damping: 18 }}
                      className={`h-full ${youPicked ? 'bg-nerv-magenta' : leading ? 'bg-nerv-orange' : 'bg-nerv-amber/60'}`}
                    />
                  </div>
                  <motion.span
                    key={count}
                    initial={{ scale: 1.4, color: '#ff6600' }}
                    animate={{ scale: 1, color: '#6a6a7a' }}
                    transition={{ duration: 0.4 }}
                    className="min-w-[14px] text-right text-[10px] tabular-nums"
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
        <p className="text-[10px] uppercase tracking-wider text-nerv-dim">toque nos jogos pra registrar seu voto. da pra mudar a qualquer hora.</p>
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
          <details className="group rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-2">
            <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text">
              eliminados nas fases anteriores ({eliminated.length})
            </summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {eliminated.map((gid) => {
                const g = gameOf(gid)
                return (
                  <span
                    key={gid}
                    className="truncate rounded-sm border border-nerv-line/40 bg-nerv-panel/30 px-2 py-0.5 text-[10px] text-nerv-dim line-through"
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

export function LastClosedPreview({ vote, game }: { vote: VoteRow; game: Game | null }) {
  const cover = game ? steamCover(game) : null
  return (
    <section className="rounded-sm border border-nerv-line/60 bg-nerv-panel/20 p-4">
      <div className="text-[10px] uppercase tracking-wider text-nerv-dim">última votação encerrada</div>
      <div className="mt-3 flex items-center gap-4">
        {cover ? (
          <img src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-16 w-28 shrink-0 rounded-sm object-cover" />
        ) : (
          <div className="h-16 w-28 shrink-0 rounded-sm bg-nerv-line/20" />
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-nerv-text/80">{vote.title}</div>
          {game ? (
            <div className="mt-1 truncate text-base text-nerv-orange">{game.name}</div>
          ) : (
            <div className="mt-1 text-xs text-nerv-dim">sem vencedor</div>
          )}
          <div className="mt-1 text-[10px] uppercase tracking-wider text-nerv-dim">
            {vote.ballots_count}/{vote.eligible_voter_count} votaram
          </div>
        </div>
      </div>
    </section>
  )
}
