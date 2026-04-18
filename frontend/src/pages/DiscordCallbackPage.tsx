import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { discordCallback, fetchDiscordLoginUrl } from '@/features/auth/api'
import { useAuthStore } from '@/features/auth/store'
import { Loading } from '@/components/ui/Loading'
import { useT } from '@/i18n'

type ErrKind = 'stateExpired' | 'stateInvalid' | 'codeMissing' | 'generic'

// se state/code chegam errados ou callback explode, mostra fallback central bonito
// com countdown e auto-redirect pro novo login. se o user preferir, tambem tem
// botao manual. nunca deixa o user travado numa tela de erro.
const AUTO_REDIRECT_SECONDS = 4

export function DiscordCallbackPage() {
  const t = useT()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const setToken = useAuthStore((s) => s.setToken)
  const [errKind, setErrKind] = useState<ErrKind | null>(null)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    const code = params.get('code')
    const state = params.get('state')
    if (!code) {
      setErrKind('codeMissing')
      return
    }
    if (!state) {
      // state ausente = link truncado ou adulterado. backend tb rejeitaria.
      setErrKind('stateInvalid')
      return
    }
    discordCallback(code, state)
      .then((res) => {
        setToken(res.access_token)
        if (!res.user.onboarding_completed) {
          navigate('/onboarding', { replace: true })
          return
        }
        // next veio assinado dentro do state JWT (backend decodifica e devolve).
        // failsafe em sessionStorage so pra casos estranhos de older frontend.
        let next = res.next ?? '/'
        if (!next.startsWith('/')) next = '/'
        if (next === '/') {
          try {
            const stored = sessionStorage.getItem('u2g-auth-next')
            if (stored && stored.startsWith('/')) next = stored
          } catch { /* ignore */ }
        }
        try { sessionStorage.removeItem('u2g-auth-next') } catch { /* ignore */ }
        navigate(next, { replace: true })
      })
      .catch((e: Error) => {
        // backend erro conhecido: "invalid or expired state" (400). resto e generico.
        const msg = (e?.message ?? '').toLowerCase()
        if (msg.includes('expired state') || msg.includes('invalid or expired state')) {
          setErrKind('stateExpired')
        } else if (msg.includes('state')) {
          setErrKind('stateInvalid')
        } else {
          setErrKind('generic')
        }
      })
  }, [params, navigate, setToken])

  if (errKind) return <CallbackError kind={errKind} />
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Loading label={t.auth.authenticating} />
    </div>
  )
}

function CallbackError({ kind }: { kind: ErrKind }) {
  const t = useT()
  const [secondsLeft, setSecondsLeft] = useState(AUTO_REDIRECT_SECONDS)
  const [retrying, setRetrying] = useState(false)

  const message =
    kind === 'stateExpired' ? t.auth.errStateExpired
    : kind === 'stateInvalid' ? t.auth.errStateInvalid
    : kind === 'codeMissing' ? t.auth.errCodeMissing
    : t.auth.errGeneric

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id)
          void redirectToLogin(setRetrying)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-up-grid px-4">
      <div className="absolute inset-0 up-scan pointer-events-none opacity-60" />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="relative w-full max-w-md rounded-md border border-up-orange/30 bg-black/60 backdrop-blur-md px-8 py-10 text-center shadow-[0_0_40px_rgba(255,102,0,0.12)]"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-up-orange/40 bg-up-orange/10 text-up-orange"
          aria-hidden
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
        </motion.div>

        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.3em] text-up-amber">
          {t.auth.errTitle}
        </div>
        <p className="mb-6 text-sm leading-relaxed text-up-text">{message}</p>

        <button
          type="button"
          disabled={retrying}
          onClick={() => redirectToLogin(setRetrying)}
          className="inline-flex w-full items-center justify-center rounded-sm bg-up-orange px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-up-bg transition-colors hover:bg-up-amber disabled:opacity-60"
        >
          {retrying ? t.auth.authenticating : t.auth.errRetry}
        </button>

        <div className="mt-4 text-[11px] text-up-dim">
          {secondsLeft > 0 ? t.auth.errAutoRetry(secondsLeft) : t.auth.authenticating}
        </div>
      </motion.div>
    </div>
  )
}

async function redirectToLogin(setRetrying: (v: boolean) => void) {
  setRetrying(true)
  try {
    const { url } = await fetchDiscordLoginUrl()
    window.location.href = url
  } catch {
    // se a rota tb explodiu, manda pro /login estatico (tem botao que refaz)
    window.location.href = '/login'
  }
}
