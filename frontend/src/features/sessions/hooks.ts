import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSession,
  deleteSession,
  listSessions,
  setRsvp,
  type SessionCreateInput,
  type SessionRsvp,
} from './api'

export const sessionsKey = (groupId: string) => ['groups', groupId, 'sessions'] as const

export function useSessions(groupId: string) {
  return useQuery({
    queryKey: sessionsKey(groupId),
    queryFn: () => listSessions(groupId),
    enabled: !!groupId,
    refetchInterval: 30_000,
  })
}

export function useCreateSession(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SessionCreateInput) => createSession(groupId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(groupId) }),
  })
}

export function useDeleteSession(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(groupId, sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(groupId) }),
  })
}

export function useSetRsvp(groupId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { sessionId: string; status: SessionRsvp }) =>
      setRsvp(groupId, vars.sessionId, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: sessionsKey(groupId) }),
  })
}
