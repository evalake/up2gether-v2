import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import { useT } from '@/i18n'

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
}

export function VoteHistory({
  closed,
  gameOf,
  onAudit,
}: {
  closed: VoteRow[]
  gameOf: (gid: string) => Game | undefined
  onAudit: (voteId: string) => void
}) {
  const t = useT()
  const [open, setOpen] = useState(false)

  if (closed.length === 0) return null

  return (
    <section className="space-y-3">
      <button
        onClick={() => setOpen((x) => !x)}
        className="flex items-center gap-2 text-xs uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
      >
        <span>{open ? '−' : '+'}</span>
        <span>{t.votes.historyLabel}</span>
        <span className="text-up-orange tabular-nums">{closed.length}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid gap-3 py-1 sm:grid-cols-2">
            {closed.map((v) => {
              const winner = v.winner_game_id ? gameOf(v.winner_game_id) : null
              const cover = winner ? steamCover(winner) : null
              return (
                <button
                  key={v.id}
                  onClick={() => onAudit(v.id)}
                  className="group relative z-0 flex gap-3 rounded-sm border border-up-line bg-up-panel/30 p-3 text-left transition-[colors,box-shadow] duration-200 hover:z-10 hover:border-up-orange hover:bg-up-panel/50 hover:shadow-[0_0_20px_rgba(255,102,0,0.12)]"
                >
                  {cover ? (
                    <img loading="lazy" src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-20 w-32 shrink-0 rounded-sm object-cover" />
                  ) : (
                    <div className="flex h-20 w-32 shrink-0 items-center justify-center rounded-sm border border-up-line/30 bg-gradient-to-br from-up-panel/60 to-black/40">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-up-dim/40">
                        <rect x="2" y="2" width="20" height="20" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <path d="m21 15-5-5L5 21" />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-wider text-up-dim">{t.votes.voteClosed}</div>
                    <div className="mt-0.5 truncate text-sm text-up-text">{v.title}</div>
                    {winner ? (
                      <div className="mt-2">
                        <div className="text-[10px] uppercase tracking-wider text-up-green">{t.votes.winner}</div>
                        <div className="truncate text-sm text-up-orange">{winner.name}</div>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-up-dim">{t.votes.noWinner}</div>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-[10px] uppercase tracking-wider text-up-dim">
                      <span><span className="text-up-text tabular-nums">{v.ballots_count}</span>/{v.eligible_voter_count} {t.votes.votesNoun}</span>
                      <span>{v.candidate_game_ids.length} {t.votes.candidates}</span>
                      <span className="inline-flex items-center gap-1 text-up-orange transition-colors group-hover:text-up-orange">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="16" y1="13" x2="8" y2="13" />
                          <line x1="16" y1="17" x2="8" y2="17" />
                          <polyline points="10 9 9 9 8 9" />
                        </svg>
                        {t.votes.audit}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
