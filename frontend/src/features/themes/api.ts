import { api } from '@/lib/api'

export type Theme = {
  id: string
  group_id: string
  month_year: string
  theme_name: string
  description: string | null
  image_url: string | null
  decided_by: string
  decided_at: string
  created_by: string | null
}

export type ThemeCreateInput = {
  theme_name: string
  description?: string | null
  image_url?: string | null
  month_year?: string | null
}

export type CyclePhase = 'suggesting' | 'voting' | 'decided' | 'cancelled'

export type Suggestion = {
  id: string
  cycle_id: string
  user_id: string
  user_name: string | null
  user_avatar: string | null
  user_discord_id: string | null
  name: string
  description: string | null
  image_url: string | null
  vote_count: number
}

export type Cycle = {
  id: string
  group_id: string
  month_year: string
  phase: CyclePhase
  opened_by: string | null
  winner_suggestion_id: string | null
  tiebreak_kind: string | null
  tied_suggestion_ids: string[] | null
  decided_at: string | null
  suggestions: Suggestion[]
  user_suggestion_id: string | null
  user_vote_suggestion_id: string | null
  total_votes: number
}

export type SuggestionInput = {
  name: string
  description?: string | null
  image_url?: string | null
}

export const getCurrentTheme = (groupId: string) =>
  api<Theme | null>(`/groups/${groupId}/themes/current`)

export const listThemes = (groupId: string) =>
  api<Theme[]>(`/groups/${groupId}/themes`)

export const createTheme = (groupId: string, input: ThemeCreateInput) =>
  api<Theme>(`/groups/${groupId}/themes`, { method: 'POST', body: input })

export const deleteTheme = (groupId: string, themeId: string) =>
  api<null>(`/groups/${groupId}/themes/${themeId}`, { method: 'DELETE' })

// cycles
export const getCycle = (groupId: string) =>
  api<Cycle | null>(`/groups/${groupId}/themes/cycle`)

export const openCycle = (groupId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle`, { method: 'POST' })

export const upsertSuggestion = (groupId: string, cycleId: string, input: SuggestionInput) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/suggestion`, { method: 'PUT', body: input })

export const deleteSuggestion = (groupId: string, cycleId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/suggestion`, { method: 'DELETE' })

export const deleteSuggestionById = (groupId: string, cycleId: string, suggestionId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/suggestion/${suggestionId}`, { method: 'DELETE' })

export const startVoting = (groupId: string, cycleId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/start-voting`, { method: 'POST' })

export const castVote = (groupId: string, cycleId: string, suggestionId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/vote`, { method: 'PUT', body: { suggestion_id: suggestionId } })

export const closeCycle = (groupId: string, cycleId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/close`, { method: 'POST' })

export const forceDecide = (groupId: string, cycleId: string, suggestionId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/force/${suggestionId}`, { method: 'POST' })

export const cancelCycle = (groupId: string, cycleId: string) =>
  api<Cycle>(`/groups/${groupId}/themes/cycle/${cycleId}/cancel`, { method: 'POST' })
