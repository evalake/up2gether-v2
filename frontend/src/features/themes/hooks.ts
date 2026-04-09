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
  getThemeAudit,
  getThemeCycleAudit,
  listThemes,
  openCycle,
  startVoting,
  upsertSuggestion,
  type Cycle,
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
    refetchInterval: 30_000,
  })
}

export function useThemes(groupId: string) {
  return useQuery({
    queryKey: themesKey(groupId),
    queryFn: () => listThemes(groupId),
    enabled: !!groupId,
    refetchInterval: 60_000,
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
    refetchInterval: 10_000,
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
  const key = cycleKey(groupId)
  return useMutation({
    mutationFn: ({ cycleId, suggestionId }: { cycleId: string; suggestionId: string }) =>
      castVote(groupId, cycleId, suggestionId),
    onMutate: async ({ suggestionId }) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Cycle | null>(key)
      if (prev) {
        // toggle: se ja votou nessa sugestao, remove; senao troca
        const current = prev.user_vote_suggestion_id
        const next = current === suggestionId ? null : suggestionId
        const suggestions = prev.suggestions.map((s) => {
          let delta = 0
          if (s.id === current) delta -= 1
          if (s.id === next) delta += 1
          return delta ? { ...s, vote_count: Math.max(0, s.vote_count + delta) } : s
        })
        const total_votes = Math.max(
          0,
          prev.total_votes + (current ? -1 : 0) + (next ? 1 : 0),
        )
        qc.setQueryData<Cycle | null>(key, {
          ...prev,
          suggestions,
          user_vote_suggestion_id: next,
          total_votes,
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev !== undefined) qc.setQueryData(key, ctx.prev)
    },
    onSuccess: (fresh) => qc.setQueryData(key, fresh),
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

export function useThemeAudit(
  groupId: string,
  target: { themeId?: string | null; cycleId?: string | null },
) {
  const themeId = target.themeId ?? null
  const cycleId = target.cycleId ?? null
  return useQuery({
    queryKey: ['groups', groupId, 'themes', 'audit', { themeId, cycleId }] as const,
    queryFn: () =>
      themeId
        ? getThemeAudit(groupId, themeId)
        : getThemeCycleAudit(groupId, cycleId!),
    enabled: !!groupId && (!!themeId || !!cycleId),
    staleTime: 5_000,
  })
}
