import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  useGroup,
  useLeaveGroup,
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
import { MemberProfileModal } from '@/components/members/MemberProfileModal'
import type { GameStage } from '@/features/games/api'
import { useTitle } from '@/lib/useTitle'
import { CurrentGameHero } from './group-detail/CurrentGameHero'
import { GroupHero } from './group-detail/GroupHero'
import { CommandDeck } from './group-detail/CommandDeck'
import { LibraryBar } from './group-detail/LibraryBar'
import { MembersSection } from './group-detail/MembersSection'
import { FirstStepsGuide } from './group-detail/FirstStepsGuide'

export function GroupDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const group = useGroup(id)
  useTitle(group.data?.name)
  const members = useMembers(id)
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

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
      <GroupHero
        group={group.data}
        isSoleAdmin={isSoleAdmin}
        isSysAdmin={isSysAdmin}
        now={now}
        stats={{
          members: group.data.member_count,
          games: activeGames.length,
          votes: openVotes.length,
          sessions: upcoming.length,
        }}
        fallbackGameCover={currentGameAudit.data?.cover_url || topGame?.cover_url || null}
        onLeave={onLeave}
      />

      {currentGameAudit.data && (
        <CurrentGameHero audit={currentGameAudit.data} groupId={id} isAdmin={isAdmin} now={now} />
      )}

      <FirstStepsGuide
        groupId={id}
        gamesCount={activeGames.length}
        votesCount={(votes.data ?? []).length}
        sessionsCount={(sessions.data ?? []).length}
        hasTheme={!!theme.data}
      />

      <CommandDeck
        groupId={id}
        now={now}
        nextSession={nextSession}
        nextSessionGame={nextSessionGame}
        theme={theme.data ?? undefined}
        activeVote={activeVote}
        topGame={topGame}
        onNavigate={navigate}
      />

      <LibraryBar breakdown={stageBreakdown} onExplore={() => navigate(`/groups/${id}/games`)} />

      <MembersSection
        members={members.data}
        isLoading={members.isLoading}
        error={members.error}
        isAdmin={isAdmin}
        meId={me.data?.id}
        onOpenProfile={setProfileUserId}
        onPromote={(userId, role) => promote.mutate({ userId, role })}
        onDemote={(userId) => demote.mutate(userId)}
        onKick={(userId, name) => {
          if (confirm(`remover ${name} do grupo?`)) kick.mutate(userId)
        }}
      />

      <MemberProfileModal groupId={id} userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
