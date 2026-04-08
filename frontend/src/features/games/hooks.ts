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
  type GameCreateInput,
  type GameUpdateInput,
  type InterestSignal,
} from './api'

export const gamesKey = (groupId: string) => ['groups', groupId, 'games'] as const

export function useGames(groupId: string) {
  return useQuery({
    queryKey: gamesKey(groupId),
    queryFn: () => listGames(groupId),
    enabled: !!groupId,
    refetchInterval: 20_000,
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

export function useSetInterest(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string; signal: InterestSignal }) =>
      setInterest(vars.gameId, vars.signal),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamesKey(groupId) }),
  })
}

export function useToggleRoster(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string; join: boolean }) =>
      vars.join ? joinRoster(vars.gameId) : leaveRoster(vars.gameId),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamesKey(groupId) }),
  })
}

export const gameKey = (groupId: string, gameId: string) =>
  ['groups', groupId, 'games', gameId] as const
export const gameOwnersKey = (gameId: string) => ['games', gameId, 'owners'] as const

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
  return useMutation({
    mutationFn: (vars: { gameId: string; owns: boolean }) =>
      setOwnership(vars.gameId, vars.owns),
    onSuccess: () => qc.invalidateQueries({ queryKey: gamesKey(groupId) }),
  })
}
