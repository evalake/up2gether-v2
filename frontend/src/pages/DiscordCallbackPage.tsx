import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { discordCallback } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useT } from '@/i18n'

export function DiscordCallbackPage() {
  const t = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const code = params.get('code')
    const state = params.get('state')
    if (!code) {
      setError(t.auth.codeMissing)
      return
    }
    if (!state) {
      setError(t.auth.stateMissing)
      return
    }
    let stashed: string | null = null
    try {
      stashed = sessionStorage.getItem('u2g-oauth-state')
    } catch { /* ignore */ }
    if (!stashed || stashed !== state) {
      setError(t.auth.stateInvalid)
      return
    }
    discordCallback(code, state)
      .then((res) => {
        setToken(res.access_token)
        // user novo ou sem onboarding completo -> wizard
        if (!res.user.onboarding_completed) {
          navigate('/onboarding', { replace: true })
          return
        }
        let next = '/'
        try {
          const stored = sessionStorage.getItem('u2g-auth-next')
          if (stored && stored.startsWith('/')) next = stored
          sessionStorage.removeItem('u2g-auth-next')
        } catch { /* ignore */ }
        navigate(next, { replace: true })
      })
      .catch((e: Error) => setError(e.message))
  }, [params, navigate, setToken, t.auth.codeMissing, t.auth.stateMissing, t.auth.stateInvalid])

  if (error) {
    return (
      <div className="p-8">
        <ErrorBox error={new Error(`${t.auth.loginError}: ${error}`)} />
      </div>
    )
  }
  return (
    <div className="p-8">
      <Loading label={t.auth.authenticating} />
    </div>
  )
}
