// SSE realtime: conecta no /api/events/stream e invalida queries por evento.
// Reconecta automatico em erro. EventSource nativa cuida de reconexao,
// mas em alguns casos morre permanente — fallback manual via timer.

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

type Msg = { kind: string; group_id: string }

function invalidateForKind(qc: ReturnType<typeof useQueryClient>, msg: Msg) {
  const gid = msg.group_id
  const k = msg.kind
  // mapping kind -> chaves a invalidar. mantem largo, custa pouco.
  if (k.startsWith('game_vote.') || k === 'current_game.changed') {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'votes'] })
    qc.invalidateQueries({ queryKey: ['groups', gid] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'current-game', 'audit'] })
  }
  if (k.startsWith('theme.')) {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'theme', 'cycle'] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'theme', 'current'] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'themes'] })
  }
  if (k.startsWith('session.')) {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'sessions'] })
  }
  if (k.startsWith('game.')) {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'games'] })
  }
  // notificacoes so em eventos que viram Notification row (notify_group fez)
  // events granulares (ballot_cast, vote_cast) nao criam in-app row
  if (
    !k.endsWith('.ballot_cast') &&
    !k.endsWith('.vote_cast') &&
    !k.endsWith('.suggestion_updated') &&
    !k.endsWith('.suggestion_deleted')
  ) {
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
}

export function useRealtime() {
  const qc = useQueryClient()
  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    if (!token) return
    let es: EventSource | null = null
    let stopped = false
    let retryTimer: number | null = null

    const connect = () => {
      if (stopped) return
      const url = `${BASE}/events/stream?token=${encodeURIComponent(token)}`
      es = new EventSource(url)
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as Msg
          if (msg && msg.kind) invalidateForKind(qc, msg)
        } catch {
          // ignora ping/keepalive
        }
      }
      es.onerror = () => {
        es?.close()
        es = null
        if (stopped) return
        retryTimer = window.setTimeout(connect, 3000)
      }
    }

    connect()
    return () => {
      stopped = true
      if (retryTimer) window.clearTimeout(retryTimer)
      es?.close()
    }
  }, [token, qc])
}
