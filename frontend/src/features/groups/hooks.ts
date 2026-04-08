import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createGroup,
  deleteGroup,
  demoteMember,
  kickMember,
  getGroup,
  leaveGroup,
  listGroups,
  listMembers,
  promoteMember,
  purgeGroup,
  syncDiscord,
  getCurrentGameAudit,
  setCurrentGame,
  type GroupCreateInput,
  type GroupRole,
} from './api'

export const groupsKey = ['groups'] as const
export const groupKey = (id: string) => ['groups', id] as const
export const membersKey = (id: string) => ['groups', id, 'members'] as const

export function useGroups() {
  return useQuery({ queryKey: groupsKey, queryFn: listGroups })
}

export function useGroup(id: string) {
  return useQuery({ queryKey: groupKey(id), queryFn: () => getGroup(id), enabled: !!id })
}

export function useMembers(id: string) {
  return useQuery({ queryKey: membersKey(id), queryFn: () => listMembers(id), enabled: !!id })
}

export function useCreateGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GroupCreateInput) => createGroup(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  })
}

export function useLeaveGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => leaveGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  })
}

export function useDeleteGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGroup(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupsKey }),
  })
}

export function usePurgeGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => purgeGroup(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: groupKey(id) })
      qc.invalidateQueries({ queryKey: ['games', id] })
      qc.invalidateQueries({ queryKey: ['votes', id] })
      qc.invalidateQueries({ queryKey: ['themes', id] })
      qc.invalidateQueries({ queryKey: ['sessions', id] })
    },
  })
}

export function useCurrentGameAudit(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'current-game', 'audit'],
    queryFn: () => getCurrentGameAudit(groupId),
    enabled: !!groupId,
  })
}

export function useSetCurrentGame(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { gameId: string | null; lockManual?: boolean }) =>
      setCurrentGame(groupId, vars.gameId, vars.lockManual ?? true),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKey(groupId) })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
    },
  })
}

export function useSyncDiscord() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => syncDiscord(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: groupKey(id) })
      qc.invalidateQueries({ queryKey: groupsKey })
    },
  })
}

export function usePromote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { userId: string; role: GroupRole }) =>
      promoteMember(groupId, vars.userId, vars.role),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(groupId) }),
  })
}

export function useDemote(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => demoteMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(groupId) }),
  })
}

export function useKick(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => kickMember(groupId, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey(groupId) }),
  })
}
