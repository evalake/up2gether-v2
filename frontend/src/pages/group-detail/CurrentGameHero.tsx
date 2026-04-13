import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { CurrentGameAudit } from '@/features/groups/api'

export function CurrentGameHero({
  audit,
  groupId,
  isAdmin,
  now,
}: {
  audit: CurrentGameAudit
  groupId: string
  isAdmin: boolean
  now: Date
}) {
  const navigate = useNavigate()
  const setSince = audit.set_at ? new Date(audit.set_at) : null
  const daysSince = setSince ? Math.floor((now.getTime() - setSince.getTime()) / 86400000) : null
  const isManual = audit.source === 'manual'
  const totalVotes = (audit.vote_winner_approvals ?? 0) + audit.vote_runner_ups.reduce((a, r) => a + r.approvals, 0)
  const winnerPct = totalVotes > 0 ? ((audit.vote_winner_approvals ?? 0) / totalVotes) * 100 : 0

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="relative overflow-hidden border border-nerv-green/30 bg-gradient-to-br from-nerv-panel/70 via-nerv-panel/40 to-transparent"
      style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
    >
      {/* terminal header */}
      <div className="relative z-10 flex items-center justify-between border-b border-nerv-green/20 bg-black/40 px-4 py-1 font-mono text-[9px] uppercase tracking-[0.25em]">
        <span className="flex items-center gap-2 text-nerv-green">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-nerv-green" />
          now playing
          {isManual ? (
            <span className="text-nerv-amber/80">· manual override</span>
          ) : (
            <span className="text-nerv-dim">· definido por votação</span>
          )}
        </span>
        {daysSince !== null && (
          <span className="text-nerv-dim tabular-nums">
            há {daysSince === 0 ? 'hoje' : daysSince === 1 ? '1 dia' : `${daysSince} dias`}
          </span>
        )}
      </div>

      {/* cover background */}
      {audit.cover_url && (
        <motion.div
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.4 }}
          className="pointer-events-none absolute inset-0"
        >
          <img
            src={audit.cover_url}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-40"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-nerv-bg/95 via-nerv-bg/70 to-nerv-bg/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-bg/80 via-transparent to-nerv-bg/20" />
        </motion.div>
      )}

      <div className="relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-end md:p-8">
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-nerv-green/80">▸ game da vez</div>
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-2 font-display text-4xl leading-none text-nerv-text md:text-5xl"
          >
            {audit.name}
          </motion.h2>

          {/* meta grid */}
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 text-[10px] uppercase tracking-wider text-nerv-dim sm:grid-cols-4">
            {audit.added_by_user_name && (
              <div>
                <div className="text-[9px] opacity-70">sugerido por</div>
                <div className="mt-0.5 truncate text-nerv-text/90">{audit.added_by_user_name}</div>
              </div>
            )}
            {audit.vote_title && (
              <div>
                <div className="text-[9px] opacity-70">vencedor de</div>
                <div className="mt-0.5 truncate text-nerv-text/90">{audit.vote_title}</div>
              </div>
            )}
            {audit.vote_ballots_count !== null && audit.vote_eligible_count !== null && (
              <div>
                <div className="text-[9px] opacity-70">participação</div>
                <div className="mt-0.5 tabular-nums text-nerv-text/90">
                  {audit.vote_ballots_count}/{audit.vote_eligible_count}
                </div>
              </div>
            )}
            {isManual && audit.set_by_user_name && (
              <div>
                <div className="text-[9px] opacity-70">travado por</div>
                <div className="mt-0.5 truncate text-nerv-amber">{audit.set_by_user_name}</div>
              </div>
            )}
          </div>

          {/* vote breakdown bar */}
          {audit.vote_winner_approvals !== null && audit.vote_winner_approvals > 0 && (
            <div className="mt-5 space-y-2">
              <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                <span>resultado da votação</span>
                {audit.vote_was_tiebreak && <span className="text-nerv-amber">· desempate</span>}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-nerv-line/30">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${winnerPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-nerv-green via-nerv-green to-nerv-amber"
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-nerv-green">
                  {audit.vote_winner_approvals} votos
                </span>
              </div>
              {audit.vote_runner_ups.length > 0 && (
                <div className="space-y-1 pt-1">
                  {audit.vote_runner_ups.map((r) => {
                    const rPct = totalVotes > 0 ? (r.approvals / totalVotes) * 100 : 0
                    return (
                      <div key={r.game_id} className="flex items-center gap-3 text-[9px] text-nerv-dim">
                        <span className="w-24 truncate">{r.name}</span>
                        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-nerv-line/20">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rPct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                            className="h-full bg-nerv-dim/70"
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums">{r.approvals}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* stats + acoes */}
          <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            <span><span className="tabular-nums text-nerv-green">{audit.interest_want_count}</span> querem</span>
            <span><span className="tabular-nums text-nerv-amber">{audit.interest_meh_count}</span> ok</span>
            <span><span className="tabular-nums text-nerv-red/70">{audit.interest_nope_count}</span> pass</span>
            <span className="text-nerv-line">│</span>
            <span><span className="tabular-nums text-nerv-orange">{audit.owners_count}</span> têm na steam</span>
            <span><span className="tabular-nums text-nerv-magenta">{audit.sessions_count}</span> sessões</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
            <button
              onClick={() => navigate(`/groups/${groupId}/games/${audit.game_id}`)}
              className="text-nerv-green transition-colors hover:text-nerv-green/70"
            >
              detalhes do jogo
            </button>
            {audit.vote_id && (
              <button
                onClick={() => navigate(`/groups/${groupId}/votes`)}
                className="text-nerv-dim transition-colors hover:text-nerv-orange"
              >
                votação
              </button>
            )}
            <button
              onClick={() => navigate(`/groups/${groupId}/history`)}
              className="text-nerv-dim transition-colors hover:text-nerv-orange"
            >
              histórico
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate(`/groups/${groupId}/admin`)}
                className="text-nerv-amber transition-colors hover:text-nerv-amber/70"
              >
                {isManual ? 'gerenciar override' : 'travar manualmente'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
