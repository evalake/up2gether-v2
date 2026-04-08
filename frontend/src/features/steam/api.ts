import { api } from '@/lib/api'

export type SteamSearchItem = {
  appid: number
  name: string
  header_image: string | null
  price: number | null
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

export const steamSearch = (q: string) =>
  api<SteamSearchItem[]>(`/steam/search?q=${encodeURIComponent(q)}`)

export const steamGetDetails = (appid: number) =>
  api<SteamGameDetails>(`/steam/game/${appid}`)
