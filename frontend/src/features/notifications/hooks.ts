import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { clearNotifications, deleteNotification, listNotifications, markRead } from './api'

export const notificationsKey = ['notifications'] as const

export function useNotifications() {
  return useQuery({
    queryKey: notificationsKey,
    queryFn: listNotifications,
    refetchInterval: 60_000,
    staleTime: 10_000,
  })
}

export function useMarkRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids?: string[]) => markRead(ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}

export function useClearNotifications() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => clearNotifications(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationsKey })
    },
  })
}
