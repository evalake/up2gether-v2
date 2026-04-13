import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCreateGroup, useGroups } from '@/features/groups/hooks'
import { fetchMyGuilds, type DiscordGuild } from '@/features/auth/api'
import { api } from '@/lib/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/nerv/Button'
import { KanjiLabel } from '@/components/nerv/KanjiLabel'
import { useTitle } from '@/lib/useTitle'

function guildIconUrl(g: DiscordGuild): string | null {
  return g.icon ? `https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=128` : null
}

function GuildPickerModal({
  open,
  onClose,
  onPick,
  registered,
}: {
  open: boolean
  onClose: () => void
  onPick: (g: DiscordGuild) => void
  registered: Set<string>
}) {
  const guilds = useQuery({
    queryKey: ['discord', 'guilds'],
    queryFn: fetchMyGuilds,
    enabled: open,
    staleTime: 60_000,
  })
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const [q, setQ] = useState('')
  const filtered = useMemo(
    () => (guilds.data ?? []).filter((g) => g.name.toLowerCase().includes(q.toLowerCase())),
    [guilds.data, q],
  )
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 360, damping: 30 }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <button
              onClick={onClose}
              aria-label="fechar"
              className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>
            <div className="border-b border-nerv-orange/20 px-4 py-3">
              <div className="font-display text-sm uppercase tracking-wider text-nerv-text">
                selecione um server do discord
              </div>
              <div className="mt-0.5 text-[11px] text-nerv-dim">escolha um servidor da sua conta discord</div>
            </div>
            <div className="border-b border-nerv-orange/20 px-4 py-2">
              <input
                autoFocus
                aria-label="buscar servers"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="buscar servers..."
                className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-3 text-xs focus:border-nerv-orange focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto">
              {guilds.isLoading && <div className="p-4"><Loading /></div>}
              {guilds.error && <div className="p-4"><ErrorBox error={guilds.error} /></div>}
              {filtered.map((g) => {
                const url = guildIconUrl(g)
                const already = registered.has(g.id)
                return (
                  <button
                    key={g.id}
                    type="button"
                    disabled={already}
                    onClick={() => onPick(g)}
                    className="flex w-full items-center gap-3 border-b border-nerv-line/60 px-4 py-2.5 text-left transition-colors hover:bg-nerv-orange/10 disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    {url ? (
                      <img loading="lazy" src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black/50 font-display text-sm text-nerv-orange">
                        {g.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="flex-1 truncate text-sm text-nerv-text">{g.name}</span>
                    {g.owner && <span className="text-[9px] uppercase tracking-wider text-nerv-amber">owner</span>}
                    {already && <span className="text-[9px] uppercase tracking-wider text-nerv-green">já registrado</span>}
                  </button>
                )
              })}
              {!guilds.isLoading && filtered.length === 0 && (
                <div className="p-6 text-center text-xs text-nerv-dim">nenhum server encontrado</div>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="block w-full border-t border-nerv-orange/30 bg-black/40 py-3 text-xs uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/10"
            >
              cancelar
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function GroupsPage() {
  useTitle('grupos')
  const { data, isLoading, error } = useGroups()
  const create = useCreateGroup()
  const [pickerOpen, setPickerOpen] = useState(false)
  const toast = useToast()
  const qc = useQueryClient()

  // auto-discover silencioso: tenta join em servers que ja existem no up2gether
  const discovered = useRef(false)
  useEffect(() => {
    if (discovered.current || isLoading || !data) return
    discovered.current = true
    api<{ joined: { id: string }[] }>('/groups/auto-discover', { method: 'POST' })
      .then((r) => { if (r.joined.length > 0) qc.invalidateQueries({ queryKey: ['groups'] }) })
      .catch(() => {})
  }, [data, isLoading, qc])

  const registered = useMemo(
    () => new Set((data ?? []).map((g) => g.discord_guild_id)),
    [data],
  )

  const onPickGuild = async (g: DiscordGuild) => {
    setPickerOpen(false)
    try {
      await create.mutateAsync({
        discord_guild_id: g.id,
        name: g.name,
        icon_url: guildIconUrl(g),
        discord_permissions: g.permissions ?? null,
        webhook_url: null,
      })
      toast.success(`${g.name} registrado`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao registrar grupo')
    }
  }

  const total = data?.length ?? 0
  const totalMembers = data?.reduce((acc, g) => acc + g.member_count, 0) ?? 0
  const totalGames = data?.reduce((acc, g) => acc + g.game_count, 0) ?? 0
  const activeVotes = data?.reduce((acc, g) => acc + g.active_vote_sessions, 0) ?? 0

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <KanjiLabel jp="グループ" en="groups" />
          <h1 className="mt-1 font-display text-3xl text-nerv-text">seus grupos</h1>
        </div>
        <Button onClick={() => setPickerOpen(true)}>
          + adicionar server
        </Button>
      </header>

      <GuildPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPickGuild}
        registered={registered}
      />

<div className="flex flex-wrap gap-x-6 gap-y-1 text-[11px] uppercase tracking-wider text-nerv-dim">
        <span><span className="text-nerv-orange tabular-nums">{total}</span> grupos</span>
        <span><span className="text-nerv-green tabular-nums">{totalMembers}</span> membros</span>
        <span><span className="text-nerv-amber tabular-nums">{totalGames}</span> jogos</span>
        {activeVotes > 0 && <span><span className="text-nerv-magenta tabular-nums">{activeVotes}</span> votações abertas</span>}
      </div>

      {isLoading && <Loading />}
      {error && <ErrorBox error={error} />}

      {data && data.length === 0 && (
        <EmptyState
          title="nenhum grupo ainda"
          hint="cria o primeiro pra começar a coordenar sessões"
          action={<Button onClick={() => setPickerOpen(true)}>+ adicionar server</Button>}
        />
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.map((g, i) => (
          <motion.div
            key={g.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
          >
            <Link to={`/groups/${g.id}`} className="block">
              <div className="group relative overflow-hidden rounded-sm border border-nerv-orange/20 bg-nerv-panel/60 p-4 transition-all hover:border-nerv-orange hover:shadow-[0_0_30px_rgba(255,102,0,0.2)]">
                {(g.banner_url || g.icon_url) && (
                  <div className="pointer-events-none absolute inset-0">
                    <img
                      loading="lazy"
                      src={g.banner_url || g.icon_url || ''}
                      alt=""
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      className={`h-full w-full object-cover transition-opacity ${g.banner_url ? 'opacity-20 group-hover:opacity-30' : 'scale-150 opacity-15 blur-2xl group-hover:opacity-25'}`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/70 to-transparent" />
                  </div>
                )}
                <div className="relative mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {g.icon_url && (
                      <img loading="lazy" src={g.icon_url} alt="" className="h-8 w-8 rounded-sm border border-nerv-orange/30 object-cover" />
                    )}
                    <div className="font-display text-xl text-nerv-text">{g.name}</div>
                  </div>
                  <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-wider ${
                    g.user_role === 'admin'
                      ? 'border-nerv-orange text-nerv-orange'
                      : g.user_role === 'mod'
                      ? 'border-nerv-amber text-nerv-amber'
                      : 'border-nerv-line text-nerv-dim'
                  }`}>{g.user_role}</span>
                </div>
                <div className="relative flex gap-4 text-[10px] uppercase tracking-wider text-nerv-dim">
                  <span>members <span className="text-nerv-green">{g.member_count}</span></span>
                  <span>games <span className="text-nerv-amber">{g.game_count}</span></span>
                  {g.active_vote_sessions > 0 && (
                    <span>voting <span className="text-nerv-magenta">{g.active_vote_sessions}</span></span>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
