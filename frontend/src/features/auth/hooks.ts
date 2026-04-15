import { useQuery } from '@tanstack/react-query'
import { fetchMe, fetchOnboarding, type DiscordUser, type OnboardingState } from './api'
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

export function useOnboarding() {
  const token = useAuthStore((s) => s.token)
  return useQuery<OnboardingState>({
    queryKey: ['onboarding'],
    queryFn: fetchOnboarding,
    enabled: !!token,
    staleTime: 30_000,
  })
}
