import { Link } from 'react-router-dom'
import { useMe } from '@/features/auth/hooks'
import { useEventMetrics } from '@/features/admin/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useTitle } from '@/lib/useTitle'

const EVENT_LABEL: Record<string, string> = {
  group_created: 'grupos criados',
  group_joined: 'joins em grupo',
  member_activated: 'seats ativados (1o login)',
  session_created: 'sessoes criadas',
  session_completed: 'sessoes concluidas',
  vote_created: 'votacoes abertas',
  vote_cast: 'ballots enviados',
  vote_completed: 'votacoes fechadas',
}

const ORDER = [
  'member_activated',
  'group_created',
  'group_joined',
  'session_created',
  'session_completed',
  'vote_created',
  'vote_cast',
  'vote_completed',
]

export function AdminMetricsPage() {
  useTitle('metrics')
  const me = useMe()
  const isSysAdmin = !!me.data?.is_sys_admin
  const q = useEventMetrics(isSysAdmin)

  if (me.isLoading) return <Loading />
  if (!isSysAdmin) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="text-lg font-mono text-zinc-300">sys admin only</h1>
        <Link to="/groups" className="mt-4 inline-block text-orange-400 hover:underline">
          voltar
        </Link>
      </div>
    )
  }
  if (q.isLoading) return <Loading />
  if (q.error) return <ErrorBox error={q.error} />
  if (!q.data) return null

  const m = q.data
  const allKinds = new Set<string>([
    ...Object.keys(m.totals),
    ...Object.keys(m.last_7d),
    ...Object.keys(m.last_28d),
  ])
  const ordered = [...ORDER.filter((k) => allKinds.has(k)), ...[...allKinds].filter((k) => !ORDER.includes(k))]

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="text-xl font-mono text-zinc-100">observability</h1>
        <Link to="/groups" className="text-xs text-zinc-400 hover:text-orange-400">
          voltar
        </Link>
      </header>

      <section className="mb-8 rounded-lg border border-orange-500/25 bg-zinc-900/60 p-5">
        <div className="text-xs uppercase tracking-wide text-zinc-400">seats ativados</div>
        <div className="mt-2 font-mono text-4xl text-orange-400">{m.seats_activated}</div>
        <div className="mt-1 text-[11px] text-zinc-500">
          users distintos que completaram o 1o login via discord
        </div>
      </section>

      <section className="rounded-lg border border-zinc-800 bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wide text-zinc-500">
            <tr className="border-b border-zinc-800">
              <th className="px-4 py-3 text-left">evento</th>
              <th className="px-4 py-3 text-right">7d</th>
              <th className="px-4 py-3 text-right">28d</th>
              <th className="px-4 py-3 text-right">total</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[12px]">
            {ordered.map((k) => (
              <tr key={k} className="border-b border-zinc-800/50 last:border-0">
                <td className="px-4 py-2.5 text-zinc-300">
                  <span className="text-zinc-100">{EVENT_LABEL[k] ?? k}</span>
                  <span className="ml-2 text-[10px] text-zinc-500">{k}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-zinc-200">{m.last_7d[k] ?? 0}</td>
                <td className="px-4 py-2.5 text-right text-zinc-200">{m.last_28d[k] ?? 0}</td>
                <td className="px-4 py-2.5 text-right text-orange-400">{m.totals[k] ?? 0}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                  nenhum evento registrado ainda
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-3 text-xs uppercase tracking-wide text-zinc-400">
            top grupos (28d)
          </div>
          {m.top_groups.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-zinc-500">sem atividade</div>
          ) : (
            <ul className="space-y-1.5 font-mono text-[12px]">
              {m.top_groups.map((g, i) => {
                const max = m.top_groups[0]?.events_28d ?? 1
                const pct = (g.events_28d / max) * 100
                return (
                  <li key={g.group_id} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[10px] text-zinc-500">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-zinc-200">{g.name}</span>
                    <div className="relative h-1.5 w-24 overflow-hidden rounded-sm bg-zinc-800">
                      <div
                        className="h-full bg-orange-400/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-orange-400">{g.events_28d}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-wide text-zinc-400">
              atividade diaria (28d)
            </div>
            <div className="font-mono text-[10px] text-zinc-500">
              peak {Math.max(...m.daily_28d.map((d) => d.count))}
            </div>
          </div>
          {(() => {
            const peak = Math.max(1, ...m.daily_28d.map((d) => d.count))
            return (
              <div className="flex h-24 items-end gap-[2px]">
                {m.daily_28d.map((d) => {
                  const h = (d.count / peak) * 100
                  return (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.count}`}
                      className="group flex-1 rounded-t-sm bg-orange-400/40 transition-colors hover:bg-orange-400"
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                  )
                })}
              </div>
            )
          })()}
          <div className="mt-2 flex justify-between font-mono text-[9px] text-zinc-600">
            <span>{m.daily_28d[0]?.date.slice(5)}</span>
            <span>{m.daily_28d[m.daily_28d.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
