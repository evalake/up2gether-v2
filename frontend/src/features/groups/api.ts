import { api } from '@/lib/api'

export type GroupRole = 'admin' | 'mod' | 'member'

export type Group = {
  id: string
  name: string
  discord_guild_id: string
  icon_url: string | null
  banner_url: string | null
  splash_url: string | null
  accent_color: number | null
  description: string | null
  current_game_id: string | null
  current_game_source: 'vote' | 'manual' | null
  current_game_set_at: string | null
  current_game_set_by: string | null
  current_game_vote_id: string | null
  owner_user_id: string | null
  webhook_url: string | null
  budget_max: number | null
  typical_party_size: number
  created_at: string
}

export type GroupWithStats = Group & {
  member_count: number
  game_count: number
  active_vote_sessions: number
  user_role: GroupRole
}

export type GroupMember = {
  id: string
  user_id: string
  group_id: string
  role: GroupRole
  joined_at: string
  user: {
    id: string
    discord_id: string
    discord_username: string
    discord_display_name: string | null
    discord_avatar: string | null
  } | null
}

export type GroupCreateInput = {
  discord_guild_id: string
  name: string
  icon_url?: string | null
  webhook_url?: string | null
  discord_permissions?: string | null
}

export const purgeGroup = (id: string) =>
  api<null>(`/groups/${id}/purge`, { method: 'POST' })

export const listGroups = () => api<GroupWithStats[]>('/groups')

export const getGroup = (id: string) => api<GroupWithStats>(`/groups/${id}`)

export const listMembers = (id: string) =>
  api<GroupMember[]>(`/groups/${id}/members`)

export const createGroup = (input: GroupCreateInput) =>
  api<Group>('/groups', { method: 'POST', body: input })

export const leaveGroup = (id: string) =>
  api<null>(`/groups/${id}/leave`, { method: 'DELETE' })

export const deleteGroup = (id: string) =>
  api<null>(`/groups/${id}`, { method: 'DELETE' })

export const promoteMember = (groupId: string, userId: string, newRole: GroupRole) =>
  api<null>(`/groups/${groupId}/members/${userId}/promote`, {
    method: 'POST',
    body: { new_role: newRole },
  })

export const demoteMember = (groupId: string, userId: string) =>
  api<null>(`/groups/${groupId}/members/${userId}/demote`, { method: 'POST' })

export const kickMember = (groupId: string, userId: string) =>
  api<null>(`/groups/${groupId}/members/${userId}`, { method: 'DELETE' })

export const syncDiscord = (id: string) =>
  api<Group>(`/groups/${id}/sync-discord`, { method: 'POST' })

export type CurrentGameAudit = {
  game_id: string
  name: string
  cover_url: string | null
  source: 'vote' | 'manual' | null
  set_at: string | null
  set_by_user_id: string | null
  set_by_user_name: string | null
  vote_id: string | null
  vote_title: string | null
  vote_ballots_count: number | null
  vote_eligible_count: number | null
  vote_winner_approvals: number | null
  vote_was_tiebreak: boolean
  vote_runner_ups: { game_id: string; name: string; cover_url: string | null; approvals: number }[]
  added_by_user_id: string | null
  added_by_user_name: string | null
  added_at: string | null
  interest_want_count: number
  interest_meh_count: number
  interest_nope_count: number
  owners_count: number
  sessions_count: number
}

export const getCurrentGameAudit = (id: string) =>
  api<CurrentGameAudit | null>(`/groups/${id}/current-game/audit`)

export const setCurrentGame = (id: string, game_id: string | null, lock_manual = true) =>
  api<Group>(`/groups/${id}/current-game`, {
    method: 'PATCH',
    body: { game_id, lock_manual },
  })

export const updateWebhook = (groupId: string, webhook_url: string | null) =>
  api<null>(`/groups/${groupId}/webhook`, {
    method: 'PUT',
    body: { webhook_url },
  })

export type PresenceStatus = 'online' | 'idle' | 'dnd' | 'offline'
export const getGroupPresence = (groupId: string) =>
  api<Record<string, PresenceStatus>>(`/groups/${groupId}/presence`)
