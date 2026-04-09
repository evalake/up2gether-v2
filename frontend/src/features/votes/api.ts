import { api } from '@/lib/api'

export type VoteStatus = 'open' | 'closed' | 'archived'

export type VoteStage = {
  id: string
  stage_number: number
  candidate_game_ids: string[]
  max_selections: number
  status: VoteStatus
  opens_at: string
  closes_at: string | null
  closed_at: string | null
}

export type VoteSession = {
  id: string
  group_id: string
  created_by: string | null
  title: string
  description: string | null
  status: VoteStatus
  candidate_game_ids: string[]
  eligible_voter_count: number
  quorum_count: number
  max_selections: number
  opens_at: string
  closes_at: string | null
  closed_at: string | null
  winner_game_id: string | null
  created_at: string
  ballots_count: number
  tallies: Record<string, number>
  your_approvals: string[]
  current_stage_number: number | null
  total_stages: number | null
  stages: VoteStage[]
}

export type VoteCreateInput = {
  title: string
  description?: string | null
  candidate_game_ids: string[]
  duration_hours?: number
}

export const listVotes = (groupId: string) =>
  api<VoteSession[]>(`/groups/${groupId}/votes`)

export const getVote = (groupId: string, voteId: string) =>
  api<VoteSession>(`/groups/${groupId}/votes/${voteId}`)

export const createVote = (groupId: string, input: VoteCreateInput) =>
  api<VoteSession>(`/groups/${groupId}/votes`, { method: 'POST', body: input })

export const submitBallot = (voteId: string, approvals: string[]) =>
  api<VoteSession>(`/votes/${voteId}/ballot`, { method: 'PUT', body: { approvals } })

export const closeVote = (groupId: string, voteId: string) =>
  api<VoteSession>(`/groups/${groupId}/votes/${voteId}/close`, { method: 'POST' })

export const deleteVote = (groupId: string, voteId: string) =>
  api<null>(`/groups/${groupId}/votes/${voteId}`, { method: 'DELETE' })
