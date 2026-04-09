import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import {
  useGroup,
  useLeaveGroup,
  useGroupPresence,
  useMembers,
  usePromote,
  useDemote,
  useKick,
  useCurrentGameAudit,
} from '@/features/groups/hooks'
import { useGames } from '@/features/games/hooks'
import { useVotes } from '@/features/votes/hooks'
import { useSessions } from '@/features/sessions/hooks'
import { useCurrentTheme } from '@/features/themes/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/nerv/Avatar'
import type { GameStage } from '@/features/games/api'
import type { CurrentGameAudit } from '@/features/groups/api'

const STAGE_LABEL: Record<GameStage, string> = {
  exploring: 'explorando',
  campaign: 'em campanha',
  endgame: 'endgame',
  paused: 'pausados',
  abandoned: 'largados',
}
const STAGE_COLOR: Record<GameStage, string> = {
  exploring: 'bg-nerv-orange',
  campaign: 'bg-nerv-green',
  endgame: 'bg-nerv-magenta',
  paused: 'bg-nerv-amber',
  abandoned: 'bg-nerv-line',
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

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

export function GroupDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const group = useGroup(id)
  const members = useMembers(id)
  const presence = useGroupPresence(id)
  const games = useGames(id)
  const votes = useVotes(id)
  const sessions = useSessions(id)
  const theme = useCurrentTheme(id)
  const currentGameAudit = useCurrentGameAudit(id)
  const leave = useLeaveGroup()
  const promote = usePromote(id)
  const demote = useDemote(id)
  const kick = useKick(id)
  const toast = useToast()
  const qc = useQueryClient()

  // tick em tempo real pro countdown + refetch periodico de tudo que muda
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])
  useEffect(() => {
    const poll = setInterval(() => {
      qc.invalidateQueries({ queryKey: ['groups', id, 'sessions'] })
      qc.invalidateQueries({ queryKey: ['groups', id, 'votes'] })
      qc.invalidateQueries({ queryKey: ['groups', id, 'themes', 'current'] })
      qc.invalidateQueries({ queryKey: ['groups', id, 'games'] })
      qc.invalidateQueries({ queryKey: ['groups', id, 'members'] })
      qc.invalidateQueries({ queryKey: ['groups', id, 'current-game', 'audit'] })
    }, 10000)
    return () => clearInterval(poll)
  }, [id, qc])

  if (group.isLoading) return <Loading />
  if (group.error) return <ErrorBox error={group.error} />
  if (!group.data) return null

  const isSysAdmin = !!me.data?.is_sys_admin
  const isAdmin = group.data.user_role === 'admin' || isSysAdmin
  const adminCount = members.data?.filter((m) => m.role === 'admin').length ?? 0
  const isSoleAdmin = isAdmin && adminCount <= 1

  const allGames = games.data ?? []
  const activeGames = allGames.filter((g) => !g.archived_at)
  const openVotes = votes.data?.filter((v) => v.status === 'open') ?? []
  const activeVote = openVotes[0]
  const upcoming = (sessions.data ?? []).filter((s) => new Date(s.start_at) > now)
  const sortedUpcoming = [...upcoming].sort((a, b) => +new Date(a.start_at) - +new Date(b.start_at))
  const nextSession = sortedUpcoming[0]
  const nextSessionGame = nextSession ? games.data?.find((g) => g.id === nextSession.game_id) : undefined
  const topGame = [...activeGames].sort((a, b) => b.viability.viability_score - a.viability.viability_score)[0]

  const stageBreakdown: { stage: GameStage; count: number }[] = (
    ['campaign', 'exploring', 'endgame', 'paused', 'abandoned'] as GameStage[]
  )
    .map((stage) => ({ stage, count: activeGames.filter((g) => g.stage === stage).length }))
    .filter((s) => s.count > 0)
  const stageTotal = stageBreakdown.reduce((acc, s) => acc + s.count, 0)

  const onLeave = async () => {
    if (isSoleAdmin) {
      toast.error('você é o único admin. promova alguém ou delete o servidor.')
      return
    }
    if (!confirm('sair do grupo?')) return
    try {
      await leave.mutateAsync(id)
      toast.success('saiu do grupo')
      navigate('/groups')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao sair')
    }
  }

  return (
    <div className="space-y-10">
      {/* HERO */}
      <motion.header
        {...fadeUp}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden border border-nerv-orange/25 bg-gradient-to-br from-nerv-panel/60 via-nerv-panel/30 to-transparent px-8 py-10"
        style={{ clipPath: 'polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 22px 100%, 0 calc(100% - 22px))' }}
      >
        {/* background visual: banner > splash > top game cover > icon blurred */}
        {(() => {
          const hasBanner = !!group.data.banner_url
          const hasSplash = !!group.data.splash_url
          const hasIcon = !!group.data.icon_url
          const fallbackGameCover = !hasBanner && !hasSplash && !hasIcon
            ? (currentGameAudit.data?.cover_url || topGame?.cover_url || null)
            : null
          const bgUrl = group.data.banner_url || group.data.splash_url || group.data.icon_url || fallbackGameCover
          if (!bgUrl) return null
          const isIcon = !hasBanner && !hasSplash && hasIcon
          const isGameCover = !hasBanner && !hasSplash && !hasIcon && !!fallbackGameCover
          return (
            <motion.div
              initial={{ opacity: 0, scale: 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0"
            >
              <img
                src={bgUrl}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                className={`h-full w-full object-cover ${
                  hasBanner ? 'opacity-40'
                  : hasSplash ? 'opacity-35'
                  : isGameCover ? 'opacity-45 blur-sm'
                  : 'scale-[2] opacity-40 blur-3xl saturate-150'
                }`}
              />
              {isIcon && (
                <img
                  src={bgUrl}
                  alt=""
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-25"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-nerv-bg via-nerv-bg/70 to-nerv-bg/20" />
              <div className="absolute inset-0 bg-gradient-to-r from-nerv-bg/80 via-transparent to-nerv-bg/40" />
            </motion.div>
          )
        })()}
        {/* corner brackets */}
        <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 border-l-2 border-t-2 border-nerv-orange/60" />
        <span className="pointer-events-none absolute bottom-1 right-1 h-4 w-4 border-b-2 border-r-2 border-nerv-orange/60" />
        {/* terminal header bar */}
        <div className="absolute left-0 right-0 top-0 flex items-center justify-between border-b border-nerv-orange/15 bg-black/30 px-4 py-1 font-mono text-[9px] uppercase tracking-[0.25em] text-nerv-orange/70">
          <span>group monitor // {group.data.name}</span>
          <span className="tabular-nums text-nerv-green">{now.toLocaleTimeString('pt-BR', { hour12: false })}</span>
        </div>
        <div className="h-5" />
        {/* scanlines decorativas */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent 0 3px, currentColor 3px 4px)',
            color: '#ff6b35',
          }}
        />
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          style={{ transformOrigin: 'left' }}
          className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-nerv-orange via-nerv-magenta to-transparent"
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-nerv-magenta">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-nerv-green nerv-pulse" />
              <span>{group.data.user_role}</span>
              {isSoleAdmin && <span className="text-nerv-dim">· único admin</span>}
              {isSysAdmin && <span className="text-nerv-red">· sys_admin</span>}
            </div>
            <h1 className="mt-3 font-display text-5xl leading-none text-nerv-text sm:text-6xl">
              {group.data.name}
            </h1>
            <div className="mt-4 flex items-center gap-5 font-mono text-[11px] text-nerv-dim">
              <Stat n={group.data.member_count} label="membros" tone="text-nerv-green" />
              <Stat n={activeGames.length} label="jogos" tone="text-nerv-amber" />
              <Stat n={openVotes.length} label="votações" tone="text-nerv-magenta" />
              <Stat n={upcoming.length} label="sessões" tone="text-nerv-orange" />
            </div>
          </div>
          {!isSoleAdmin && (
            <button
              onClick={onLeave}
              className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-red"
            >
              sair do grupo
            </button>
          )}
        </div>
      </motion.header>

      {/* GAME ATUAL — highlight principal */}
      {currentGameAudit.data && (
        <CurrentGameHero audit={currentGameAudit.data} groupId={id} isAdmin={isAdmin} now={now} />
      )}

      {/* COMMAND DECK — 3 tiles com info critica */}
      <div className="grid gap-4 md:grid-cols-3">
        <DeckTile
          i={0}
          tone="orange"
          label="próxima sessão"
          empty={!nextSession}
          emptyMsg="nada agendado"
          onClick={() => navigate(`/groups/${id}/sessions`)}
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
          empty={!theme.data}
          emptyMsg="sem tema definido"
          onClick={() => navigate(`/groups/${id}/themes`)}
          cover={theme.data?.image_url ?? null}
        >
          {theme.data && (
            <>
              <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">{theme.data.month_year}</div>
              <div className="mt-1 truncate font-display text-xl text-nerv-magenta">{theme.data.theme_name}</div>
              {theme.data.description && (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-nerv-text/70">{theme.data.description}</p>
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
          onClick={() => navigate(activeVote ? `/groups/${id}/votes` : topGame ? `/groups/${id}/games/${topGame.id}` : `/groups/${id}/games`)}
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

      {/* LIBRARY BAR */}
      {stageBreakdown.length > 0 && (
        <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.2 }} className="space-y-3">
          <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-dim">
            <span>biblioteca</span>
            <button onClick={() => navigate(`/groups/${id}/games`)} className="transition-colors hover:text-nerv-orange">
              explorar →
            </button>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-nerv-line/30">
            {stageBreakdown.map((s, i) => (
              <motion.div
                key={s.stage}
                initial={{ width: 0 }}
                animate={{ width: `${(s.count / stageTotal) * 100}%` }}
                transition={{ duration: 0.7, delay: 0.3 + i * 0.08, ease: 'easeOut' }}
                className={`${STAGE_COLOR[s.stage]}`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            {stageBreakdown.map((s) => (
              <span key={s.stage} className="flex items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full ${STAGE_COLOR[s.stage]}`} />
                {STAGE_LABEL[s.stage]}{' '}
                <span className="tabular-nums text-nerv-text/80">{s.count}</span>
              </span>
            ))}
          </div>
        </motion.section>
      )}

      {/* MEMBERS */}
      <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="space-y-3">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-dim">
          <span>tripulação</span>
          <span className="tabular-nums text-nerv-orange">{members.data?.length ?? 0}</span>
        </div>
        {members.isLoading && <Loading />}
        {members.error && <ErrorBox error={members.error} />}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {members.data?.map((m, i) => {
            const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
            const isMe = me.data?.id === m.user_id
            const roleColor =
              m.role === 'admin' ? 'text-nerv-orange' : m.role === 'mod' ? 'text-nerv-amber' : 'text-nerv-dim'
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + i * 0.03 }}
                className="group flex items-center gap-3 rounded-sm border border-nerv-line/40 bg-nerv-panel/20 px-3 py-2.5 transition-all hover:border-nerv-orange/40"
              >
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" presence={m.user?.discord_id ? (presence.data?.[m.user.discord_id] ?? 'offline') : undefined} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{name}</span>
                    {isMe && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">você</span>}
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
                </div>
                {isAdmin && !isMe && (
                  <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    {m.role !== 'admin' && (
                      <button
                        onClick={() => promote.mutate({ userId: m.user_id, role: m.role === 'mod' ? 'admin' : 'mod' })}
                        className="font-mono text-[10px] text-nerv-dim hover:text-nerv-green"
                        title="promover"
                      >
                        ↑
                      </button>
                    )}
                    {m.role !== 'member' && (
                      <button
                        onClick={() => demote.mutate(m.user_id)}
                        className="font-mono text-[10px] text-nerv-dim hover:text-nerv-amber"
                        title="rebaixar"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`remover ${name} do grupo?`)) kick.mutate(m.user_id)
                      }}
                      className="font-mono text-[10px] text-nerv-dim hover:text-nerv-red"
                      title="remover"
                    >
                      ×
                    </button>
                  </div>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.section>
    </div>
  )
}

function Stat({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className={`font-display text-xl tabular-nums ${tone}`}>{n}</span>
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  )
}

function CurrentGameHero({
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

          {/* stats + ações */}
          <div className="mt-5 flex flex-wrap items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            <span><span className="tabular-nums text-nerv-green">{audit.interest_want_count}</span> querem</span>
            <span><span className="tabular-nums text-nerv-amber">{audit.interest_meh_count}</span> ok</span>
            <span><span className="tabular-nums text-nerv-red/70">{audit.interest_nope_count}</span> pass</span>
            <span className="text-nerv-line">│</span>
            <span><span className="tabular-nums text-nerv-orange">{audit.owners_count}</span> têm na steam</span>
            <span><span className="tabular-nums text-nerv-magenta">{audit.sessions_count}</span> sessões</span>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/groups/${groupId}/games/${audit.game_id}`)}
              className="rounded-sm border border-nerv-green/50 bg-nerv-green/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-green hover:bg-nerv-green/20"
            >
              detalhes do jogo →
            </button>
            {audit.vote_id && (
              <button
                onClick={() => navigate(`/groups/${groupId}/votes`)}
                className="rounded-sm border border-nerv-dim/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/50 hover:text-nerv-orange"
              >
                votação completa
              </button>
            )}
            <button
              onClick={() => navigate(`/groups/${groupId}/history`)}
              className="rounded-sm border border-nerv-dim/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/50 hover:text-nerv-orange"
            >
              histórico
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate(`/groups/${groupId}/admin`)}
                className="rounded-sm border border-nerv-amber/40 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-nerv-amber hover:bg-nerv-amber/10"
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

function DeckTile({
  i,
  tone,
  label,
  empty,
  emptyMsg,
  onClick,
  cover,
  children,
}: {
  i: number
  tone: 'orange' | 'magenta' | 'amber'
  label: string
  empty?: boolean
  emptyMsg: string
  onClick: () => void
  cover?: string | null
  children: React.ReactNode
}) {
  const borderTone = {
    orange: 'border-nerv-orange/25 hover:border-nerv-orange/60',
    magenta: 'border-nerv-magenta/25 hover:border-nerv-magenta/60',
    amber: 'border-nerv-amber/25 hover:border-nerv-amber/60',
  }[tone]
  const labelTone = {
    orange: 'text-nerv-orange',
    magenta: 'text-nerv-magenta',
    amber: 'text-nerv-amber',
  }[tone]
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`group relative h-44 overflow-hidden border bg-nerv-panel/30 text-left transition-colors ${borderTone}`}
      style={{ clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 14px 100%, 0 calc(100% - 14px))' }}
    >
      {/* corner brackets */}
      <span className={`pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t ${labelTone.replace('text-', 'border-')}`} />
      <span className={`pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r ${labelTone.replace('text-', 'border-')}`} />
      {cover && (
        <div className="absolute inset-0">
          <img
            src={cover}
            alt=""
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-full w-full object-cover opacity-25 transition-opacity group-hover:opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/80 to-transparent" />
        </div>
      )}
      <div className="relative flex h-full flex-col p-5">
        <div className={`font-mono text-[9px] uppercase tracking-[0.25em] ${labelTone}`}>▸ {label}</div>
        <div className="mt-2 flex-1">
          {empty ? (
            <div className="flex h-full items-center justify-center font-mono text-[10px] uppercase tracking-wider text-nerv-dim/60">
              {emptyMsg}
            </div>
          ) : (
            children
          )}
        </div>
      </div>
    </motion.button>
  )
}
