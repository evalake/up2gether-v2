import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSession,
  deleteSession,
  getSessionAudit,
  listSessions,
  setRsvp,
  type PlaySession,
  type SessionCreateInput,
  type SessionRsvp,
} from './api'

export function useSessionAudit(groupId: string, sessionId: string | null) {
  return useQuery({
    queryKey: ['groups', groupId, 'sessions', sessionId, 'audit'] as const,
    queryFn: () => getSessionAudit(groupId, sessionId!),
    enabled: !!groupId && !!sessionId,
    staleTime: 5_000,
  })
}

export const sessionsKey = (groupId: string) => ['groups', groupId, 'sessions'] as const

export function useSessions(groupId: string) {
  return useQuery({
    queryKey: sessionsKey(groupId),
    queryFn: () => listSessions(groupId),
    enabled: !!groupId,
    refetchInterval: 15_000,
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
  const key = sessionsKey(groupId)
  return useMutation({
    mutationFn: (vars: { sessionId: string; status: SessionRsvp }) =>
      setRsvp(groupId, vars.sessionId, vars.status),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<PlaySession[]>(key)
      if (prev) {
        qc.setQueryData<PlaySession[]>(
          key,
          prev.map((s) => {
            if (s.id !== vars.sessionId) return s
            const old = s.user_rsvp
            const counts = {
              rsvp_yes: s.rsvp_yes,
              rsvp_no: s.rsvp_no,
              rsvp_maybe: s.rsvp_maybe,
            }
            if (old === 'yes') counts.rsvp_yes = Math.max(0, counts.rsvp_yes - 1)
            if (old === 'no') counts.rsvp_no = Math.max(0, counts.rsvp_no - 1)
            if (old === 'maybe') counts.rsvp_maybe = Math.max(0, counts.rsvp_maybe - 1)
            if (vars.status === 'yes') counts.rsvp_yes += 1
            if (vars.status === 'no') counts.rsvp_no += 1
            if (vars.status === 'maybe') counts.rsvp_maybe += 1
            return { ...s, user_rsvp: vars.status, ...counts }
          }),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSuccess: (fresh) => {
      const cur = qc.getQueryData<PlaySession[]>(key)
      if (cur) {
        qc.setQueryData<PlaySession[]>(
          key,
          cur.map((s) => (s.id === fresh.id ? fresh : s)),
        )
      }
    },
  })
}
