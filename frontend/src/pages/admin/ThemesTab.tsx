import { useState } from 'react'
import { useThemes, useDeleteTheme, useCycle, useCancelCycle } from '@/features/themes/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

export function ThemesTab({ groupId }: { groupId: string }) {
  const themes = useThemes(groupId)
  const cycle = useCycle(groupId)
  const del = useDeleteTheme(groupId)
  const cancel = useCancelCycle(groupId)
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [cancelConfirm, setCancelConfirm] = useState(false)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (themes.data ?? []).slice().sort((a, b) => (a.month_year < b.month_year ? 1 : -1))
  const filtered = query
    ? list.filter((t) => norm(t.theme_name).includes(query) || norm(t.month_year).includes(query))
    : list

  const toggleOne = (tid: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(tid)) n.delete(tid)
      else n.add(tid)
      return n
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((t) => t.id)))
  }

  const deleteOne = async (tid: string) => {
    try {
      await del.mutateAsync(tid)
      toast.success('tema apagado')
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(tid)
        return n
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  const deleteBulk = async () => {
    const ids = Array.from(selected)
    let ok = 0
    let fail = 0
    await Promise.all(
      ids.map(async (tid) => {
        try {
          await del.mutateAsync(tid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(`${ok} tema${ok === 1 ? '' : 's'} apagado${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagados, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  const doCancel = async () => {
    if (!cycle.data) return
    try {
      await cancel.mutateAsync(cycle.data.id)
      toast.success('ciclo cancelado')
      setCancelConfirm(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  if (themes.isLoading) return <Loading />
  if (themes.error) return <ErrorBox error={themes.error} />

  const activeCycle = cycle.data && cycle.data.phase !== 'cancelled' && cycle.data.phase !== 'decided'

  return (
    <div className="space-y-4">
      {activeCycle && (
        <section className="rounded-sm border border-nerv-orange/30 bg-nerv-panel/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Ciclo ativo</div>
              <div className="mt-1 text-sm text-nerv-text">
                {cycle.data!.month_year} · fase <span className="text-nerv-orange">{cycle.data!.phase}</span> · {cycle.data!.suggestions.length} sugestoes · {cycle.data!.total_votes} votos
              </div>
            </div>
            {cancelConfirm ? (
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setCancelConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
                <button onClick={doCancel} disabled={cancel.isPending} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40">
                  sim, cancelar ciclo
                </button>
              </div>
            ) : (
              <button onClick={() => setCancelConfirm(true)} className="shrink-0 rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10">
                cancelar ciclo
              </button>
            )}
          </div>
        </section>
      )}

      <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Temas do grupo</div>
            <p className="mt-1 text-[11px] text-nerv-dim/80">
              Historico mensal. Busca por nome ou mes.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            <span className="tabular-nums text-nerv-orange">{list.length}</span> total
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            aria-label="buscar tema"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="buscar tema..."
            className="h-8 min-w-[180px] flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
          />
          {filtered.length > 0 && (
            <button onClick={toggleAll} className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">
              {selected.size === filtered.length ? 'limpar' : 'tudo'}
            </button>
          )}
          {selected.size > 0 && (
            <button onClick={() => setBulkConfirm(true)} className="rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10">
              apagar {selected.size}
            </button>
          )}
        </div>

        {bulkConfirm && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
            <p className="text-xs text-nerv-red">apagar {selected.size} tema{selected.size === 1 ? '' : 's'}?</p>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
              <button onClick={deleteBulk} disabled={del.isPending} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40">
                sim, apagar
              </button>
            </div>
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="mt-4 py-6 text-center text-[11px] text-nerv-dim">
            {q ? `nenhum tema pra "${q}"` : 'nenhum tema ainda'}
          </div>
        ) : (
          <div className="mt-4 divide-y divide-nerv-line/30">
            {filtered.map((t) => {
              const on = selected.has(t.id)
              const confirming = pendingDelete === t.id
              return (
                <div key={t.id} className="flex items-center gap-3 py-2">
                  <input type="checkbox" checked={on} onChange={() => toggleOne(t.id)} className="h-3.5 w-3.5 shrink-0 accent-nerv-orange" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-nerv-text">{t.theme_name}</div>
                    <div className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                      {t.month_year}{t.description ? ` · ${t.description}` : ''}
                    </div>
                  </div>
                  {confirming ? (
                    <div className="flex shrink-0 gap-1">
                      <button onClick={() => setPendingDelete(null)} className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim">cancelar</button>
                      <button onClick={() => deleteOne(t.id)} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red">confirmar</button>
                    </div>
                  ) : (
                    <button onClick={() => setPendingDelete(t.id)} className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red">
                      apagar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
