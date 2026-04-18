// cliente HTTP fino. fetch wrapper que injeta token e parseia json.
// nada de axios — fetch nativo basta e sai 1 dep.

import { useAuthStore } from '@/features/auth/store'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export class ApiError extends Error {
  status: number
  body?: unknown
  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

type Opts = {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export async function api<T>(path: string, opts: Opts = {}): Promise<T> {
  const token = useAuthStore.getState().token
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers ?? {}),
  }
  if (token) headers.Authorization = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  // 401 so derruba sessao se for no /auth/me. outros endpoints podem 401
  // por motivos transitorios e nao devem nukar o token do usuario.
  // usa clearLocal pra nao tentar revogar de novo (loop) -- token ja morreu.
  if (res.status === 401 && path === '/auth/me') {
    useAuthStore.getState().clearLocal()
  }

  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // nao e json (provavel 500 com HTML). mostra msg generica.
      if (!res.ok) {
        throw new ApiError(res.status, `erro ${res.status}: falha no servidor`, text)
      }
    }
  }

  if (!res.ok) {
    throw new ApiError(res.status, (data as { detail?: string })?.detail ?? res.statusText, data)
  }
  return data as T
}
