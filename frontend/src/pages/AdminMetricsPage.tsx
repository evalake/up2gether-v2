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
  landing_visit: 'visitas landing',
}

const ORDER = [
  'landing_visit',
  'member_activated',
  'group_created',
  'group_joined',
  'session_created',
  'session_completed',
  'vote_created',
  'vote_cast',
  'vote_completed',
]

function KpiCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string
  value: string | number
  hint?: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-lg border p-5 ${
        highlight
          ? 'border-orange-500/40 bg-orange-500/5'
          : 'border-zinc-800 bg-zinc-900/40'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wide text-zinc-400">{label}</div>
      <div
        className={`mt-2 font-mono text-3xl ${
          highlight ? 'text-orange-400' : 'text-zinc-100'
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] text-zinc-500">{hint}</div>}
    </div>
  )
}

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

      <section className="mb-4 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="grupos ativos 1d"
          value={m.active_groups_1d}
          hint="com qualquer evento hoje"
        />
        <KpiCard
          label="grupos ativos 7d"
          value={m.active_groups_7d}
          hint="WAU por servidor"
          highlight={m.active_groups_7d >= 10}
        />
        <KpiCard
          label="grupos ativos 28d"
          value={m.active_groups_28d}
          hint="MAU por servidor"
        />
        <KpiCard
          label="users ativos 7d"
          value={m.active_users_7d}
          hint="distinct user_id em events"
        />
        <KpiCard
          label="dormentes"
          value={m.dormant_groups}
          hint="ativos em 28-56d, sumiram agora"
          highlight={m.dormant_groups > 0 && m.dormant_groups >= m.active_groups_28d / 2}
        />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <KpiCard
          label="seats ativados"
          value={m.seats_activated}
          hint="users que logaram via discord"
        />
        <KpiCard
          label="grupos criados"
          value={m.groups_created_total}
          hint={`${m.groups_with_session} com >=1 sessão`}
        />
        <KpiCard
          label="activation rate"
          value={`${(m.activation_rate * 100).toFixed(1)}%`}
          hint="grupos que tiveram sessão / total"
          highlight={m.activation_rate >= 0.5}
        />
        <KpiCard
          label="session completion 28d"
          value={`${(m.session_completion_rate_28d * 100).toFixed(1)}%`}
          hint={`${m.sessions_completed_28d}/${m.sessions_created_28d} no mes`}
          highlight={m.session_completion_rate_28d >= 0.4}
        />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="landing visits 28d"
          value={m.landing_visits_28d}
          hint="anon hits em / (1x por sessão)"
        />
        <KpiCard
          label="signups 28d"
          value={m.signups_28d}
          hint="member_activated (primeiro login)"
        />
        <KpiCard
          label="landing -> signup"
          value={`${(m.landing_conversion_rate_28d * 100).toFixed(1)}%`}
          hint="abaixo de 5% revisar copy/CTA"
          highlight={
            m.landing_conversion_rate_28d >= 0.05 && m.landing_visits_28d >= 20
          }
        />
        <KpiCard
          label="W4 retention"
          value={`${(m.retention_w4 * 100).toFixed(1)}%`}
          hint={`${m.retained_w4}/${m.cohort_w4_size} cohort 28-56d`}
          highlight={m.retention_w4 >= 0.3 && m.cohort_w4_size >= 5}
        />
      </section>

      <section className="mb-8 rounded-lg border border-orange-500/20 bg-orange-500/5 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wide text-orange-300">
            tier breakdown (projecao paywall)
          </div>
          <div className="font-mono text-[10px] text-zinc-500">
            {m.legacy_groups} grupos com legacy_free
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {(['free', 'pro', 'community', 'creator', 'over'] as const).map((t) => {
            const label = t === 'over' ? '>500' : t
            const price = { free: 0, pro: 29, community: 89, creator: 249, over: 0 }[t]
            return (
              <div
                key={t}
                className="rounded-md border border-zinc-800 bg-zinc-900/60 p-3"
              >
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {label}
                </div>
                <div className="mt-1 font-mono text-2xl text-zinc-100">
                  {m.groups_by_tier[t]}
                </div>
                <div className="mt-0.5 text-[10px] text-zinc-500">
                  {price > 0 ? `R$ ${price}/mes` : '—'}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-orange-500/20 pt-3 text-[11px] text-zinc-400">
          <div>
            MRR projetado se ligasse paywall hoje ({m.groups_billable} grupos billable):{' '}
            <span className="font-mono text-base text-orange-300">
              R$ {m.mrr_billable_brl}
            </span>
            <span className="ml-2 text-zinc-600">/ mes</span>
          </div>
          <div className="text-zinc-500">
            teto teorico se todos pagassem (ignora legacy):{' '}
            <span className="font-mono text-zinc-300">R$ {m.mrr_if_all_paid_brl}</span>
            <span className="ml-2 text-zinc-600">/ mes</span>
          </div>
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

      <section className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900/40 p-5">
        <div className="mb-3 text-xs uppercase tracking-wide text-zinc-400">
          top referrers (signups com ?ref=)
        </div>
        {m.top_referrers.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-zinc-500">
            nenhum signup com ref ainda. compartilhe{' '}
            <code className="text-zinc-400">up2gether.com.br/?ref=SEU_CANAL</code> em parcerias.
          </div>
        ) : (
          <ul className="space-y-1.5 font-mono text-[12px]">
            {m.top_referrers.map((r, i) => {
              const max = m.top_referrers[0]?.count ?? 1
              const pct = (r.count / max) * 100
              return (
                <li key={r.ref} className="flex items-center gap-2">
                  <span className="w-5 text-right text-[10px] text-zinc-500">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-zinc-200">
                    {r.user_name ? (
                      <>
                        <span className="text-nerv-green/90">@{r.user_name}</span>
                        <span className="ml-1.5 text-[10px] text-zinc-500">{r.ref.slice(0, 8)}</span>
                      </>
                    ) : (
                      r.ref
                    )}
                  </span>
                  <div className="relative h-1.5 w-24 overflow-hidden rounded-sm bg-zinc-800">
                    <div
                      className="h-full bg-orange-400/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right text-orange-400">{r.count}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
