import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchDiscordLoginUrl,
  fetchMe,
  fetchOnboarding,
  type DiscordUser,
  type OnboardingState,
} from './api'
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

/** URL pro authorize do Discord vem pre-assinada pelo backend.
 *  state = JWT com TTL de 10min, validado no callback. nao precisa stash cliente,
 *  funciona cross-browser. prefetch no mount faz o href ficar pronto antes do click.
 *
 *  queryKey NAO compartilha prefixo com ['me'] ou outros — convencao da regra de keys.
 */
export function useDiscordLoginUrl(next?: string) {
  return useQuery<{ url: string }>({
    queryKey: ['auth-login-url', next ?? null],
    queryFn: () => fetchDiscordLoginUrl(next),
    staleTime: 5 * 60 * 1000, // 5min, metade do TTL do state
    gcTime: 10 * 60 * 1000,
    retry: 1,
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
