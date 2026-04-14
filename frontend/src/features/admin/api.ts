import { api } from '@/lib/api'

export type TopGroup = {
  group_id: string
  name: string
  events_28d: number
}

export type DailyPoint = {
  date: string
  count: number
}

export type EventMetrics = {
  totals: Record<string, number>
  last_7d: Record<string, number>
  last_28d: Record<string, number>
  seats_activated: number
  top_groups: TopGroup[]
  daily_28d: DailyPoint[]
}

export const fetchEventMetrics = () => api<EventMetrics>('/admin/metrics/events')
