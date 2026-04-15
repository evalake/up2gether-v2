import { motion } from 'framer-motion'
import type { Game, GameStage } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import type { VoteSession } from '@/features/votes/api'
import type { Theme } from '@/features/themes/api'
import { DeckTile } from './DeckTile'

const STAGE_LABEL: Record<GameStage, string> = {
  exploring: 'explorando',
  campaign: 'em campanha',
  endgame: 'endgame',
  paused: 'pausados',
  abandoned: 'largados',
}

function formatCountdown(target: Date, now: Date): string {
  const ms = target.getTime() - now.getTime()
  if (ms <= 0) return 'agora'
  const mins = Math.floor(ms / 60000)
  const days = Math.floor(mins / 1440)
  const hours = Math.floor((mins % 1440) / 60)
  const m = mins % 60
  if (days >= 1) return `${days}d ${hours}h`
  if (hours >= 1) return `${hours}h ${m}m`
  return `${m}m`
}

type Props = {
  groupId: string
  now: Date
  nextSession?: PlaySession
  nextSessionGame?: Game
  theme?: Theme
  activeVote?: VoteSession
  topGame?: Game
  onNavigate: (path: string) => void
}

export function CommandDeck({ groupId, now, nextSession, nextSessionGame, theme, activeVote, topGame, onNavigate }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <DeckTile
        i={0}
        tone="orange"
        label="próxima sessão"
        empty={!nextSession}
        emptyMsg="nada agendado"
        onClick={() => onNavigate(`/groups/${groupId}/sessions`)}
        cover={nextSessionGame?.cover_url ?? null}
      >
        {nextSession && (
          <>
            <div className="truncate font-display text-xl text-nerv-orange">{nextSession.title}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
              {new Date(nextSession.start_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="font-display text-2xl text-nerv-text tabular-nums">
                {formatCountdown(new Date(nextSession.start_at), now)}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">até o drop</div>
            </div>
            <div className="mt-3 flex gap-3 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
              <span><span className="text-nerv-green tabular-nums">{nextSession.rsvp_yes}</span> vão</span>
              <span><span className="text-nerv-amber tabular-nums">{nextSession.rsvp_maybe}</span> talvez</span>
            </div>
          </>
        )}
      </DeckTile>

      <DeckTile
        i={1}
        tone="magenta"
        label="tema do mês"
        empty={!theme}
        emptyMsg="sem tema definido"
        onClick={() => onNavigate(`/groups/${groupId}/themes`)}
        cover={theme?.image_url ?? null}
      >
        {theme && (
          <>
            <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">{theme.month_year}</div>
            <div className="mt-1 truncate font-display text-xl text-nerv-magenta">{theme.theme_name}</div>
            {theme.description && (
              <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-nerv-text/70">{theme.description}</p>
            )}
          </>
        )}
      </DeckTile>

      <DeckTile
        i={2}
        tone="amber"
        label={activeVote ? 'votação ativa' : 'top viabilidade'}
        empty={!activeVote && !topGame}
        emptyMsg="sem destaques"
        onClick={() => onNavigate(activeVote ? `/groups/${groupId}/votes` : topGame ? `/groups/${groupId}/games/${topGame.id}` : `/groups/${groupId}/games`)}
        cover={activeVote ? null : topGame?.cover_url ?? null}
      >
        {activeVote ? (
          <>
            <div className="truncate font-display text-xl text-nerv-amber">{activeVote.title}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
              {activeVote.ballots_count}/{activeVote.eligible_voter_count} votos · quorum {activeVote.quorum_count}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-nerv-line/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${activeVote.eligible_voter_count > 0 ? Math.min(100, (activeVote.ballots_count / activeVote.eligible_voter_count) * 100) : 0}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-nerv-amber to-nerv-magenta"
              />
            </div>
          </>
        ) : topGame ? (
          <>
            <div className="truncate font-display text-xl text-nerv-amber">{topGame.name}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
              {STAGE_LABEL[topGame.stage]} · {topGame.viability.interest_want_count} querem
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <div className="font-display text-3xl tabular-nums text-nerv-amber">
                {Math.round(topGame.viability.viability_score)}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">viabilidade</div>
            </div>
          </>
        ) : null}
      </DeckTile>
    </div>
  )
}
