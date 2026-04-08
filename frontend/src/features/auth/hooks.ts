import { useQuery } from '@tanstack/react-query'
import { fetchMe, type DiscordUser } from './api'
import { useAuthStore } from './store'

export function useMe() {
  const token = useAuthStore((s) => s.token)
  return useQuery<DiscordUser>({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
  })
}
