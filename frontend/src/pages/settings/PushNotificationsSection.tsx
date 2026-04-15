import { useEffect, useState } from 'react'
import { Button } from '@/components/nerv/Button'
import { Loading } from '@/components/ui/Loading'
import { useToast } from '@/components/ui/toast'

type PushState = 'loading' | 'unsupported' | 'denied' | 'off' | 'on'

export function PushNotificationsSection() {
  const toast = useToast()
  const [state, setState] = useState<PushState>('loading')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancel = false
    ;(async () => {
      const { pushSupported, getPushState } = await import('@/features/notifications/push')
      if (!pushSupported()) {
        if (!cancel) setState('unsupported')
        return
      }
      const ps = await getPushState()
      if (cancel) return
      if (ps === 'denied') return setState('denied')
      const reg = await navigator.serviceWorker.getRegistration('/sw.js')
      const sub = reg ? await reg.pushManager.getSubscription() : null
      setState(sub && ps === 'granted' ? 'on' : 'off')
    })()
    return () => { cancel = true }
  }, [])

  const toggle = async () => {
    setBusy(true)
    try {
      const { enablePush, disablePush } = await import('@/features/notifications/push')
      if (state === 'on') {
        await disablePush()
        setState('off')
        toast.success('push desligado')
      } else {
        await enablePush()
        setState('on')
        toast.success('push ativado')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">push notifications</div>
      <p className="mb-3 text-xs text-nerv-text/70">
        receba notificações do navegador quando tiver votação nova, sessão agendada ou ciclo de tema aberto.
      </p>
      {state === 'loading' && <Loading />}
      {state === 'unsupported' && <div className="text-[11px] text-nerv-dim">navegador não suporta push</div>}
      {state === 'denied' && <div className="text-[11px] text-nerv-red/80">permissão bloqueada. libere nas configs do navegador.</div>}
      {(state === 'on' || state === 'off') && (
        <Button onClick={toggle} disabled={busy}>
          {busy ? '...' : state === 'on' ? 'desligar push' : 'ativar push'}
        </Button>
      )}
    </section>
  )
}
