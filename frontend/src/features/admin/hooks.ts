import { useQuery } from '@tanstack/react-query'
import { fetchEventMetrics } from './api'

export const adminMetricsKey = ['admin-metrics-events'] as const

export function useEventMetrics(enabled: boolean = true) {
  return useQuery({
    queryKey: adminMetricsKey,
    queryFn: fetchEventMetrics,
    enabled,
    staleTime: 30_000,
  })
}
