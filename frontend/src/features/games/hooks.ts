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

// helper: aplica patch otimista tanto na lista quanto no detail do jogo
function patchGame(
  qc: ReturnType<typeof useQueryClient>,
  groupId: string,
  gameId: string,
  patch: (g: Game) => Game,
) {
  const listKey = gamesKey(groupId)
  const detailKey = gameKey(groupId, gameId)
  const prevList = qc.getQueryData<Game[]>(listKey)
  const prevDetail = qc.getQueryData<Game>(detailKey)
  if (prevList) {
    qc.setQueryData<Game[]>(
      listKey,
      prevList.map((g) => (g.id === gameId ? patch(g) : g)),
    )
  }
  if (prevDetail && prevDetail.id === gameId) {
    qc.setQueryData<Game>(detailKey, patch(prevDetail))
  }
  return { prevList, prevDetail }
}

function restoreGame(
  qc: ReturnType<typeof useQueryClient>,
  groupId: string,
  gameId: string,
  ctx: { prevList?: Game[]; prevDetail?: Game } | undefined,
) {
  if (!ctx) return
  if (ctx.prevList) qc.setQueryData(gamesKey(groupId), ctx.prevList)
  if (ctx.prevDetail) qc.setQueryData(gameKey(groupId, gameId), ctx.prevDetail)
}

// replace o game com o retorno do server (viability recalculada correta)
function syncGameFromServer(
  qc: ReturnType<typeof useQueryClient>,
  groupId: string,
  fresh: Game,
) {
  const listKey = gamesKey(groupId)
  const list = qc.getQueryData<Game[]>(listKey)
  if (list) {
    qc.setQueryData<Game[]>(
      listKey,
      list.map((g) => (g.id === fresh.id ? fresh : g)),
    )
  }
  qc.setQueryData<Game>(gameKey(groupId, fresh.id), fresh)
}

// NAO recomputamos viability_score otimista: a formula do server mistura
// price/hardware/interest com pesos e normalizacoes que nao temos aqui, entao
// qualquer aproximacao da um flash ate o server responder. deixamos o numero
// grande parado ate o retorno (~50ms) e so mexemos nos counts crus.

export function useSetInterest(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string; signal: InterestSignal }) =>
      setInterest(vars.gameId, vars.signal),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: gamesKey(groupId) })
      await qc.cancelQueries({ queryKey: gameKey(groupId, vars.gameId) })
      return patchGame(qc, groupId, vars.gameId, (g) => {
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
      })
    },
    onError: (_e, vars, ctx) => restoreGame(qc, groupId, vars.gameId, ctx),
    onSuccess: (fresh) => syncGameFromServer(qc, groupId, fresh),
  })
}

export function useToggleRoster(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string; join: boolean }) =>
      vars.join ? joinRoster(vars.gameId) : leaveRoster(vars.gameId),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: gamesKey(groupId) })
      await qc.cancelQueries({ queryKey: gameKey(groupId, vars.gameId) })
      return patchGame(qc, groupId, vars.gameId, (g) => ({
        ...g,
        user_in_roster: vars.join,
      }))
    },
    onError: (_e, vars, ctx) => restoreGame(qc, groupId, vars.gameId, ctx),
    onSuccess: (fresh) => syncGameFromServer(qc, groupId, fresh),
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
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: gameKey(groupId, gameId) })
      return patchGame(qc, groupId, gameId, (g) => ({ ...g, ...input }))
    },
    onError: (_e, _v, ctx) => restoreGame(qc, groupId, gameId, ctx),
    onSuccess: (fresh) => syncGameFromServer(qc, groupId, fresh),
  })
}

export function useToggleOwnership(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string; owns: boolean }) =>
      setOwnership(vars.gameId, vars.owns),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: gamesKey(groupId) })
      await qc.cancelQueries({ queryKey: gameKey(groupId, vars.gameId) })
      return patchGame(qc, groupId, vars.gameId, (g) => {
        const delta = vars.owns === g.user_owns_game ? 0 : vars.owns ? 1 : -1
        return {
          ...g,
          user_owns_game: vars.owns,
          viability: {
            ...g.viability,
            ownership_count: Math.max(0, g.viability.ownership_count + delta),
          },
        }
      })
    },
    onError: (_e, vars, ctx) => restoreGame(qc, groupId, vars.gameId, ctx),
    onSuccess: (fresh) => syncGameFromServer(qc, groupId, fresh),
  })
}
