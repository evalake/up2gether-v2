// SSE realtime em modo seletivo: so reage a "momentos grandes" que valem
// animacao sincronizada entre usuarios. eventos granulares (ballot_cast,
// vote_cast, suggestion_updated/deleted) sao ignorados aqui -- o poll ja
// cobre esses sem causar refetch storm.
//
// momentos grandes hoje:
//  - game_vote.opened        votacao abriu, quero ver na hora
//  - game_vote.stage_advanced fase avancou
//  - game_vote.closed        votacao fechou (reveal)
//  - theme.cycle_opened      ciclo de tema abriu
//  - theme.suggestion_created nova sugestao de tema aparece
//  - theme.decided           tema decidido (reveal)
//  - session.created         sessao criada
//  - current_game.changed    jogo da vez trocou
//
// EventSource reconecta sozinha em erro; mantenho retry manual caso ela
// morra em definitivo.

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/features/auth/store'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

type Msg = { kind: string; group_id: string }

const BIG_KINDS = new Set([
  'game_vote.opened',
  'game_vote.stage_advanced',
  'game_vote.closed',
  'theme.cycle_opened',
  'theme.suggestion_created',
  'theme.decided',
  'session.created',
  'current_game.changed',
])

function invalidateForKind(qc: ReturnType<typeof useQueryClient>, msg: Msg) {
  const gid = msg.group_id
  const k = msg.kind

  if (
    k === 'game_vote.opened' ||
    k === 'game_vote.stage_advanced' ||
    k === 'game_vote.closed' ||
    k === 'current_game.changed'
  ) {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'votes'] })
    qc.invalidateQueries({ queryKey: ['groups', gid] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'current-game', 'audit'] })
  }

  if (
    k === 'theme.cycle_opened' ||
    k === 'theme.suggestion_created' ||
    k === 'theme.decided'
  ) {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'themes', 'cycle'] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'themes', 'current'] })
    qc.invalidateQueries({ queryKey: ['groups', gid, 'themes'] })
  }

  if (k === 'session.created') {
    qc.invalidateQueries({ queryKey: ['groups', gid, 'sessions'] })
  }

  // todos os momentos grandes viram notificacao in-app, entao refresca o sino
  qc.invalidateQueries({ queryKey: ['notifications'] })
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
      es.onopen = () => {
        console.info('[realtime] SSE connected')
      }
      es.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as Msg
          if (!msg || !msg.kind) return
          if (msg.kind === 'connected') return
          if (!BIG_KINDS.has(msg.kind)) return
          invalidateForKind(qc, msg)
        } catch {
          // ignora ping/keepalive
        }
      }
      es.onerror = () => {
        console.warn('[realtime] SSE error, reconnecting in 3s')
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
