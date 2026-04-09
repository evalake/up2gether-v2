import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { closeVote, createVote, listVotes, submitBallot, type VoteCreateInput } from './api'

export const votesKey = (groupId: string) => ['groups', groupId, 'votes'] as const

export function useVotes(groupId: string) {
  return useQuery({
    queryKey: votesKey(groupId),
    queryFn: () => listVotes(groupId),
    enabled: !!groupId,
    refetchInterval: 10_000,
  })
}

export function useCreateVote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: VoteCreateInput) => createVote(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: votesKey(groupId) }),
  })
}

function invalidateVotesAndGroup(qc: ReturnType<typeof useQueryClient>, groupId: string) {
  qc.invalidateQueries({ queryKey: votesKey(groupId) })
  // ballot/close podem ter trocado o current_game (early consensus ou fim de fase)
  qc.invalidateQueries({ queryKey: ['groups', groupId] })
  qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
}

export function useSubmitBallot(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { voteId: string; approvals: string[] }) =>
      submitBallot(vars.voteId, vars.approvals),
    onSuccess: () => invalidateVotesAndGroup(qc, groupId),
  })
}

export function useCloseVote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (voteId: string) => closeVote(groupId, voteId),
    onSuccess: () => invalidateVotesAndGroup(qc, groupId),
  })
}
