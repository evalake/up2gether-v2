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
  groupKey,
} from '@/features/groups/hooks'
import { useGames } from '@/features/games/hooks'
import { useMe } from '@/features/auth/hooks'
import { updateWebhook } from '@/features/groups/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { useToast } from '@/components/ui/toast'

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
  const [gameSearch, setGameSearch] = useState('')
  const toast = useToast()
  const [confirmKind, setConfirmKind] = useState<null | 'reset' | 'destroy'>(null)

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

      <WebhookSection groupId={group.data.id} current={group.data.webhook_url} />

      {isOwner && (
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
