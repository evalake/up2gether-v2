import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  cancelCycle,
  castVote,
  closeCycle,
  createTheme,
  deleteSuggestion,
  deleteSuggestionById,
  deleteTheme,
  forceDecide,
  getCurrentTheme,
  getCycle,
  listThemes,
  openCycle,
  startVoting,
  upsertSuggestion,
  type SuggestionInput,
  type ThemeCreateInput,
} from './api'

export const themesKey = (groupId: string) => ['groups', groupId, 'themes'] as const
export const currentThemeKey = (groupId: string) =>
  ['groups', groupId, 'themes', 'current'] as const
export const cycleKey = (groupId: string) => ['groups', groupId, 'themes', 'cycle'] as const

export function useCurrentTheme(groupId: string) {
  return useQuery({
    queryKey: currentThemeKey(groupId),
    queryFn: () => getCurrentTheme(groupId),
    enabled: !!groupId,
  })
}

export function useThemes(groupId: string) {
  return useQuery({
    queryKey: themesKey(groupId),
    queryFn: () => listThemes(groupId),
    enabled: !!groupId,
  })
}

export function useCreateTheme(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ThemeCreateInput) => createTheme(groupId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: themesKey(groupId) })
      qc.invalidateQueries({ queryKey: currentThemeKey(groupId) })
    },
  })
}

export function useDeleteTheme(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (themeId: string) => deleteTheme(groupId, themeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: themesKey(groupId) })
      qc.invalidateQueries({ queryKey: currentThemeKey(groupId) })
    },
  })
}

export function useCycle(groupId: string) {
  return useQuery({
    queryKey: cycleKey(groupId),
    queryFn: () => getCycle(groupId),
    enabled: !!groupId,
    refetchInterval: 3_000,
  })
}

function invalidateCycle(qc: ReturnType<typeof useQueryClient>, groupId: string) {
  qc.invalidateQueries({ queryKey: cycleKey(groupId) })
  qc.invalidateQueries({ queryKey: currentThemeKey(groupId) })
  qc.invalidateQueries({ queryKey: themesKey(groupId) })
}

export function useOpenCycle(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => openCycle(groupId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useUpsertSuggestion(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, input }: { cycleId: string; input: SuggestionInput }) =>
      upsertSuggestion(groupId, cycleId, input),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useDeleteSuggestion(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cycleId: string) => deleteSuggestion(groupId, cycleId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useDeleteSuggestionById(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, suggestionId }: { cycleId: string; suggestionId: string }) =>
      deleteSuggestionById(groupId, cycleId, suggestionId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useStartVoting(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cycleId: string) => startVoting(groupId, cycleId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useCastVote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, suggestionId }: { cycleId: string; suggestionId: string }) =>
      castVote(groupId, cycleId, suggestionId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useCloseCycle(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cycleId: string) => closeCycle(groupId, cycleId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useForceDecide(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cycleId, suggestionId }: { cycleId: string; suggestionId: string }) =>
      forceDecide(groupId, cycleId, suggestionId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}

export function useCancelCycle(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (cycleId: string) => cancelCycle(groupId, cycleId),
    onSuccess: () => invalidateCycle(qc, groupId),
  })
}
