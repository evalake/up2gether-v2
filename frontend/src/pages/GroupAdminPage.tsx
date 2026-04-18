import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGroup,
  useDeleteGroup,
  usePurgeGroup,
  useSyncDiscord,
  useCurrentGameAudit,
  useSetCurrentGame,
  useMembers,
  usePromote,
  useDemote,
  useKick,
} from '@/features/groups/hooks'
import { useGames } from '@/features/games/hooks'
import { useVotes } from '@/features/votes/hooks'
import { useSessions } from '@/features/sessions/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { GamesTab } from './admin/GamesTab'
import { VotesTab } from './admin/VotesTab'
import { SessionsTab } from './admin/SessionsTab'
import { MembersTab } from './admin/MembersTab'
import { ConfigTab } from './admin/ConfigTab'
import { DangerZone } from './admin/DangerZone'
import { CurrentGameSection, OverviewCounters, SeatIndicator, type AdminTab } from './admin/OverviewTab'
import { useTitle } from '@/lib/useTitle'
import { useT } from '@/i18n'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'

export function GroupAdminPage() {
  const t = useT()

  const TABS: { key: AdminTab; label: string; ownerOnly?: boolean }[] = [
    { key: 'overview', label: t.admin.tabs.overview },
    { key: 'games', label: t.admin.tabs.games },
    { key: 'votes', label: t.admin.tabs.votes },
    { key: 'sessions', label: t.admin.tabs.sessions },
    { key: 'members', label: t.admin.tabs.members },
    { key: 'config', label: t.admin.tabs.config },
    { key: 'danger', label: t.admin.tabs.danger, ownerOnly: true },
  ]
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const group = useGroup(id)
  useTitle(group.data ? `admin · ${group.data.name}` : undefined)
  const del = useDeleteGroup()
  const purge = usePurgeGroup()
  const sync = useSyncDiscord()
  const currentGame = useCurrentGameAudit(id)
  const setCurrent = useSetCurrentGame(id)
  const games = useGames(id)
  const members = useMembers(id)
  const allVotes = useVotes(id)
  const allSessions = useSessions(id)
  const promote = usePromote(id)
  const demote = useDemote(id)
  const kick = useKick(id)
  const toast = useToast()
  const [tab, setTab] = useState<AdminTab>('overview')
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  if (group.isLoading) return <Loading />
  if (group.error) return <ErrorBox error={group.error} />
  if (!group.data) return null

  const isSysAdmin = !!me.data?.is_sys_admin
  const isAdmin = group.data.user_role === 'admin' || isSysAdmin
  const isOwner = group.data.owner_user_id === me.data?.id || isSysAdmin

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-up-text">{t.admin.panelTitle}</h1>
        <p className="text-sm text-up-dim">{t.admin.noPermission}</p>
        <Link to={`/groups/${id}`} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">
          {t.admin.backLabel}
        </Link>
      </div>
    )
  }

  const onReset = async () => {
    try {
      await purge.mutateAsync(id)
      toast.success(t.admin.dataReset)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.fail)
    }
  }

  const onDelete = async () => {
    try {
      await del.mutateAsync(id)
      toast.success(t.admin.groupDeleted)
      navigate('/groups')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.common.fail)
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-up-orange">{t.admin.panelTitle}</div>
          <h1 className="mt-1 font-display text-3xl text-up-text">{group.data.name}</h1>
          <p className="mt-1 text-xs text-up-dim">{t.admin.panelSubtitle}</p>
        </div>
        <Link
          to={`/groups/${id}`}
          className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
        >
          {t.admin.backLabel}
        </Link>
      </header>

      <SeatIndicator group={group.data} />

      <div className="flex flex-wrap gap-1 border-b border-up-line/50 pb-1">
        {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t-sm border-b-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              tab === t.key
                ? t.key === 'danger'
                  ? 'border-up-red text-up-red'
                  : 'border-up-orange text-up-orange'
                : 'border-transparent text-up-dim transition-colors hover:text-up-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18 }}
          className="space-y-6"
        >
          {tab === 'overview' && (
            <>
              <CurrentGameSection
                groupId={id}
                currentGame={currentGame.data ?? undefined}
                games={games.data}
                setCurrent={setCurrent}
              />
              <OverviewCounters
                games={games.data?.filter((g) => !g.archived_at).length ?? 0}
                members={members.data?.length ?? 0}
                votes={allVotes.data?.length ?? 0}
                sessions={allSessions.data?.length ?? 0}
                onJump={setTab}
              />
            </>
          )}

          {tab === 'games' && <GamesTab groupId={id} />}
          {tab === 'votes' && <VotesTab groupId={id} />}
          {tab === 'sessions' && <SessionsTab groupId={id} />}

          {tab === 'config' && <ConfigTab group={group.data} sync={sync} />}

          {tab === 'members' && (
            <MembersTab
              members={members.data}
              isLoading={members.isLoading}
              error={members.error}
              currentUserId={me.data?.id}
              ownerUserId={group.data.owner_user_id}
              isOwner={isOwner}
              onOpenProfile={setProfileUserId}
              promote={promote}
              demote={demote}
              kick={kick}
            />
          )}

          {tab === 'danger' && isOwner && (
            <DangerZone
              onConfirmReset={onReset}
              onConfirmDelete={onDelete}
              resetPending={purge.isPending}
              deletePending={del.isPending}
            />
          )}
        </motion.div>
      </AnimatePresence>
      <MemberProfileModal groupId={id} userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
