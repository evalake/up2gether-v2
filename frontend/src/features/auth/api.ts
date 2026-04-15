import { api } from '@/lib/api'

export type DiscordUser = {
  id: string
  discord_id: string
  discord_username: string
  discord_display_name: string | null
  discord_avatar: string | null
  onboarding_completed: boolean
  is_new_user: boolean
  is_sys_admin?: boolean
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: DiscordUser
}

export function discordCallback(code: string) {
  // pega ref capturado em qualquer pagina (stashado pelo captureRef). so e usado
  // na primeira vez que o user loga (signup). o backend grava no payload do event.
  let ref: string | null = null
  try {
    ref = sessionStorage.getItem('u2g-ref')
  } catch {
    /* ignore */
  }
  const body: { code: string; ref?: string } = { code }
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

export function discordLoginUrl(next?: string): string {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID
  const redirect = encodeURIComponent(
    import.meta.env.VITE_DISCORD_REDIRECT_URI ??
      `${window.location.origin}/auth/discord/callback`,
  )
  const scope = encodeURIComponent('identify email guilds')
  // guarda next em sessionStorage pra recuperar no callback (state do oauth
  // tem caracteres restritos e seria mais frageis carregar URL inteira la)
  if (next) {
    try { sessionStorage.setItem('u2g-auth-next', next) } catch { /* ignore */ }
  }
  return `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirect}&response_type=code&scope=${scope}`
}
