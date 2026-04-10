import { useState } from 'react'
import { useGames } from '@/features/games/hooks'
import { useSessions, useDeleteSession } from '@/features/sessions/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

export function SessionsTab({ groupId }: { groupId: string }) {
  const sessions = useSessions(groupId)
  const del = useDeleteSession(groupId)
  const games = useGames(groupId)
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const gameName = (gid: string) => games.data?.find((g) => g.id === gid)?.name ?? '—'
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (sessions.data ?? []).slice().sort((a, b) => (a.start_at < b.start_at ? 1 : -1))
  const filtered = query
    ? list.filter((s) => norm(s.title).includes(query) || norm(gameName(s.game_id)).includes(query))
    : list

  const toggleOne = (sid: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(sid)) n.delete(sid)
      else n.add(sid)
      return n
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((s) => s.id)))
  }

  const deleteOne = async (sid: string) => {
    try {
      await del.mutateAsync(sid)
      toast.success('sessao apagada')
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(sid)
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
      ids.map(async (sid) => {
        try {
          await del.mutateAsync(sid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(`${ok} sessao${ok === 1 ? '' : 'es'} apagada${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagadas, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  if (sessions.isLoading) return <Loading />
  if (sessions.error) return <ErrorBox error={sessions.error} />

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Sessoes do grupo</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Passadas e futuras. Busca por titulo ou nome do jogo.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="tabular-nums text-nerv-orange">{list.length}</span> total
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="buscar sessao..."
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
          <p className="text-xs text-nerv-red">apagar {selected.size} sessao{selected.size === 1 ? '' : 'es'}?</p>
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
          {q ? `nenhuma sessao pra "${q}"` : 'nenhuma sessao ainda'}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-nerv-line/30">
          {filtered.map((s) => {
            const on = selected.has(s.id)
            const confirming = pendingDelete === s.id
            const when = new Date(s.start_at)
            const isPast = when.getTime() < Date.now()
            const dt = when.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
            return (
              <div key={s.id} className="flex items-center gap-3 py-2">
                <input type="checkbox" checked={on} onChange={() => toggleOne(s.id)} className="h-3.5 w-3.5 shrink-0 accent-nerv-orange" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{s.title}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${isPast ? 'text-nerv-dim' : 'text-nerv-green'}`}>
                      {isPast ? 'passada' : 'futura'}
                    </span>
                  </div>
                  <div className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {dt} · {gameName(s.game_id)} · {s.rsvp_yes}y/{s.rsvp_maybe}m/{s.rsvp_no}n
                  </div>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setPendingDelete(null)} className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim">cancelar</button>
                    <button onClick={() => deleteOne(s.id)} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red">confirmar</button>
                  </div>
                ) : (
                  <button onClick={() => setPendingDelete(s.id)} className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red">
                    apagar
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
