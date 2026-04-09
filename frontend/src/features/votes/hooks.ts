import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  closeVote,
  createVote,
  listVotes,
  submitBallot,
  type VoteCreateInput,
  type VoteSession,
} from './api'

export const votesKey = (groupId: string) => ['groups', groupId, 'votes'] as const

export function useVotes(groupId: string) {
  return useQuery({
    queryKey: votesKey(groupId),
    queryFn: () => listVotes(groupId),
    enabled: !!groupId,
    refetchInterval: 30_000,
  })
}

export function useCreateVote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VoteCreateInput) => createVote(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: votesKey(groupId) }),
  })
}

// atualiza cache com o VoteSession fresco que o server devolveu,
// evitando refetch extra da lista. tambem toca current-game audit
// caso a ballot tenha fechado a fase e trocado o jogo.
function applyVoteResponse(
  qc: ReturnType<typeof useQueryClient>,
  groupId: string,
  updated: VoteSession,
) {
  const key = votesKey(groupId)
  const prev = qc.getQueryData<VoteSession[]>(key)
  if (prev) {
    qc.setQueryData<VoteSession[]>(
      key,
      prev.map((v) => (v.id === updated.id ? updated : v)),
    )
  }
  qc.invalidateQueries({ queryKey: ['groups', groupId], refetchType: 'none' })
  qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
}

export function useSubmitBallot(groupId: string) {
  const qc = useQueryClient()
  const key = votesKey(groupId)
  return useMutation({
    mutationFn: (vars: { voteId: string; approvals: string[] }) =>
      submitBallot(vars.voteId, vars.approvals),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<VoteSession[]>(key)
      if (prev) {
        qc.setQueryData<VoteSession[]>(
          key,
          prev.map((v) => {
            if (v.id !== vars.voteId) return v
            // reajusta tallies: remove os antigos do usuario, soma os novos
            const tallies = { ...v.tallies }
            for (const gid of v.your_approvals) {
              tallies[gid] = Math.max(0, (tallies[gid] ?? 0) - 1)
            }
            for (const gid of vars.approvals) {
              tallies[gid] = (tallies[gid] ?? 0) + 1
            }
            return { ...v, your_approvals: vars.approvals, tallies }
          }),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSuccess: (updated) => applyVoteResponse(qc, groupId, updated),
  })
}

export function useCloseVote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (voteId: string) => closeVote(groupId, voteId),
    onSuccess: (updated) => applyVoteResponse(qc, groupId, updated),
  })
}
