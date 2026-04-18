import { Link } from 'react-router-dom'
import { useMe } from '@/features/auth/hooks'
import { useEventMetrics } from '@/features/admin/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useTitle } from '@/lib/useTitle'
import { useT } from '@/i18n'

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
      className={`rounded-sm border p-5 ${
        highlight
          ? 'border-up-orange/40 bg-up-orange/5'
          : 'border-up-line bg-up-panel/40'
      }`}
    >
      <div className="text-[11px] uppercase tracking-wider text-up-dim">{label}</div>
      <div
        className={`mt-2 font-mono text-3xl tabular-nums ${
          highlight ? 'text-up-orange' : 'text-up-text'
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[10px] text-up-dim">{hint}</div>}
    </div>
  )
}

export function AdminMetricsPage() {
  const t = useT()
  useTitle(t.nav.metrics)
  const me = useMe()
  const isSysAdmin = !!me.data?.is_sys_admin
  const q = useEventMetrics(isSysAdmin)

  if (me.isLoading) return <Loading />
  if (!isSysAdmin) {
    return (
      <div className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-mono text-lg text-up-text">{t.metrics.sysAdminOnly}</h1>
        <Link to="/groups" className="mt-4 inline-block text-up-orange transition-colors hover:underline">
          {t.common.back}
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

  const eventLabel = (k: string): string => {
    const events = t.metrics.events as Record<string, string>
    return events[k] ?? k
  }

  return (
    <div className="mx-auto max-w-4xl p-6 md:p-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-xl text-up-text">{t.metrics.observability}</h1>
        <Link to="/groups" className="text-xs text-up-dim transition-colors hover:text-up-orange">
          {t.common.back}
        </Link>
      </header>

      <section className="mb-4 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label={t.metrics.activeGroups1d}
          value={m.active_groups_1d}
          hint={t.metrics.activeGroups1dHint}
        />
        <KpiCard
          label={t.metrics.activeGroups7d}
          value={m.active_groups_7d}
          hint={t.metrics.activeGroups7dHint}
          highlight={m.active_groups_7d >= 10}
        />
        <KpiCard
          label={t.metrics.activeGroups28d}
          value={m.active_groups_28d}
          hint={t.metrics.activeGroups28dHint}
        />
        <KpiCard
          label={t.metrics.activeUsers7d}
          value={m.active_users_7d}
          hint={t.metrics.activeUsers7dHint}
        />
        <KpiCard
          label={t.metrics.dormant}
          value={m.dormant_groups}
          hint={t.metrics.dormantHint}
          highlight={m.dormant_groups > 0 && m.dormant_groups >= m.active_groups_28d / 2}
        />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <KpiCard
          label={t.metrics.seatsActivated}
          value={m.seats_activated}
          hint={t.metrics.seatsActivatedHint}
        />
        <KpiCard
          label={t.metrics.groupsCreated}
          value={m.groups_created_total}
          hint={t.metrics.groupsCreatedHint(m.groups_with_session)}
        />
        <KpiCard
          label={t.metrics.activationRate}
          value={`${(m.activation_rate * 100).toFixed(1)}%`}
          hint={t.metrics.activationRateHint}
          highlight={m.activation_rate >= 0.5}
        />
        <KpiCard
          label={t.metrics.sessionCompletion}
          value={`${(m.session_completion_rate_28d * 100).toFixed(1)}%`}
          hint={t.metrics.sessionCompletionHint(m.sessions_completed_28d, m.sessions_created_28d)}
          highlight={m.session_completion_rate_28d >= 0.4}
        />
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={t.metrics.landingVisits28d}
          value={m.landing_visits_28d}
          hint={t.metrics.landingVisitsHint}
        />
        <KpiCard
          label={t.metrics.signups28d}
          value={m.signups_28d}
          hint={t.metrics.signupsHint}
        />
        <KpiCard
          label={t.metrics.landingConv}
          value={`${(m.landing_conversion_rate_28d * 100).toFixed(1)}%`}
          hint={t.metrics.landingConvHint}
          highlight={
            m.landing_conversion_rate_28d >= 0.05 && m.landing_visits_28d >= 20
          }
        />
        <KpiCard
          label={t.metrics.w4Retention}
          value={`${(m.retention_w4 * 100).toFixed(1)}%`}
          hint={t.metrics.w4RetentionHint(m.retained_w4, m.cohort_w4_size)}
          highlight={m.retention_w4 >= 0.3 && m.cohort_w4_size >= 5}
        />
      </section>

      <section className="mb-8 rounded-sm border border-up-orange/20 bg-up-orange/5 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="text-xs uppercase tracking-wider text-up-orange">
            {t.metrics.tierBreakdownLabel}
          </div>
          <div className="font-mono text-[10px] text-up-dim">
            {t.metrics.legacyGroups(m.legacy_groups)}
          </div>
        </div>
        <div className="grid gap-3 md:grid-cols-5">
          {(['free', 'pro', 'community', 'creator', 'over'] as const).map((tier) => {
            const label = tier === 'over' ? '>500' : tier
            const price = { free: 0, pro: 29, community: 89, creator: 249, over: 0 }[tier]
            return (
              <div
                key={tier}
                className="rounded-sm border border-up-line bg-up-panel/60 p-3"
              >
                <div className="text-[10px] uppercase tracking-wider text-up-dim">
                  {label}
                </div>
                <div className="mt-1 font-mono text-2xl tabular-nums text-up-text">
                  {m.groups_by_tier[tier]}
                </div>
                <div className="mt-0.5 text-[10px] text-up-dim">
                  {price > 0 ? `R$ ${price}/mes` : '-'}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-up-orange/20 pt-3 text-[11px] text-up-dim">
          <div>
            {t.metrics.mrrProjectedLabel(m.groups_billable)}{' '}
            <span className="font-mono text-base text-up-orange">
              R$ {m.mrr_billable_brl}
            </span>
            <span className="ml-2 text-up-dim">{t.metrics.perMonth}</span>
          </div>
          <div className="text-up-dim">
            {t.metrics.mrrCeilingLabel}{' '}
            <span className="font-mono text-up-text">R$ {m.mrr_if_all_paid_brl}</span>
            <span className="ml-2 text-up-dim">{t.metrics.perMonth}</span>
          </div>
        </div>
      </section>

      <section className="rounded-sm border border-up-line bg-up-panel/40">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-up-dim">
            <tr className="border-b border-up-line">
              <th className="px-4 py-3 text-left">{t.metrics.eventHeader}</th>
              <th className="px-4 py-3 text-right">7d</th>
              <th className="px-4 py-3 text-right">28d</th>
              <th className="px-4 py-3 text-right">{t.common.total}</th>
            </tr>
          </thead>
          <tbody className="font-mono text-[12px]">
            {ordered.map((k) => (
              <tr key={k} className="border-b border-up-line/50 last:border-0">
                <td className="px-4 py-2.5 text-up-text">
                  <span className="text-up-text">{eventLabel(k)}</span>
                  <span className="ml-2 text-[10px] text-up-dim">{k}</span>
                </td>
                <td className="px-4 py-2.5 text-right tabular-nums text-up-text">{m.last_7d[k] ?? 0}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-up-text">{m.last_28d[k] ?? 0}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-up-orange">{m.totals[k] ?? 0}</td>
              </tr>
            ))}
            {ordered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-up-dim">
                  {t.metrics.noEvents}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="rounded-sm border border-up-line bg-up-panel/40 p-5">
          <div className="mb-3 text-xs uppercase tracking-wider text-up-dim">
            {t.metrics.topGroups}
          </div>
          {m.top_groups.length === 0 ? (
            <div className="py-6 text-center text-[11px] text-up-dim">{t.metrics.noActivity}</div>
          ) : (
            <ul className="space-y-1.5 font-mono text-[12px]">
              {m.top_groups.map((g, i) => {
                const max = m.top_groups[0]?.events_28d ?? 1
                const pct = (g.events_28d / max) * 100
                return (
                  <li key={g.group_id} className="flex items-center gap-2">
                    <span className="w-5 text-right text-[10px] text-up-dim">
                      {i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-up-text" title={g.name}>{g.name}</span>
                    <div className="relative h-1.5 w-24 overflow-hidden rounded-sm bg-up-line/30">
                      <div
                        className="h-full bg-up-orange/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right tabular-nums text-up-orange">{g.events_28d}</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-sm border border-up-line bg-up-panel/40 p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="text-xs uppercase tracking-wider text-up-dim">
              {t.metrics.dailyActivity}
            </div>
            <div className="font-mono text-[10px] text-up-dim">
              {t.metrics.peak(Math.max(...m.daily_28d.map((d) => d.count)))}
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
                      className="group flex-1 rounded-t-sm bg-up-orange/40 transition-colors hover:bg-up-orange"
                      style={{ height: `${Math.max(h, 2)}%` }}
                    />
                  )
                })}
              </div>
            )
          })()}
          <div className="mt-2 flex justify-between font-mono text-[10px] text-up-dim">
            <span>{m.daily_28d[0]?.date.slice(5)}</span>
            <span>{m.daily_28d[m.daily_28d.length - 1]?.date.slice(5)}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-sm border border-up-line bg-up-panel/40 p-5">
        <div className="mb-3 text-xs uppercase tracking-wider text-up-dim">
          {t.metrics.topReferrers}
        </div>
        {m.top_referrers.length === 0 ? (
          <div className="py-4 text-center text-[11px] text-up-dim">
            {t.metrics.refShareHint}{' '}
            <code className="text-up-dim">up2gether.com.br/?ref=SEU_CANAL</code> {t.metrics.refShareSuffix}
          </div>
        ) : (
          <ul className="space-y-1.5 font-mono text-[12px]">
            {m.top_referrers.map((r, i) => {
              const max = m.top_referrers[0]?.count ?? 1
              const pct = (r.count / max) * 100
              return (
                <li key={r.ref} className="flex items-center gap-2">
                  <span className="w-5 text-right text-[10px] text-up-dim">{i + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-up-text" title={r.user_name ? `@${r.user_name} (${r.ref})` : r.ref}>
                    {r.user_name ? (
                      <>
                        <span className="text-up-green/90">@{r.user_name}</span>
                        <span className="ml-1.5 text-[10px] text-up-dim">{r.ref.slice(0, 8)}</span>
                      </>
                    ) : (
                      r.ref
                    )}
                  </span>
                  <div className="relative h-1.5 w-24 overflow-hidden rounded-sm bg-up-line/30">
                    <div
                      className="h-full bg-up-orange/70"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-right tabular-nums text-up-orange">{r.count}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
