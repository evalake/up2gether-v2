import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
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
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'
import type { GameStage } from '@/features/games/api'
import { useTitle } from '@/lib/useTitle'
import { useT } from '@/i18n'
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
  const currentGameAudit = useCurrentGameAudit(id)
  const leave = useLeaveGroup()
  const promote = usePromote(id)
  const demote = useDemote(id)
  const kick = useKick(id)
  const toast = useToast()
  const t = useT()
  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ title: string; body: string; onConfirm: () => void } | null>(null)

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

  const onLeave = () => {
    if (isSoleAdmin) {
      toast.error(t.groupDetail.onlyAdminToast)
      return
    }
    setConfirmAction({
      title: t.groupDetail.leaveTitle,
      body: t.groupDetail.leaveBody(group.data!.name),
      onConfirm: async () => {
        try {
          await leave.mutateAsync(id)
          toast.success(t.groupDetail.leftGroup)
          navigate('/groups')
        } catch (e) {
          toast.error(e instanceof Error ? e.message : t.groupDetail.leaveFail)
        }
      },
    })
  }

  return (
    <div className="space-y-6">
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
      />

      <CommandDeck
        groupId={id}
        now={now}
        nextSession={nextSession}
        nextSessionGame={nextSessionGame}
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
          setConfirmAction({
            title: t.groupDetail.removeMemberTitle,
            body: t.groupDetail.removeMemberBody(name),
            onConfirm: () => kick.mutate(userId),
          })
        }}
      />

      <MemberProfileModal groupId={id} userId={profileUserId} onClose={() => setProfileUserId(null)} />

      <AnimatePresence>
        {confirmAction && (
          <ConfirmModal
            title={confirmAction.title}
            body={confirmAction.body}
            onConfirm={() => { confirmAction.onConfirm(); setConfirmAction(null) }}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function ConfirmModal({ title, body, onConfirm, onCancel }: {
  title: string
  body: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-lg border border-up-orange/25 bg-up-panel shadow-2xl shadow-black/40"
      >
        <div className="border-b border-up-orange/15 px-5 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-orange">{title}</div>
        </div>
        <div className="px-5 py-4 text-sm leading-relaxed text-up-dim">{body}</div>
        <div className="flex items-center justify-end gap-2 border-t border-up-orange/15 bg-black/20 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-sm border border-up-line/60 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-text/40 hover:text-up-text"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/20"
          >
            {t.common.confirm}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
