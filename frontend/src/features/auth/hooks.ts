import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMe, fetchOnboarding, type DiscordUser, type OnboardingState } from './api'
import { useAuthStore } from './store'
import { useLocaleStore, type Locale } from '@/features/locale/store'

export function useMe() {
  const token = useAuthStore((s) => s.token)
  const q = useQuery<DiscordUser>({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: !!token,
    retry: false,
  })
  // server locale vence detection do browser quando existe. setLocale com
  // explicit=false pra nao bloquear atualizacao futura vinda do server.
  useEffect(() => {
    const serverLocale = q.data?.locale as Locale | null | undefined
    if (!serverLocale) return
    const store = useLocaleStore.getState()
    if (store.locale !== serverLocale) store.setLocale(serverLocale, false)
  }, [q.data?.locale])
  return q
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
