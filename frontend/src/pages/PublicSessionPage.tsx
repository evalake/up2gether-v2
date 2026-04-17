import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '@/lib/api'
import { useMe } from '@/features/auth/hooks'
import { rsvpSession } from '@/features/sessions/api'
import { discordLoginUrl } from '@/features/auth/api'
import { useToast } from '@/components/ui/toast'
import { Loading } from '@/components/ui/Loading'

type PublicCard = {
  id: string
  group_id: string
  title: string
  start_at: string
  duration_minutes: number
  game_name: string | null
  group_name: string
  rsvp_yes: number
  rsvp_maybe: number
}

export function PublicSessionPage() {
  const { id = '' } = useParams()
  const [data, setData] = useState<PublicCard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const me = useMe()
  const toast = useToast()
  const [rsvping, setRsvping] = useState<string | null>(null)
  const [doneRsvp, setDoneRsvp] = useState<string | null>(null)

  useEffect(() => {
    api<PublicCard>(`/public/sessions/${id}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'falha'))
  }, [id])

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-up-bg p-6 text-center">
        <div>
          <div className="font-display text-3xl text-up-red">404</div>
          <p className="mt-2 text-sm text-up-dim">sessão não encontrada ou foi removida</p>
          <Link to="/" className="mt-4 inline-block text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange">
            ← voltar
          </Link>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="grid min-h-screen place-items-center bg-up-bg">
        <Loading />
      </div>
    )
  }

  const start = new Date(data.start_at)
  const end = new Date(start.getTime() + data.duration_minutes * 60_000)
  const isPast = end < new Date()
  const isLoggedIn = !!me.data

  const onRsvp = async (status: 'yes' | 'no' | 'maybe') => {
    setRsvping(status)
    try {
      await rsvpSession(data.group_id, data.id, status)
      setDoneRsvp(status)
      toast.success(status === 'yes' ? 'presença confirmada' : status === 'maybe' ? 'marcado como talvez' : 'marcado que não vai')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao confirmar')
    } finally {
      setRsvping(null)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-up-bg p-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md overflow-hidden rounded-lg border border-up-orange/25 bg-up-panel/60 shadow-2xl backdrop-blur-sm"
      >
        <div className="border-b border-up-orange/15 px-5 py-3">
          <div className="text-[10px] uppercase tracking-wider text-up-dim">{data.group_name}</div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider text-up-orange">convite de sessão</div>
        </div>
        <div className="space-y-4 px-5 py-6">
          <div>
            <h1 className="font-display text-2xl text-up-text">{data.title}</h1>
            {data.game_name && data.game_name !== data.title && (
              <p className="mt-1 text-xs text-up-dim">{data.game_name}</p>
            )}
          </div>
          <div className="rounded-sm border border-up-orange/15 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-up-dim">quando</div>
            <div className="mt-1 text-sm text-up-text">
              {start.toLocaleString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className="mt-0.5 text-[11px] text-up-dim">{data.duration_minutes / 60}h de duração</div>
          </div>
          <div className="flex gap-4 text-[11px] uppercase tracking-wider text-up-dim">
            <span><span className="text-up-green tabular-nums">{data.rsvp_yes}</span> vão</span>
            <span><span className="text-up-amber tabular-nums">{data.rsvp_maybe}</span> talvez</span>
          </div>
          {isPast ? (
            <div className="rounded-sm border border-up-line bg-up-line/10 px-3 py-2 text-center text-[11px] uppercase tracking-wider text-up-dim">
              sessão já aconteceu
            </div>
          ) : isLoggedIn ? (
            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-wider text-up-dim">você já está logado · responda direto:</div>
              <div className="grid grid-cols-3 gap-2">
                {(['yes', 'maybe', 'no'] as const).map((s) => {
                  const label = s === 'yes' ? 'vou' : s === 'maybe' ? 'talvez' : 'não vou'
                  const color = s === 'yes' ? 'green' : s === 'maybe' ? 'amber' : 'red'
                  const active = doneRsvp === s
                  return (
                    <button
                      key={s}
                      disabled={rsvping !== null}
                      onClick={() => onRsvp(s)}
                      className={`rounded-sm border px-3 py-2 text-[11px] uppercase tracking-wider transition-colors ${
                        active
                          ? `border-up-${color} bg-up-${color}/20 text-up-${color}`
                          : `border-up-${color}/40 text-up-${color} transition-colors hover:bg-up-${color}/10`
                      } disabled:opacity-40`}
                    >
                      {rsvping === s ? '...' : label}
                    </button>
                  )
                })}
              </div>
              <Link
                to={`/groups/${data.group_id}/sessions`}
                className="block text-center text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
              >
                ver no app →
              </Link>
            </div>
          ) : (
            <a
              href={discordLoginUrl(`/share/sessions/${data.id}`)}
              className="block rounded-sm border border-up-orange/40 bg-up-orange/10 px-4 py-3 text-center text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/20"
            >
              entrar pra confirmar presença
            </a>
          )}
        </div>
        <div className="border-t border-up-orange/10 px-5 py-2 text-center text-[10px] uppercase tracking-[0.2em] text-up-dim">
          up2gether
        </div>
      </motion.div>
    </div>
  )
}
