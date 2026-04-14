import { api } from '@/lib/api'

export type EventMetrics = {
  totals: Record<string, number>
  last_7d: Record<string, number>
  last_28d: Record<string, number>
  seats_activated: number
}

export const fetchEventMetrics = () => api<EventMetrics>('/admin/metrics/events')
