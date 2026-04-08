import { api } from '@/lib/api'

export type GameStage = 'exploring' | 'campaign' | 'endgame' | 'paused' | 'abandoned'
export type HardwareTier = 'low' | 'mid' | 'high' | 'unknown'
export type InterestSignal = 'want' | 'ok' | 'pass'

export type GameViability = {
  price_score: number
  hardware_fit_percent: number
  interest_score: number
  viability_score: number
  interest_want_count: number
  interest_ok_count: number
  interest_pass_count: number
  ownership_count: number
}

export type Game = {
  id: string
  group_id: string
  name: string
  steam_appid: number | null
  cover_url: string | null
  description: string | null
  is_free: boolean
  price_current: number | null
  genres: string[]
  tags: string[]
  player_min: number
  player_max: number | null
  min_hardware_tier: HardwareTier
  stage: GameStage
  stage_updated_at: string
  created_by: string | null
  created_at: string
  archived_at: string | null
  developer: string | null
  release_date: string | null
  metacritic_score: number | null
  price_original: number | null
  discount_percent: number | null
  review_score_desc: string | null
  viability: GameViability
  user_interest: InterestSignal | null
  user_in_roster: boolean
  user_owns_game: boolean
}

export type GameCreateInput = {
  name: string
  steam_appid?: number | null
  cover_url?: string | null
  description?: string | null
  is_free?: boolean
  price_current?: number | null
  genres?: string[]
  tags?: string[]
  player_min?: number
  player_max?: number | null
  min_hardware_tier?: HardwareTier
  developer?: string | null
  release_date?: string | null
  metacritic_score?: number | null
  price_original?: number | null
  discount_percent?: number | null
}

export const listGames = (groupId: string) =>
  api<Game[]>(`/groups/${groupId}/games`)

export const getGame = (groupId: string, gameId: string) =>
  api<Game>(`/groups/${groupId}/games/${gameId}`)

export const createGame = (groupId: string, input: GameCreateInput) =>
  api<Game>(`/groups/${groupId}/games`, { method: 'POST', body: input })

export const archiveGame = (groupId: string, gameId: string) =>
  api<null>(`/groups/${groupId}/games/${gameId}`, { method: 'DELETE' })

export const setInterest = (gameId: string, signal: InterestSignal) =>
  api<null>(`/games/${gameId}/interest`, { method: 'PUT', body: { signal } })

export const joinRoster = (gameId: string) =>
  api<null>(`/games/${gameId}/roster`, { method: 'POST' })

export const leaveRoster = (gameId: string) =>
  api<null>(`/games/${gameId}/roster`, { method: 'DELETE' })

export const setOwnership = (gameId: string, owns: boolean) =>
  api<null>(`/games/${gameId}/ownership`, { method: 'PUT', body: { owns } })

export type GameOwner = {
  id: string
  discord_id: string
  discord_username: string
  discord_display_name: string | null
  discord_avatar: string | null
}

export const listGameOwners = (gameId: string) =>
  api<GameOwner[]>(`/games/${gameId}/owners`)

export type GameUpdateInput = Partial<GameCreateInput> & { stage?: GameStage }

export const updateGame = (groupId: string, gameId: string, input: GameUpdateInput) =>
  api<Game>(`/groups/${groupId}/games/${gameId}`, { method: 'PATCH', body: input })
