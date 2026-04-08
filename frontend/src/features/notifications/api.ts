import { api } from '@/lib/api'

export type NotificationKind =
  | 'vote_opened'
  | 'vote_closed'
  | 'session_created'
  | 'theme_cycle_opened'
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

export const getVapidKey = () =>
  api<{ key: string }>('/notifications/push/vapid-public-key')

export const subscribePush = (sub: PushSubscriptionJSON) =>
  api<{ ok: boolean }>('/notifications/push/subscribe', {
    method: 'POST',
    body: {
      endpoint: sub.endpoint,
      keys: {
        p256dh: (sub.keys as Record<string, string>).p256dh,
        auth: (sub.keys as Record<string, string>).auth,
      },
    },
  })

export const unsubscribePush = (endpoint: string) =>
  api<{ ok: boolean }>('/notifications/push/unsubscribe', {
    method: 'POST',
    body: { endpoint },
  })
