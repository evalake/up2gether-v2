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
  groups_created_total: number
  groups_with_session: number
  activation_rate: number
  sessions_created_28d: number
  sessions_completed_28d: number
  session_completion_rate_28d: number
}

export const fetchEventMetrics = () => api<EventMetrics>('/admin/metrics/events')
