import { motion } from 'framer-motion'
import type { Game, GameStage } from '@/features/games/api'
import type { PlaySession } from '@/features/sessions/api'
import type { VoteSession } from '@/features/votes/api'
import type { Theme } from '@/features/themes/api'
import { DeckTile } from './DeckTile'

const STAGE_LABEL: Record<GameStage, string> = {
  exploring: 'explorando',
  campaign: 'em campanha',
  endgame: 'fim de jogo',
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
        emptyMsg="Nenhuma sessao agendada ainda"
        emptyCta="agendar sessao"
        onClick={() => onNavigate(`/groups/${groupId}/sessions`)}
        cover={nextSessionGame?.cover_url ?? null}
      >
        {nextSession && (
          <>
            <div className="line-clamp-2 font-display text-lg leading-tight text-up-orange">{nextSession.title}</div>
            <div className="mt-1 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {new Date(nextSession.start_at).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="font-display text-xl text-up-text tabular-nums">
                {formatCountdown(new Date(nextSession.start_at), now)}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">ate o drop</div>
            </div>
            <div className="mt-2 flex gap-3 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              <span><span className="text-up-green tabular-nums">{nextSession.rsvp_yes}</span> vão</span>
              <span><span className="text-up-amber tabular-nums">{nextSession.rsvp_maybe}</span> talvez</span>
            </div>
          </>
        )}
      </DeckTile>

      <DeckTile
        i={1}
        tone="magenta"
        label="tema do mês"
        empty={!theme}
        emptyMsg="Sem tema definido para este mes"
        emptyCta="escolher tema"
        onClick={() => onNavigate(`/groups/${groupId}/themes`)}
        cover={theme?.image_url ?? null}
      >
        {theme && (
          <>
            <div className="flex items-center gap-2">
              <span className="rounded-sm border border-up-magenta/30 bg-up-magenta/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-up-magenta">{theme.month_year}</span>
            </div>
            <div className="mt-1.5 line-clamp-2 font-display text-xl leading-tight text-up-magenta">{theme.theme_name}</div>
            {theme.description && (
              <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-up-dim">{theme.description}</p>
            )}
          </>
        )}
      </DeckTile>

      <DeckTile
        i={2}
        tone="amber"
        label={activeVote ? 'votação ativa' : 'top viabilidade'}
        empty={!activeVote && !topGame}
        emptyMsg="Adicione jogos para ver destaques"
        emptyCta="explorar biblioteca"
        onClick={() => onNavigate(activeVote ? `/groups/${groupId}/votes` : topGame ? `/groups/${groupId}/games/${topGame.id}` : `/groups/${groupId}/games`)}
        cover={activeVote ? null : topGame?.cover_url ?? null}
      >
        {activeVote ? (
          <>
            <div className="line-clamp-2 font-display text-lg leading-tight text-up-amber">{activeVote.title}</div>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {activeVote.ballots_count}/{activeVote.eligible_voter_count} votos · quorum {activeVote.quorum_count}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-up-line/30">
              <motion.div
                initial={{ width: 0 }}
                animate={{
                  width: `${activeVote.eligible_voter_count > 0 ? Math.min(100, (activeVote.ballots_count / activeVote.eligible_voter_count) * 100) : 0}%`,
                }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-up-amber to-up-magenta"
              />
            </div>
          </>
        ) : topGame ? (
          <>
            <div className="line-clamp-2 font-display text-lg leading-tight text-up-amber">{topGame.name}</div>
            <div className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim">
              {STAGE_LABEL[topGame.stage]} · {topGame.viability.interest_want_count} querem
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div className="font-display text-2xl tabular-nums text-up-amber">
                {Math.round(topGame.viability.viability_score)}%
              </div>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-up-line/30">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, topGame.viability.viability_score)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-up-amber"
                />
              </div>
            </div>
          </>
        ) : null}
      </DeckTile>
    </div>
  )
}
