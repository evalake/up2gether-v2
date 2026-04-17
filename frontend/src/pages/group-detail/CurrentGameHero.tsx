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
      className="relative overflow-hidden border border-up-green/30 bg-gradient-to-br from-up-panel/70 via-up-panel/40 to-transparent"
      style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
    >
      <div className="relative z-10 flex items-center justify-between border-b border-up-green/20 bg-black/40 px-4 py-1 font-mono text-[10px] uppercase tracking-[0.25em]">
        <span className="flex items-center gap-2 text-up-green">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-up-green" />
          now playing
          {isManual ? (
            <span className="text-up-amber">· manual override</span>
          ) : (
            <span className="text-up-dim">· definido por votação</span>
          )}
        </span>
        {daysSince !== null && (
          <span className="text-up-dim tabular-nums">
            há {daysSince === 0 ? 'hoje' : daysSince === 1 ? '1 dia' : `${daysSince} dias`}
          </span>
        )}
      </div>

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
          <div className="absolute inset-0 bg-gradient-to-r from-up-bg/95 via-up-bg/70 to-up-bg/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-up-bg/80 via-transparent to-up-bg/20" />
        </motion.div>
      )}

      <div className="relative z-10 p-4 md:p-5">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-up-green">game da vez</div>
          <motion.h2
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="mt-1 font-display text-2xl leading-none text-up-text md:text-3xl"
          >
            {audit.name}
          </motion.h2>

          <div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] uppercase tracking-wider sm:grid-cols-4">
            {audit.added_by_user_name && (
              <div>
                <div className="text-[10px] text-up-dim">sugerido por</div>
                <div className="mt-0.5 truncate text-up-text">{audit.added_by_user_name}</div>
              </div>
            )}
            {audit.vote_title && (
              <div>
                <div className="text-[10px] text-up-dim">vencedor de</div>
                <div className="mt-0.5 truncate text-up-text">{audit.vote_title}</div>
              </div>
            )}
            {audit.vote_ballots_count !== null && audit.vote_eligible_count !== null && (
              <div>
                <div className="text-[10px] text-up-dim">participação</div>
                <div className="mt-0.5 tabular-nums text-up-text">
                  {audit.vote_ballots_count}/{audit.vote_eligible_count}
                </div>
              </div>
            )}
            {isManual && audit.set_by_user_name && (
              <div>
                <div className="text-[10px] text-up-dim">travado por</div>
                <div className="mt-0.5 truncate text-up-amber">{audit.set_by_user_name}</div>
              </div>
            )}
          </div>

          {audit.vote_winner_approvals !== null && audit.vote_winner_approvals > 0 && (
            <div className="mt-2.5 space-y-1">
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
                <span>resultado</span>
                {audit.vote_was_tiebreak && <span className="text-up-amber">· desempate</span>}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-up-line/40">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${winnerPct}%` }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-gradient-to-r from-up-green via-up-green to-up-amber"
                  />
                </div>
                <span className="font-mono text-[10px] tabular-nums text-up-green">
                  {audit.vote_winner_approvals} votos
                </span>
              </div>
              {audit.vote_runner_ups.length > 0 && (
                <div className="space-y-1 pt-1">
                  {audit.vote_runner_ups.map((r) => {
                    const rPct = totalVotes > 0 ? (r.approvals / totalVotes) * 100 : 0
                    return (
                      <div key={r.game_id} className="flex items-center gap-3 text-[10px]">
                        <span className="w-24 truncate text-up-dim">{r.name}</span>
                        <div className="h-0.5 flex-1 overflow-hidden rounded-full bg-up-line/30">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${rPct}%` }}
                            transition={{ duration: 1, ease: 'easeOut', delay: 0.7 }}
                            className="h-full bg-up-dim"
                          />
                        </div>
                        <span className="w-6 text-right tabular-nums text-up-dim">{r.approvals}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
            <span><span className="tabular-nums text-up-green">{audit.interest_want_count}</span> querem</span>
            <span><span className="tabular-nums text-up-amber">{audit.interest_meh_count}</span> ok</span>
            <span><span className="tabular-nums text-up-red">{audit.interest_nope_count}</span> pass</span>
            <span className="text-up-line">|</span>
            <span><span className="tabular-nums text-up-orange">{audit.owners_count}</span> têm na steam</span>
            <span><span className="tabular-nums text-up-magenta">{audit.sessions_count}</span> sessões</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-wider">
            <button
              onClick={() => navigate(`/groups/${groupId}/games/${audit.game_id}`)}
              className="rounded-sm border border-up-green/40 bg-up-green/5 px-2 py-1 text-up-green transition-colors hover:bg-up-green/15"
            >
              detalhes do jogo
            </button>
            {audit.vote_id && (
              <button
                onClick={() => navigate(`/groups/${groupId}/votes`)}
                className="text-up-dim transition-colors hover:text-up-orange"
              >
                votacao
              </button>
            )}
            <button
              onClick={() => navigate(`/groups/${groupId}/history`)}
              className="text-up-dim transition-colors hover:text-up-orange"
            >
              historico
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate(`/groups/${groupId}/admin`)}
                className="text-up-line transition-colors hover:text-up-amber"
              >
                {isManual ? 'gerenciar' : 'admin'}
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}
