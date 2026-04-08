import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { discordCallback } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

export function DiscordCallbackPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [error, setError] = useState<string | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const code = params.get('code')
    if (!code) {
      setError('codigo ausente na URL')
      return
    }
    discordCallback(code)
      .then((res) => {
        setToken(res.access_token)
        let next = '/'
        try {
          const stored = sessionStorage.getItem('u2g-auth-next')
          if (stored && stored.startsWith('/')) next = stored
          sessionStorage.removeItem('u2g-auth-next')
        } catch { /* ignore */ }
        navigate(next, { replace: true })
      })
      .catch((e: Error) => setError(e.message))
  }, [params, navigate, setToken])

  if (error) {
    return (
      <div className="p-8">
        <ErrorBox error={new Error(`erro no login: ${error}`)} />
      </div>
    )
  }
  return (
    <div className="p-8">
      <Loading label="autenticando..." />
    </div>
  )
}
