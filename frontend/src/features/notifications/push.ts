import { getVapidKey, subscribePush, unsubscribePush } from './api'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushState(): Promise<'unsupported' | 'denied' | 'granted' | 'default'> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  if (Notification.permission === 'granted') return 'granted'
  return 'default'
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} demorou demais (${ms / 1000}s) — provavel bloqueio do navegador`)), ms)
    p.then((v) => { clearTimeout(t); resolve(v) }, (e) => { clearTimeout(t); reject(e) })
  })
}

// detecta navegadores que costumam bloquear push por padrao
function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return 'opera'
  if (/Brave/i.test(ua) || (navigator as unknown as { brave?: object }).brave) return 'brave'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Chrome/i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua)) return 'safari'
  return 'unknown'
}

export async function enablePush(): Promise<void> {
  if (!pushSupported()) throw new Error('Push não suportado nesse navegador')
  const browser = detectBrowser()
  // Opera/Brave: aviso antecipado que push pode nao funcionar sem config extra
  // mas segue tentando (nao bloqueia).
  // Permissao ANTES de registrar SW — alguns browsers bloqueiam silenciosamente.
  const perm = await withTimeout(Notification.requestPermission(), 15_000, 'Pedido de permissão')
  if (perm !== 'granted') throw new Error('Permissão negada ou bloqueada no navegador')

  let reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
  await withTimeout(navigator.serviceWorker.ready, 8_000, 'Service worker')

  const { key } = await getVapidKey()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    try {
      // timeout curto: se nao voltar em 10s, e bloqueio silencioso
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(key) as BufferSource,
        }),
        10_000,
        'Registro do push',
      )
    } catch (e) {
      const msg = (e as Error)?.message || String(e)
      // mensagens especificas pros browsers problematicos
      if (browser === 'opera') {
        throw new Error(
          'Opera bloqueia push por padrão. Vai em Settings > Privacy & Security > Site Settings > Notifications e habilite esse site. Se não funcionar, Opera às vezes exige ativar "Use Google services for push messaging" em opera://settings/.',
        )
      }
      if (browser === 'brave') {
        throw new Error(
          'Brave desliga push por padrão. Ative em brave://settings/privacy > "Use Google services for push messaging" e reinicie o browser.',
        )
      }
      if (/timeout|demorou/i.test(msg)) {
        throw new Error('Push bloqueado pelo navegador (sem resposta). Libere notificações pra esse site nas configs.')
      }
      if (/google|gcm|push service|unsupported/i.test(msg)) {
        throw new Error('Navegador sem serviço de push ativo. Habilite notificações nas configs do browser.')
      }
      throw new Error('Falha ao registrar push: ' + msg)
    }
  }
  await subscribePush(sub.toJSON() as PushSubscriptionJSON)
}

export async function disablePush(): Promise<void> {
  if (!pushSupported()) return
  const reg = await navigator.serviceWorker.getRegistration('/sw.js')
  if (!reg) return
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    await unsubscribePush(sub.endpoint)
    await sub.unsubscribe()
  }
}
