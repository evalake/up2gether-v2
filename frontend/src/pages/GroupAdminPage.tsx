import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
} from '@/features/groups/hooks'
import { useGames } from '@/features/games/hooks'
import { useVotes } from '@/features/votes/hooks'
import { useSessions } from '@/features/sessions/hooks'
import { useThemes } from '@/features/themes/hooks'
import { useMe } from '@/features/auth/hooks'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'
import { Avatar } from '@/components/nerv/Avatar'
import { GamesTab } from './admin/GamesTab'
import { VotesTab } from './admin/VotesTab'
import { SessionsTab } from './admin/SessionsTab'
import { ThemesTab } from './admin/ThemesTab'
import { WebhookSection } from './admin/WebhookSection'
import { useTitle } from '@/lib/useTitle'

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
  useTitle(group.data ? `admin · ${group.data.name}` : undefined)
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
        <p className="text-sm text-nerv-dim">Voce nao tem permissao pra acessar esse painel.</p>
        <Link to={`/groups/${id}`} className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-orange">
          ← voltar
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
      toast.success('grupo excluido')
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
          <p className="mt-1 text-xs text-nerv-dim">Controles avancados do servidor. So admin e sysadmin veem.</p>
        </div>
        <Link
          to={`/groups/${id}`}
          className="text-[11px] uppercase tracking-wider text-nerv-dim hover:text-nerv-orange"
        >
          ← voltar
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
              Por padrao, o game da vez vira o vencedor da ultima votacao. Aqui voce pode travar manualmente, destravar ou trocar a qualquer momento.
            </p>
            {currentGame.data ? (
              <div className="mt-3 flex items-center gap-3">
                {currentGame.data.cover_url && (
                  <img src={currentGame.data.cover_url} alt="" className="h-14 w-24 rounded-sm border border-nerv-green/30 object-cover" />
                )}
                <div className="min-w-0">
                  <div className="truncate font-display text-base text-nerv-text">{currentGame.data.name}</div>
                  <div className="mt-0.5 font-mono text-[9px] uppercase tracking-wider text-nerv-dim">
                    {currentGame.data.source === 'manual' ? 'travado manual' : 'definido por votacao'}
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
              className="shrink-0 rounded-sm border border-nerv-red/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red hover:bg-nerv-red/10 disabled:opacity-40"
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
              Puxa icone, banner, splash e descricao direto do servidor no Discord. Banner/splash so aparecem se o servidor tiver esses recursos habilitados (boosts).
            </p>
            <div className="mt-3 flex items-center gap-3">
              {group.data.icon_url && (
                <img src={group.data.icon_url} alt="" className="h-12 w-12 rounded-sm border border-nerv-line object-cover" />
              )}
              <div className="flex flex-col gap-0.5 text-[10px] text-nerv-dim">
                <span>icone: {group.data.icon_url ? 'ok' : '--'}</span>
                <span>banner: {group.data.banner_url ? 'ok' : '--'}</span>
                <span>splash: {group.data.splash_url ? 'ok' : '--'}</span>
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
            className="shrink-0 rounded-sm border border-nerv-orange/60 bg-nerv-orange/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-40"
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
              Gerencie roles e remocao. Apenas o dono promove/rebaixa outros admins. Mods nao aparecem aqui como editaveis.
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
            const canTouchThisRole = isOwner || (m.role !== 'admin')
            const roleColor =
              m.role === 'admin' ? 'text-nerv-orange' : m.role === 'mod' ? 'text-nerv-amber' : 'text-nerv-dim'
            return (
              <div key={m.id} className="flex items-center gap-3 py-3">
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-nerv-text">{name}</span>
                    {isMe && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">voce</span>}
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
                            toast.error('so o dono pode promover a admin')
                            return
                          }
                          promote.mutate({ userId: m.user_id, role: next })
                        }}
                        className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-green/60 hover:text-nerv-green"
                        title={m.role === 'mod' ? 'promover pra admin' : 'promover pra mod'}
                      >
                        {m.role === 'mod' ? 'admin' : 'mod'}
                      </button>
                    )}
                    {m.role !== 'member' && (
                      <button
                        onClick={() => demote.mutate(m.user_id)}
                        className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-amber/60 hover:text-nerv-amber"
                        title="rebaixar"
                      >
                        -
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm(`remover ${name} do grupo?`)) kick.mutate(m.user_id)
                      }}
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim hover:border-nerv-red/60 hover:text-nerv-red"
                      title="remover do grupo"
                    >
                      x
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
              <p className="mt-0.5 text-[11px] text-nerv-dim">Acoes irreversiveis. So o dono do servidor ve.</p>
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
                Apaga jogos, votacoes, temas e sessoes. Mantem grupo e membros. Tem certeza?
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
                Apaga o servidor e tudo dentro. Nao da pra desfazer. Tem certeza?
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
