import { api } from '@/lib/api'
import type { HardwareTier } from '@/features/games/api'

export type HardwareResponse = {
  user_id: string
  tier: HardwareTier
  notes: string | null
}

export type SettingsResponse = {
  timezone: string | null
  notification_email: string | null
  locale: string | null
  onboarding_completed: boolean
  settings: Record<string, unknown>
}

export type SettingsUpdate = {
  timezone?: string | null
  notification_email?: string | null
  locale?: string | null
  onboarding_completed?: boolean
  settings?: Record<string, unknown>
}

export const setHardware = (tier: HardwareTier, notes?: string | null) =>
  api<HardwareResponse>('/users/hardware', { method: 'PUT', body: { tier, notes } })

export const getMySettings = () => api<SettingsResponse>('/users/me/settings')

export const patchMySettings = (input: SettingsUpdate) =>
  api<SettingsResponse>('/users/me/settings', { method: 'PATCH', body: input })

export const deleteMyAccount = () =>
  api<void>('/users/me', { method: 'DELETE' })
