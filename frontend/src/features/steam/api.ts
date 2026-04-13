import { api } from '@/lib/api'

export type GameSource = 'steam' | 'riot' | 'epic' | 'manual'

export type SteamSearchItem = {
  appid: number | null
  name: string
  header_image: string | null
  price: number | null
  source?: GameSource
  slug?: string
}

export type SteamGameDetails = {
  appid: number
  name: string
  short_description: string | null
  header_image: string | null
  price: number | null
  price_formatted: string | null
  genres: string[]
  categories: string[]
  platforms: Record<string, boolean>
  release_date: string | null
  player_min: number | null
  player_max: number | null
  developer: string | null
  metacritic_score: number | null
  price_initial: number | null
  discount_percent: number | null
  hardware_tier: 'low' | 'mid' | 'high' | 'unknown'
}

export type BuiltinGameDetails = {
  slug: string
  name: string
  source: GameSource
  cover_url: string
  description: string
  is_free: boolean
  genres: string[]
  player_min: number
  player_max: number | null
  min_hardware_tier: 'low' | 'mid' | 'high' | 'unknown'
  developer: string
  release_date: string
}

export const steamSearch = (q: string) =>
  api<SteamSearchItem[]>(`/steam/search?q=${encodeURIComponent(q)}`)

export const steamGetDetails = (appid: number) =>
  api<SteamGameDetails>(`/steam/game/${appid}`)

export const builtinGetDetails = (slug: string) =>
  api<BuiltinGameDetails>(`/steam/builtin/${slug}`)
