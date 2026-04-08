import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMySettings,
  patchMySettings,
  setHardware,
  type SettingsUpdate,
} from './api'
import type { HardwareTier } from '@/features/games/api'

export const settingsKey = ['users', 'me', 'settings'] as const
export const hardwareKey = ['users', 'me', 'hardware'] as const

export function useMySettings() {
  return useQuery({ queryKey: settingsKey, queryFn: getMySettings })
}

export function usePatchSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingsUpdate) => patchMySettings(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: settingsKey }),
  })
}

export function useSetHardware() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { tier: HardwareTier; notes?: string | null }) =>
      setHardware(vars.tier, vars.notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: hardwareKey })
      qc.invalidateQueries({ queryKey: ['me'] })
      // viability depende de member_tiers, entao games e game detail precisam refetch
      qc.invalidateQueries({ queryKey: ['games'] })
    },
  })
}
