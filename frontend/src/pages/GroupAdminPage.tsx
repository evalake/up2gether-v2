import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  useGroup,
  useDeleteGroup,
  usePurgeGroup,
  useSyncDiscord,
  useCurrentGameAudit,
  useSetCurrentGame,
  useMembers,
  usePromote,
  useDemote,
  useKick,
  groupKey,
} from '@/features/groups/hooks'
import { useGames, useArchiveGame } from '@/features/games/hooks'
import type { Game } from '@/features/games/api'
import { useVotes, useDeleteVote } from '@/features/votes/hooks'
import { closeVote } from '@/features/votes/api'
import { useSessions, useDeleteSession } from '@/features/sessions/hooks'
import { useThemes, useDeleteTheme, useCycle, useCancelCycle } from '@/features/themes/hooks'
import { useMe } from '@/features/auth/hooks'
import { updateWebhook } from '@/features/groups/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/nerv/Avatar'

type AdminTab = 'overview' | 'games' | 'votes' | 'sessions' | 'themes' | 'members' | 'config' | 'danger'

const TABS: { key: AdminTab; label: string; ownerOnly?: boolean }[] = [
  { key: 'overview', label: 'overview' },
  { key: 'games', label: 'games' },
  { key: 'votes', label: 'votes' },
  { key: 'sessions', label: 'sessoes' },
  { key: 'themes', label: 'temas' },
  { key: 'members', label: 'membros' },
  { key: 'config', label: 'config' },
  { key: 'danger', label: 'perigo', ownerOnly: true },
]

export function GroupAdminPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const me = useMe()
  const group = useGroup(id)
  const del = useDeleteGroup()
  const purge = usePurgeGroup()
  const sync = useSyncDiscord()
  const currentGame = useCurrentGameAudit(id)
  const setCurrent = useSetCurrentGame(id)
  const games = useGames(id)
  const members = useMembers(id)
  const allVotes = useVotes(id)
  const allSessions = useSessions(id)
  const allThemes = useThemes(id)
  const promote = usePromote(id)
  const demote = useDemote(id)
  const kick = useKick(id)
  const [gameSearch, setGameSearch] = useState('')
  const toast = useToast()
  const [confirmKind, setConfirmKind] = useState<null | 'reset' | 'destroy'>(null)
  const [tab, setTab] = useState<AdminTab>('overview')

  if (group.isLoading) return <Loading />
  if (group.error) return <ErrorBox error={group.error} />
  if (!group.data) return null

  const isSysAdmin = !!me.data?.is_sys_admin
  const isAdmin = group.data.user_role === 'admin' || isSysAdmin
  const isOwner = group.data.owner_user_id === me.data?.id || isSysAdmin

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl text-nerv-text">Painel do Admin</h1>
        <p className="text-sm text-nerv-dim">Você não tem permissão pra acessar esse painel.</p>
        <Link to={`/groups/${id}`} className="text-[11px] uppercase tracking-wider text-nerv-orange hover:underline">
          voltar pro grupo
        </Link>
      </div>
    )
  }

  const onReset = async () => {
    try {
      await purge.mutateAsync(id)
      toast.success('dados do grupo resetados')
      setConfirmKind(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  const onDelete = async () => {
    try {
      await del.mutateAsync(id)
      toast.success('grupo excluído')
      navigate('/groups')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-orange/80">Painel do Admin</div>
          <h1 className="mt-1 font-display text-3xl text-nerv-text">{group.data.name}</h1>
          <p className="mt-1 text-xs text-nerv-dim">Controles avançados do servidor. Só admin e sysadmin veem.</p>
        </div>
        <Link
          to={`/groups/${id}`}
          className="rounded-sm border border-nerv-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/50 hover:text-nerv-orange"
        >
          Voltar
        </Link>
      </header>

      <div className="flex flex-wrap gap-1 border-b border-nerv-line/30 pb-1">
        {TABS.filter((t) => !t.ownerOnly || isOwner).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-t-sm border-b-2 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
              tab === t.key
                ? t.key === 'danger'
                  ? 'border-nerv-red text-nerv-red'
                  : 'border-nerv-orange text-nerv-orange'
                : 'border-transparent text-nerv-dim hover:text-nerv-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
      <section className="rounded-sm border border-nerv-green/20 bg-nerv-green/5 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-nerv-green/80">Game atual</div>
            <p className="mt-1 text-[11px] text-nerv-dim/80">
              Por padrão, o game da vez vira o vencedor da última votação. Aqui você pode travar manualmente, destravar ou trocar a qualquer momento.
            </p>
            {currentGame.data ? (
              <div className="mt-3 flex items-center gap-3">
                {currentGame.data.cover_url && (
                  <img src={currentGame.data.cover_url} alt="" className="h-14 w-24 rounded-sm border border-nerv-green/30 object-cover" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-display text-base text-nerv-text">{currentGame.data.name}</div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {currentGame.data.source === 'manual' ? 'travado manual' : 'definido por votação'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-nerv-dim">Nenhum game atual definido.</div>
            )}
          </div>
          {currentGame.data && (
            <button
              onClick={async () => {
                try {
                  await setCurrent.mutateAsync({ gameId: null })
                  toast.success('destravado')
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'falha')
                }
              }}
              disabled={setCurrent.isPending}
              className="shrink-0 rounded-sm border border-nerv-red/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10 disabled:opacity-40"
            >
              destravar
            </button>
          )}
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-nerv-dim">Trocar manualmente</div>
          <input
            value={gameSearch}
            onChange={(e) => setGameSearch(e.target.value)}
            placeholder="buscar jogo..."
            className="mt-1 h-8 w-full max-w-sm rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-green focus:outline-none"
          />
          {gameSearch && games.data && (
            <div className="mt-2 max-h-48 overflow-y-auto rounded-sm border border-nerv-line/40">
              {games.data
                .filter((g) => !g.archived_at && g.name.toLowerCase().includes(gameSearch.toLowerCase()))
                .slice(0, 10)
                .map((g) => (
                  <button
                    key={g.id}
                    onClick={async () => {
                      try {
                        await setCurrent.mutateAsync({ gameId: g.id, lockManual: true })
                        toast.success(`${g.name} virou o game atual`)
                        setGameSearch('')
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : 'falha')
                      }
                    }}
                    className="flex w-full items-center gap-2 border-b border-nerv-line/20 px-2 py-1.5 text-left text-xs text-nerv-text hover:bg-nerv-green/10"
                  >
                    {g.cover_url && <img src={g.cover_url} alt="" className="h-6 w-10 rounded-sm object-cover" />}
                    <span className="truncate">{g.name}</span>
                  </button>
                ))}
            </div>
          )}
        </div>
      </section>
      )}

      {tab === 'overview' && (
        <OverviewCounters
          games={games.data?.filter((g) => !g.archived_at).length ?? 0}
          members={members.data?.length ?? 0}
          votes={allVotes.data?.length ?? 0}
          sessions={allSessions.data?.length ?? 0}
          themes={allThemes.data?.length ?? 0}
          onJump={setTab}
        />
      )}

      {tab === 'games' && <GamesTab groupId={id} />}
      {tab === 'votes' && <VotesTab groupId={id} />}
      {tab === 'sessions' && <SessionsTab groupId={id} />}
      {tab === 'themes' && <ThemesTab groupId={id} />}

      {tab === 'config' && (
      <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Visual do Discord</div>
            <p className="mt-1 text-[11px] text-nerv-dim/80">
              Puxa ícone, banner, splash e descrição direto do servidor no Discord. Banner/splash só aparecem se o servidor tiver esses recursos habilitados (boosts).
            </p>
            <div className="mt-3 flex items-center gap-3">
              {group.data.icon_url && (
                <img src={group.data.icon_url} alt="" className="h-12 w-12 rounded-sm border border-nerv-line object-cover" />
              )}
              <div className="flex flex-col gap-0.5 text-[10px] text-nerv-dim">
                <span>ícone: {group.data.icon_url ? 'ok' : '—'}</span>
                <span>banner: {group.data.banner_url ? 'ok' : '—'}</span>
                <span>splash: {group.data.splash_url ? 'ok' : '—'}</span>
              </div>
            </div>
          </div>
          <button
            onClick={async () => {
              try {
                await sync.mutateAsync(id)
                toast.success('visuais sincronizados')
              } catch (e) {
                toast.error(e instanceof Error ? e.message : 'falha ao sincronizar')
              }
            }}
            disabled={sync.isPending}
            className="shrink-0 rounded-sm border border-nerv-orange/60 bg-nerv-orange/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-40"
          >
            {sync.isPending ? 'sincronizando...' : 'sincronizar'}
          </button>
        </div>
      </section>
      )}

      {tab === 'config' && <WebhookSection groupId={group.data.id} current={group.data.webhook_url} />}

      {tab === 'members' && (
      <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Membros</div>
            <p className="mt-1 text-[11px] text-nerv-dim/80">
              Gerencie roles e remoção. Apenas o dono promove/rebaixa outros admins. Mods não aparecem aqui como editáveis.
            </p>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
            <span className="tabular-nums text-nerv-orange">{members.data?.length ?? 0}</span> total
          </div>
        </div>
        {members.isLoading && <div className="mt-4"><Loading /></div>}
        {members.error && <div className="mt-4"><ErrorBox error={members.error} /></div>}
        <div className="mt-4 divide-y divide-nerv-line/30">
          {members.data?.map((m) => {
            const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
            const isMe = me.data?.id === m.user_id
            const isTargetOwner = group.data!.owner_user_id === m.user_id
            const canEdit = !isMe && !isTargetOwner
            // dono promove qualquer um. admin n-owner so mexe em member/mod (nao em admin).
            const canTouchThisRole = isOwner || (m.role !== 'admin')
            const roleColor =
              m.role === 'admin' ? 'text-nerv-orange' : m.role === 'mod' ? 'text-nerv-amber' : 'text-nerv-dim'
            return (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{name}</span>
                    {isMe && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">você</span>}
                    {isTargetOwner && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-magenta">dono</span>}
                  </div>
                  <div className={`font-mono text-[9px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
                </div>
                {canEdit && canTouchThisRole && (
                  <div className="flex shrink-0 gap-1">
                    {m.role !== 'admin' && (
                      <button
                        onClick={() => {
                          const next = m.role === 'mod' ? 'admin' : 'mod'
                          if (next === 'admin' && !isOwner) {
                            toast.error('só o dono pode promover a admin')
                            return
                          }
                          promote.mutate({ userId: m.user_id, role: next })
                        }}
                        className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-green/60 hover:text-nerv-green"
                        title={m.role === 'mod' ? 'promover pra admin' : 'promover pra mod'}
                      >
                        ↑ {m.role === 'mod' ? 'admin' : 'mod'}
                      </button>
                    )}
                    {m.role !== 'member' && (
                      <button
                        onClick={() => demote.mutate(m.user_id)}
                        className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-amber/60 hover:text-nerv-amber"
                        title="rebaixar"
                      >
                        ↓
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`remover ${name} do grupo?`)) kick.mutate(m.user_id)
                      }}
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
                      title="remover do grupo"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>
      )}

      {tab === 'danger' && isOwner && (
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-sm border border-nerv-red/20 bg-nerv-red/5 p-5"
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-nerv-red/80">Zona Perigosa</div>
              <p className="mt-0.5 text-[11px] text-nerv-dim">Ações irreversíveis. Só o dono do servidor vê.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmKind('reset')}
                className="rounded-sm border border-nerv-amber/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-amber hover:bg-nerv-amber/10"
              >
                Resetar Dados
              </button>
              <button
                onClick={() => setConfirmKind('destroy')}
                className="rounded-sm border border-nerv-red/50 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10"
              >
                Excluir Servidor
              </button>
            </div>
          </div>
          {confirmKind === 'reset' && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-amber/30 bg-black/30 p-3">
              <p className="text-xs text-nerv-amber">
                Apaga jogos, votações, temas e sessões. Mantém grupo e membros. Tem certeza?
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
                <button
                  onClick={onReset}
                  disabled={purge.isPending}
                  className="rounded-sm border border-nerv-amber/60 bg-nerv-amber/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-amber disabled:opacity-40"
                >
                  {purge.isPending ? 'resetando...' : 'sim, resetar'}
                </button>
              </div>
            </div>
          )}
          {confirmKind === 'destroy' && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
              <p className="text-xs text-nerv-red">
                Apaga o servidor e tudo dentro. Não dá pra desfazer. Tem certeza?
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
                <button
                  onClick={onDelete}
                  disabled={del.isPending}
                  className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
                >
                  {del.isPending ? 'excluindo...' : 'sim, excluir'}
                </button>
              </div>
            </div>
          )}
        </motion.section>
      )}
    </div>
  )
}

function WebhookSection({ groupId, current }: { groupId: string; current: string | null }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [value, setValue] = useState(current ?? '')
  const [editing, setEditing] = useState(false)
  const mut = useMutation({
    mutationFn: (url: string | null) => updateWebhook(groupId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKey(groupId) })
      toast.success('webhook atualizado')
      setEditing(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'falha ao atualizar'),
  })
  const save = () => {
    const v = value.trim()
    if (v && !v.startsWith('https://discord.com/api/webhooks/') && !v.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('URL inválida')
      return
    }
    mut.mutate(v || null)
  }
  const clear = () => {
    setValue('')
    mut.mutate(null)
  }
  const masked = current ? current.slice(0, 48) + '…' : '— não configurado'
  return (
    <section className="rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Discord Webhook</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Usado pra avisar o servidor quando votação abre ou sessão é agendada. Cole a URL de um webhook criado no canal do Discord.
          </p>
          {!editing && (
            <div className="mt-2 truncate font-mono text-[11px] text-nerv-text/80">{masked}</div>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => { setValue(current ?? ''); setEditing(true) }}
            className="shrink-0 rounded-sm border border-nerv-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/50 hover:text-nerv-orange"
          >
            Editar
          </button>
        )}
      </div>
      {editing && (
        <div className="mt-3 space-y-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={mut.isPending}
              className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/25 disabled:opacity-40"
            >
              {mut.isPending ? 'salvando...' : 'salvar'}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(current ?? '') }}
              className="rounded-sm border border-nerv-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-line/70 hover:text-nerv-text"
            >
              cancelar
            </button>
            {current && (
              <button
                onClick={clear}
                disabled={mut.isPending}
                className="ml-auto rounded-sm border border-nerv-red/40 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10 disabled:opacity-40"
              >
                remover
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function GamesTab({ groupId }: { groupId: string }) {
  const games = useGames(groupId)
  const archive = useArchiveGame(groupId)
  const toast = useToast()
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const [bulkConfirm, setBulkConfirm] = useState(false)

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (games.data ?? []).filter((g) => !g.archived_at)
  const filtered = query ? list.filter((g) => norm(g.name).includes(query)) : list

  const toggleOne = (gid: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(gid)) next.delete(gid)
      else next.add(gid)
      return next
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((g) => g.id)))
  }

  const deleteOne = async (g: Game) => {
    try {
      await archive.mutateAsync(g.id)
      toast.success(`${g.name} apagado`)
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(g.id)
        return n
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao apagar')
    }
  }

  const deleteBulk = async () => {
    const ids = Array.from(selected)
    let ok = 0
    let fail = 0
    // paraleliza, mas captura falhas individuais
    await Promise.all(
      ids.map(async (gid) => {
        try {
          await archive.mutateAsync(gid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(`${ok} jogo${ok === 1 ? '' : 's'} apagado${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagados, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  if (games.isLoading) return <Loading />
  if (games.error) return <ErrorBox error={games.error} />

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Games do grupo</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Lista completa. Use busca pra filtrar, selecione varios pra apagar em lote.
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
          placeholder="buscar jogo..."
          className="h-8 min-w-[180px] flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
        />
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            {selected.size === filtered.length ? 'limpar' : 'tudo'}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setBulkConfirm(true)}
            className="rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10"
          >
            apagar {selected.size}
          </button>
        )}
      </div>

      {bulkConfirm && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
          <p className="text-xs text-nerv-red">
            apagar {selected.size} jogo{selected.size === 1 ? '' : 's'}? nao da pra desfazer.
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">
              cancelar
            </button>
            <button
              onClick={deleteBulk}
              disabled={archive.isPending}
              className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
            >
              sim, apagar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-nerv-dim">
          {q ? `nenhum jogo pra "${q}"` : 'nenhum jogo ainda'}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-nerv-line/30">
          {filtered.map((g) => {
            const on = selected.has(g.id)
            const confirming = pendingDelete === g.id
            return (
              <div key={g.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(g.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-nerv-orange"
                />
                {g.cover_url ? (
                  <img src={g.cover_url} alt="" className="h-8 w-14 shrink-0 rounded-sm object-cover" />
                ) : (
                  <div className="h-8 w-14 shrink-0 rounded-sm bg-nerv-line/20" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm text-nerv-text">{g.name}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {g.viability.interest_want_count}w · {g.viability.ownership_count}own
                  </div>
                </div>
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => setPendingDelete(null)}
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:text-nerv-text"
                    >
                      cancelar
                    </button>
                    <button
                      onClick={() => deleteOne(g)}
                      className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red"
                    >
                      confirmar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(g.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
                  >
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

function VotesTab({ groupId }: { groupId: string }) {
  const votes = useVotes(groupId)
  const del = useDeleteVote(groupId)
  const toast = useToast()
  const qc = useQueryClient()
  const games = useGames(groupId)
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkConfirm, setBulkConfirm] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)

  const gameName = (gid: string | null) => {
    if (!gid) return null
    return games.data?.find((g) => g.id === gid)?.name ?? null
  }

  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const query = norm(q.trim())
  const list = (votes.data ?? []).slice().sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const filtered = query ? list.filter((v) => norm(v.title).includes(query)) : list

  const toggleOne = (vid: string) => {
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(vid)) n.delete(vid)
      else n.add(vid)
      return n
    })
  }
  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map((v) => v.id)))
  }

  const deleteOne = async (vid: string) => {
    try {
      await del.mutateAsync(vid)
      toast.success('votacao apagada')
      setPendingDelete(null)
      setSelected((prev) => {
        const n = new Set(prev)
        n.delete(vid)
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
      ids.map(async (vid) => {
        try {
          await del.mutateAsync(vid)
          ok += 1
        } catch {
          fail += 1
        }
      }),
    )
    if (fail === 0) toast.success(`${ok} votacao${ok === 1 ? '' : 'es'} apagada${ok === 1 ? '' : 's'}`)
    else toast.error(`${ok} apagadas, ${fail} falharam`)
    setSelected(new Set())
    setBulkConfirm(false)
  }

  const forceClose = async (vid: string) => {
    try {
      await closeVote(groupId, vid)
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'votes'] })
      qc.invalidateQueries({ queryKey: ['groups', groupId, 'current-game', 'audit'] })
      toast.success('votacao encerrada')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  if (votes.isLoading) return <Loading />
  if (votes.error) return <ErrorBox error={votes.error} />

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Votacoes do grupo</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Historico completo. Apagar votacao limpa stages e ballots via cascade.
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
          placeholder="buscar votacao..."
          className="h-8 min-w-[180px] flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
        />
        {filtered.length > 0 && (
          <button
            onClick={toggleAll}
            className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text"
          >
            {selected.size === filtered.length ? 'limpar' : 'tudo'}
          </button>
        )}
        {selected.size > 0 && (
          <button
            onClick={() => setBulkConfirm(true)}
            className="rounded-sm border border-nerv-red/40 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10"
          >
            apagar {selected.size}
          </button>
        )}
      </div>

      {bulkConfirm && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
          <p className="text-xs text-nerv-red">
            apagar {selected.size} votacao{selected.size === 1 ? '' : 'es'}? nao da pra desfazer.
          </p>
          <div className="flex shrink-0 gap-2">
            <button onClick={() => setBulkConfirm(false)} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-text">cancelar</button>
            <button
              onClick={deleteBulk}
              disabled={del.isPending}
              className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
            >
              sim, apagar
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="mt-4 py-6 text-center text-[11px] text-nerv-dim">
          {q ? `nenhuma votacao pra "${q}"` : 'nenhuma votacao ainda'}
        </div>
      ) : (
        <div className="mt-4 divide-y divide-nerv-line/30">
          {filtered.map((v) => {
            const on = selected.has(v.id)
            const confirming = pendingDelete === v.id
            const statusColor =
              v.status === 'open' ? 'text-nerv-green' : v.status === 'closed' ? 'text-nerv-dim' : 'text-nerv-amber'
            const winner = gameName(v.winner_game_id)
            return (
              <div key={v.id} className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggleOne(v.id)}
                  className="h-3.5 w-3.5 shrink-0 accent-nerv-orange"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{v.title}</span>
                    <span className={`font-mono text-[9px] uppercase tracking-wider ${statusColor}`}>{v.status}</span>
                  </div>
                  <div className="truncate font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {v.candidate_game_ids.length} cand · {v.ballots_count}/{v.eligible_voter_count} votos
                    {winner && <span className="text-nerv-orange"> · winner: {winner}</span>}
                  </div>
                </div>
                {v.status === 'open' && !confirming && (
                  <button
                    onClick={() => forceClose(v.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-amber/60 hover:text-nerv-amber"
                  >
                    encerrar
                  </button>
                )}
                {confirming ? (
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => setPendingDelete(null)} className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim">cancelar</button>
                    <button onClick={() => deleteOne(v.id)} className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-2 py-1 font-mono text-[10px] text-nerv-red">confirmar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(v.id)}
                    className="shrink-0 rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
                  >
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

function SessionsTab({ groupId }: { groupId: string }) {
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

function ThemesTab({ groupId }: { groupId: string }) {
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

function TabPlaceholder({ label, note }: { label: string; note: string }) {
  return (
    <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-8 text-center">
      <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">{label}</div>
      <div className="mt-2 text-xs text-nerv-dim/80">{note}</div>
    </section>
  )
}

function OverviewCounters({
  games, members, votes, sessions, themes, onJump,
}: {
  games: number
  members: number
  votes: number
  sessions: number
  themes: number
  onJump: (t: AdminTab) => void
}) {
  const cards: { key: AdminTab; label: string; value: number }[] = [
    { key: 'games', label: 'games', value: games },
    { key: 'members', label: 'membros', value: members },
    { key: 'votes', label: 'votes', value: votes },
    { key: 'sessions', label: 'sessoes', value: sessions },
    { key: 'themes', label: 'temas', value: themes },
  ]
  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <button
          key={c.key}
          onClick={() => onJump(c.key)}
          className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-4 text-left transition-colors hover:border-nerv-orange/40"
        >
          <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">{c.label}</div>
          <div className="mt-1 font-display text-2xl tabular-nums text-nerv-text">{c.value}</div>
        </button>
      ))}
    </section>
  )
}
