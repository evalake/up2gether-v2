import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { POLL } from '@/lib/constants'
import {
  clearNotifications,
  deleteNotification,
  listNotifications,
  markRead,
  type Notification,
} from './api'

export const notificationsKey = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: listNotifications,
    refetchInterval: POLL.LAZY,
    staleTime: 5_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) => markRead(ids),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: notificationsKey })
      const prev = qc.getQueryData<Notification[]>(notificationsKey)
      if (prev) {
        const now = new Date().toISOString()
        const target = ids && ids.length > 0 ? new Set(ids) : null
        qc.setQueryData<Notification[]>(
          notificationsKey,
          prev.map((n) =>
            (target === null || target.has(n.id)) && !n.read_at
              ? { ...n, read_at: now }
              : n,
          ),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationsKey, ctx.prev)
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: notificationsKey })
      const prev = qc.getQueryData<Notification[]>(notificationsKey)
      if (prev) {
        qc.setQueryData<Notification[]>(
          notificationsKey,
          prev.filter((n) => n.id !== id),
        )
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationsKey, ctx.prev)
    },
  })
}

export function useClearNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearNotifications(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: notificationsKey })
      const prev = qc.getQueryData<Notification[]>(notificationsKey)
      qc.setQueryData<Notification[]>(notificationsKey, [])
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(notificationsKey, ctx.prev)
    },
  })
}
