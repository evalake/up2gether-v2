import { api } from '@/lib/api'

export type DiscordUser = {
  id: string
  discord_id: string
  discord_username: string
  discord_display_name: string | null
  discord_avatar: string | null
  onboarding_completed: boolean
  locale: string | null
  is_new_user: boolean
  is_sys_admin?: boolean
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: DiscordUser
  // path relativo vindo do state JWT; backend decodifica e devolve aqui
  next?: string | null
}

export function discordCallback(code: string, state: string) {
  // pega ref capturado em qualquer pagina (stashado pelo captureRef). so e usado
  // na primeira vez que o user loga (signup). o backend grava no payload do event.
  let ref: string | null = null
  try {
    ref = sessionStorage.getItem('u2g-ref')
  } catch {
    /* ignore */
  }
  const body: { code: string; state: string; ref?: string } = { code, state }
  if (ref) body.ref = ref
  return api<LoginResponse>('/auth/discord/callback', { method: 'POST', body }).then((r) => {
    try {
      sessionStorage.removeItem('u2g-ref')
    } catch {
      /* ignore */
    }
    return r
  })
}

/** Pede pro backend a URL de authorize do Discord com state ja assinado.
 *  state e JWT com TTL de 10min. sem sessionStorage = cross-browser ok. */
export function fetchDiscordLoginUrl(next?: string): Promise<{ url: string }> {
  const qs = next ? `?next=${encodeURIComponent(next)}` : ''
  return api<{ url: string }>(`/auth/discord/login-url${qs}`)
}

/** Captura ?ref=X da URL atual e stasha pra usar no proximo signup. */
export function captureRef() {
  try {
    const p = new URLSearchParams(window.location.search)
    const ref = p.get('ref')
    if (ref) sessionStorage.setItem('u2g-ref', ref.slice(0, 64))
  } catch {
    /* ignore */
  }
}

/** Registra uma visita a landing (1x por sessao). Nao bloqueia render, silencia erro.
 * Alimenta landing_conversion_rate_28d no admin dashboard. */
export function trackLandingVisit() {
  try {
    if (sessionStorage.getItem('u2g-visit-tracked') === '1') return
    sessionStorage.setItem('u2g-visit-tracked', '1')
    const ref = sessionStorage.getItem('u2g-ref')
    const body: { ref?: string } = {}
    if (ref) body.ref = ref
    void api('/telemetry/visit', { method: 'POST', body }).catch(() => {
      /* ignore (rate limit, offline, etc) */
    })
  } catch {
    /* ignore */
  }
}

export function fetchMe() {
  return api<DiscordUser>('/auth/me')
}

/** Revoga o JWT atual no backend (incrementa token_generation do user).
 *  Best-effort: se falhar (rede/401 ja expirado) ainda assim limpa local. */
export function logoutApi() {
  return api<void>('/auth/logout', { method: 'POST' })
}

export type OnboardingState = {
  has_group: boolean
  has_games: boolean
  has_session: boolean
  has_vote: boolean
  steps_done: number
  steps_total: number
  complete: boolean
}

export function fetchOnboarding() {
  return api<OnboardingState>('/users/me/onboarding')
}

export type DiscordGuild = {
  id: string
  name: string
  icon: string | null
  owner: boolean
  permissions: string | null
}

export function fetchMyGuilds() {
  return api<DiscordGuild[]>('/auth/discord/guilds')
}

/** Guarda o proximo destino pra navegar pos-login. O valor oficial e assinado dentro
 *  do state JWT (server-side); esse sessionStorage e so failsafe caso o state expire. */
export function stashAuthNext(next: string) {
  try { sessionStorage.setItem('u2g-auth-next', next) } catch { /* ignore */ }
}
