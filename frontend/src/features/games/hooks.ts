import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  archiveGame,
  createGame,
  getGame,
  joinRoster,
  leaveRoster,
  listGameOwners,
  listGames,
  setInterest,
  setOwnership,
  updateGame,
  type Game,
  type GameCreateInput,
  type GameUpdateInput,
  type InterestSignal,
} from './api'

export const gamesKey = (groupId: string) => ['groups', groupId, 'games'] as const
// detail key propositalmente fora do prefixo da lista, pra invalidate da lista
// nao cascatear em todos os details em cache (era o principal gargalo na aba games)
export const gameKey = (groupId: string, gameId: string) =>
  ['game-detail', groupId, gameId] as const
export const gameOwnersKey = (gameId: string) => ['games', gameId, 'owners'] as const

export function useGames(groupId: string) {
  return useQuery({
    queryKey: gamesKey(groupId),
    queryFn: () => listGames(groupId),
    enabled: !!groupId,
    refetchInterval: 60_000,
  })
}

export function useCreateGame(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GameCreateInput) => createGame(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamesKey(groupId) }),
  })
}

export function useArchiveGame(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (gameId: string) => archiveGame(groupId, gameId),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamesKey(groupId) }),
  })
}

// optimistic: o server so recalcula viability depois, mas user_interest
// e os counts batem instantaneo. refetch no background reconcilia.
export function useSetInterest(groupId: string) {
  const qc = useQueryClient()
  const key = gamesKey(groupId)
  return useMutation({
    mutationFn: (vars: { gameId: string; signal: InterestSignal }) =>
      setInterest(vars.gameId, vars.signal),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Game[]>(key)
      if (prev) {
        qc.setQueryData<Game[]>(
          key,
          prev.map((g) => {
            if (g.id !== vars.gameId) return g
            const old = g.user_interest
            if (old === vars.signal) return g
            const v = { ...g.viability }
            if (old === 'want') v.interest_want_count = Math.max(0, v.interest_want_count - 1)
            if (old === 'ok') v.interest_ok_count = Math.max(0, v.interest_ok_count - 1)
            if (old === 'pass') v.interest_pass_count = Math.max(0, v.interest_pass_count - 1)
            if (vars.signal === 'want') v.interest_want_count += 1
            if (vars.signal === 'ok') v.interest_ok_count += 1
            if (vars.signal === 'pass') v.interest_pass_count += 1
            return { ...g, user_interest: vars.signal, viability: v }
          }),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    // nao invalida no success: evita refetch a cada clique. o poll de 60s
    // e o realtime reconciliam. se der erro, o onError ja reverte.
  })
}

export function useToggleRoster(groupId: string) {
  const qc = useQueryClient()
  const key = gamesKey(groupId)
  return useMutation({
    mutationFn: (vars: { gameId: string; join: boolean }) =>
      vars.join ? joinRoster(vars.gameId) : leaveRoster(vars.gameId),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Game[]>(key)
      if (prev) {
        qc.setQueryData<Game[]>(
          key,
          prev.map((g) =>
            g.id === vars.gameId ? { ...g, user_in_roster: vars.join } : g,
          ),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
  })
}

export function useGame(groupId: string, gameId: string) {
  return useQuery({
    queryKey: gameKey(groupId, gameId),
    queryFn: () => getGame(groupId, gameId),
    enabled: !!groupId && !!gameId,
  })
}

export function useGameOwners(gameId: string) {
  return useQuery({
    queryKey: gameOwnersKey(gameId),
    queryFn: () => listGameOwners(gameId),
    enabled: !!gameId,
  })
}

export function useUpdateGame(groupId: string, gameId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GameUpdateInput) => updateGame(groupId, gameId, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: gamesKey(groupId) })
      qc.invalidateQueries({ queryKey: gameKey(groupId, gameId) })
    },
  })
}

export function useToggleOwnership(groupId: string) {
  const qc = useQueryClient()
  const key = gamesKey(groupId)
  return useMutation({
    mutationFn: (vars: { gameId: string; owns: boolean }) =>
      setOwnership(vars.gameId, vars.owns),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Game[]>(key)
      if (prev) {
        qc.setQueryData<Game[]>(
          key,
          prev.map((g) => {
            if (g.id !== vars.gameId) return g
            const delta = vars.owns === g.user_owns_game ? 0 : vars.owns ? 1 : -1
            return {
              ...g,
              user_owns_game: vars.owns,
              viability: {
                ...g.viability,
                ownership_count: Math.max(0, g.viability.ownership_count + delta),
              },
            }
          }),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
  })
}
