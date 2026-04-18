import { api } from '@/lib/api'

export type NotificationKind =
  | 'vote_opened'
  | 'vote_closed'
  | 'session_created'
  | 'test'
  | string

export type Notification = {
  id: string
  kind: NotificationKind
  title: string
  body: string | null
  link: string | null
  data: Record<string, unknown>
  read_at: string | null
  created_at: string
}

export const listNotifications = () =>
  api<Notification[]>('/notifications')

export const markRead = (ids?: string[]) =>
  api<{ marked: number }>('/notifications/mark-read', {
    method: 'POST',
    body: { ids: ids ?? null },
  })

export const deleteNotification = (id: string) =>
  api<{ ok: boolean }>(`/notifications/${id}`, { method: 'DELETE' })

export const clearNotifications = () =>
  api<{ ok: boolean }>('/notifications', { method: 'DELETE' })
