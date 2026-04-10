import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  useArchiveGame,
  useGame,
  useGameOwners,
  useSetInterest,
  useToggleOwnership,
  useUpdateGame,
} from '@/features/games/hooks'
import { useGroup } from '@/features/groups/hooks'
import { useMe } from '@/features/auth/hooks'
import type { GameStage, HardwareTier } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EnergyBar } from '@/components/nerv/EnergyBar'
import { Avatar } from '@/components/nerv/Avatar'
import { useToast } from '@/components/ui/toast'
import { formatPlayers } from '@/lib/players'
import { steamGetDetails } from '@/features/steam/api'
import { steamCover, steamHeaderLarge } from '@/lib/steamCover'
import { SIGNALS, STAGES, TIERS } from '@/lib/constants'

export function GameDetailPage() {
  const { id = '', gameId = '' } = useParams()
  const game = useGame(id, gameId)
  const owners = useGameOwners(gameId)
  const setInt = useSetInterest(id)
  const toggleOwn = useToggleOwnership(id)
  const update = useUpdateGame(id, gameId)
  const archive = useArchiveGame(id)
  const group = useGroup(id)
  const me = useMe()
  const navigate = useNavigate()
  const toast = useToast()
  const canManage =
    !!me.data?.is_sys_admin ||
    group.data?.user_role === 'admin' ||
    group.data?.user_role === 'mod'
  const [editing, setEditing] = useState(false)
  const [edit, setEdit] = useState({
    name: '',
    description: '',
    is_free: false,
    price_current: '',
    player_min: 1,
    player_max: null as number | null,
    min_hardware_tier: 'unknown' as HardwareTier,
  })

  const startEdit = () => {
    if (!game.data) return
    setEdit({
      name: game.data.name,
      description: game.data.description ?? '',
      is_free: game.data.is_free,
      price_current: game.data.price_current?.toString() ?? '',
      player_min: game.data.player_min,
      player_max: game.data.player_max,
      min_hardware_tier: game.data.min_hardware_tier,
    })
    setEditing(true)
  }

  const saveEdit = async () => {
    try {
      await update.mutateAsync({
        name: edit.name,
        description: edit.description || null,
        is_free: edit.is_free,
        price_current: edit.is_free ? 0 : edit.price_current ? Number(edit.price_current) : null,
        player_min: edit.player_min,
        player_max: edit.player_max,
        min_hardware_tier: edit.min_hardware_tier,
      })
      setEditing(false)
      toast.success('jogo atualizado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao salvar')
    }
  }

  if (game.isLoading) return <Loading />
  if (game.error) return <ErrorBox error={game.error} />
  if (!game.data) return null

  const g = game.data
  const v = g.viability
  const hero = steamHeaderLarge(g.steam_appid) ?? steamCover(g)

  const refreshFromSteam = async () => {
    if (!g.steam_appid) return
    try {
      const d = await steamGetDetails(g.steam_appid)
      await update.mutateAsync({
        player_min: d.player_min ?? g.player_min,
        player_max: d.player_max ?? g.player_max,
        min_hardware_tier: d.hardware_tier !== 'unknown' ? d.hardware_tier : g.min_hardware_tier,
        description: d.short_description ?? g.description,
        price_current: d.price != null ? d.price / 100 : g.price_current,
        developer: d.developer ?? g.developer,
        release_date: d.release_date ?? g.release_date,
        metacritic_score: d.metacritic_score ?? g.metacritic_score,
        price_original: d.price_initial != null ? d.price_initial / 100 : g.price_original,
        discount_percent: d.discount_percent ?? g.discount_percent,
      })
      toast.success('atualizado da steam')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao atualizar')
    }
  }

  const setStage = async (s: GameStage) => {
    try {
      await update.mutateAsync({ stage: s })
      toast.success('estágio atualizado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-wider text-nerv-dim">
        <Link to={`/groups/${id}/games`} className="text-nerv-dim/70 hover:text-nerv-orange">biblioteca</Link>
        <div className="flex gap-3">
          {g.steam_appid && (
            <button onClick={refreshFromSteam} className="hover:text-nerv-orange">atualizar da steam</button>
          )}
          {canManage && (
            <button onClick={editing ? () => setEditing(false) : startEdit} className="hover:text-nerv-orange">
              {editing ? 'cancelar' : 'editar'}
            </button>
          )}
          {canManage && (
            <button
              onClick={async () => {
                if (!confirm(`Remover "${g.name}" da biblioteca? Essa ação não dá pra desfazer.`)) return
                try {
                  await archive.mutateAsync(gameId)
                  toast.success('jogo removido')
                  navigate(`/groups/${id}/games`)
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'falha ao remover')
                }
              }}
              disabled={archive.isPending}
              className="text-nerv-red/80 hover:text-nerv-red disabled:opacity-40"
            >
              {archive.isPending ? 'removendo...' : 'remover'}
            </button>
          )}
        </div>
      </header>

      {editing && (
        <section className="rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5">
          <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">editar jogo</div>
          <div className="space-y-3">
            <input
              value={edit.name}
              maxLength={150}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="nome"
              className="h-8 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none"
            />
            <textarea
              value={edit.description}
              maxLength={2000}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              rows={3}
              placeholder="descricao"
              className="w-full rounded-sm border border-nerv-line bg-black/40 px-2 py-1.5 text-xs focus:border-nerv-orange focus:outline-none"
            />
            <div className="grid grid-cols-12 gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100000"
                disabled={edit.is_free}
                value={edit.is_free ? '' : edit.price_current}
                onChange={(e) => {
                  // limita a 2 casas decimais
                  const v = e.target.value
                  if (v === '' || /^\d+(\.\d{0,2})?$/.test(v)) setEdit({ ...edit, price_current: v })
                }}
                placeholder="R$"
                className="col-span-3 h-8 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none disabled:opacity-40"
              />
              <button
                type="button"
                onClick={() => setEdit({ ...edit, is_free: !edit.is_free })}
                className={`col-span-3 h-8 rounded-sm border text-[10px] uppercase tracking-wider ${
                  edit.is_free ? 'border-nerv-green bg-nerv-green/10 text-nerv-green' : 'border-nerv-line text-nerv-dim hover:border-nerv-green/40'
                }`}
              >
                {edit.is_free ? '✓ free' : 'free?'}
              </button>
              <div className="col-span-6 flex items-center gap-1 rounded-sm border border-nerv-line bg-black/40 px-2 h-8">
                <span className="text-[10px] uppercase text-nerv-dim">players</span>
                <input
                  type="number"
                  min="1"
                  value={edit.player_min}
                  onChange={(e) => setEdit({ ...edit, player_min: Number(e.target.value) || 1 })}
                  className="w-10 bg-transparent text-center text-xs focus:outline-none"
                />
                <span className="text-nerv-dim">-</span>
                <input
                  type="number"
                  min="1"
                  value={edit.player_max ?? ''}
                  onChange={(e) => setEdit({ ...edit, player_max: e.target.value ? Number(e.target.value) : null })}
                  placeholder="∞"
                  className="w-10 bg-transparent text-center text-xs focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-1">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEdit({ ...edit, min_hardware_tier: t })}
                  className={`h-8 flex-1 rounded-sm border text-[10px] uppercase tracking-wider transition-all ${
                    edit.min_hardware_tier === t
                      ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                      : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                  }`}
                >
                  hw: {t}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setEditing(false)}
                className="rounded-sm border border-nerv-line px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-dim hover:border-nerv-orange/40"
              >
                cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={update.isPending || !edit.name}
                className="rounded-sm border border-nerv-orange bg-nerv-orange/10 px-3 py-1.5 text-[10px] uppercase tracking-wider text-nerv-orange hover:bg-nerv-orange/20 disabled:opacity-40"
              >
                {update.isPending ? 'salvando...' : 'salvar'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Hero */}
      <div className="relative overflow-hidden rounded-sm border border-nerv-orange/20 bg-nerv-panel/30">
        {hero && (
          <div className="absolute inset-0">
            <img
              src={hero}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
              className="h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/70 to-transparent" />
          </div>
        )}
        <div className="relative flex items-end gap-4 p-5">
          {steamCover(g) && (
            <img
              src={steamCover(g)!}
              alt=""
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
              className="hidden h-32 w-56 shrink-0 rounded-sm border border-nerv-orange/30 object-cover sm:block"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded-sm border border-nerv-orange/40 px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-orange">{g.stage}</span>
              {g.is_free && (
                <span className="rounded-sm border border-nerv-green/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-nerv-green">free to play</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl text-nerv-text">{g.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-wider text-nerv-dim">
              {g.developer && <span className="text-nerv-text/70">{g.developer}</span>}
              {g.release_date && <span>{g.release_date}</span>}
              {g.metacritic_score != null && (
                <span className={`rounded-sm px-1.5 py-0.5 ${g.metacritic_score >= 75 ? 'bg-nerv-green/15 text-nerv-green' : g.metacritic_score >= 50 ? 'bg-nerv-amber/15 text-nerv-amber' : 'bg-nerv-red/15 text-nerv-red'}`}>
                  metacritic {g.metacritic_score}
                </span>
              )}
              {g.steam_appid && <span>steam #{g.steam_appid}</span>}
              <span>jogadores {formatPlayers(g.player_min, g.player_max, g.tags)}</span>
              <span>hardware {g.min_hardware_tier}</span>
            </div>
            {!g.is_free && g.discount_percent != null && g.discount_percent > 0 && g.price_original && g.price_current && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span className="text-nerv-dim line-through tabular-nums">R$ {g.price_original.toFixed(2)}</span>
                <span className="text-nerv-green tabular-nums">R$ {g.price_current.toFixed(2)}</span>
                <span className="rounded-sm bg-nerv-green/20 px-1.5 py-0.5 text-[10px] text-nerv-green">-{g.discount_percent}%</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* viability */}
        <div className="lg:col-span-2 space-y-4">
          <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">viabilidade</div>
            <div className="mb-4 flex items-baseline gap-3">
              <span className="font-display text-5xl text-nerv-orange tabular-nums nerv-glow">{v.viability_score.toFixed(0)}<span className="text-2xl text-nerv-dim">%</span></span>
              <span className="text-xs text-nerv-dim">
                {v.viability_score >= 75 ? 'forte candidato pra sessão' :
                 v.viability_score >= 50 ? 'bom candidato' :
                 v.viability_score >= 25 ? 'precisa de mais interesse' : 'dificil de viabilizar'}
              </span>
            </div>
            <div className="space-y-2">
              <EnergyBar label="PRICE" value={v.price_score} color="green" />
              <EnergyBar label="HARDWARE" value={v.hardware_fit_percent} color="amber" />
              <EnergyBar label="INTEREST" value={v.interest_score} color="magenta" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-[10px] uppercase tracking-wider text-nerv-dim">
              <div className="rounded-sm border border-nerv-line bg-black/30 p-2">
                <div className="text-nerv-green text-base">{v.interest_want_count}</div>quero
              </div>
              <div className="rounded-sm border border-nerv-line bg-black/30 p-2">
                <div className="text-nerv-amber text-base">{v.interest_ok_count}</div>topo
              </div>
              <div className="rounded-sm border border-nerv-line bg-black/30 p-2">
                <div className="text-nerv-dim text-base">{v.interest_pass_count}</div>passo
              </div>
            </div>
          </section>

          {g.description && (
            <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
              <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-dim">sobre o jogo</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-nerv-text/90">{g.description}</p>
            </section>
          )}

          {(g.genres.length > 0 || g.tags.length > 0) && (
            <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
              <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">categorias</div>
              {g.genres.length > 0 && (
                <div className="mb-3">
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim">gêneros</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.genres.map((x) => (
                      <span key={x} className="rounded-sm border border-nerv-orange/30 bg-nerv-orange/5 px-2 py-0.5 text-[11px] text-nerv-orange">{x}</span>
                    ))}
                  </div>
                </div>
              )}
              {g.tags.length > 0 && (
                <div>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim">tags</div>
                  <div className="flex flex-wrap gap-1.5">
                    {g.tags.map((x) => (
                      <span key={x} className="rounded-sm border border-nerv-line bg-black/30 px-2 py-0.5 text-[11px] text-nerv-dim">{x}</span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </div>

        {/* sidebar */}
        <div className="space-y-4">
          <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">seu status</div>
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[10px] uppercase tracking-wider text-nerv-dim">interesse</div>
                <div className="flex gap-1.5">
                  {SIGNALS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setInt.mutate({ gameId: g.id, signal: s.value })}
                      className={`flex-1 rounded-sm border px-2 py-1.5 text-[10px] uppercase tracking-wider transition-all ${
                        g.user_interest === s.value
                          ? `${s.color} bg-current/10`
                          : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => toggleOwn.mutate({ gameId: g.id, owns: !g.user_owns_game })}
                className={`w-full rounded-sm border px-2 py-2 text-xs uppercase tracking-wider transition-all ${
                  g.user_owns_game
                    ? 'border-nerv-green bg-nerv-green/10 text-nerv-green'
                    : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                }`}
              >
                {g.user_owns_game ? '✓ você tem este jogo' : 'marcar como tenho'}
              </button>
            </div>
          </section>

          <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">estágio do grupo</div>
            <div className="space-y-1">
              {STAGES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`w-full rounded-sm border px-3 py-1.5 text-left text-xs uppercase tracking-wider transition-all ${
                    g.stage === s.value
                      ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                      : 'border-nerv-line text-nerv-dim hover:border-nerv-orange/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">quem tem <span className="text-nerv-orange tabular-nums">{owners.data?.length ?? 0}</span></div>
            {owners.isLoading && <Loading />}
            {owners.data && owners.data.length === 0 && (
              <p className="text-xs text-nerv-dim">ninguem marcou ainda.</p>
            )}
            <div className="space-y-1.5">
              {owners.data?.map((o) => (
                <div key={o.id} className="flex items-center gap-2 rounded-sm border border-nerv-line bg-black/30 px-2 py-1.5">
                  <Avatar discordId={o.discord_id} hash={o.discord_avatar} name={o.discord_display_name ?? o.discord_username} size="sm" />
                  <span className="truncate text-xs text-nerv-text">
                    {o.discord_display_name ?? o.discord_username}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
            <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">ficha</div>
            <dl className="grid grid-cols-2 gap-y-2 text-xs">
              <dt className="text-nerv-dim">preco</dt>
              <dd className="text-right text-nerv-green tabular-nums">{g.is_free ? 'F2P' : g.price_current ? `R$ ${g.price_current.toFixed(2)}` : '?'}</dd>
              <dt className="text-nerv-dim">jogadores</dt>
              <dd className="text-right tabular-nums">{formatPlayers(g.player_min, g.player_max, g.tags)}</dd>
              <dt className="text-nerv-dim">hardware</dt>
              <dd className="text-right text-nerv-amber">{g.min_hardware_tier}</dd>
              {g.steam_appid && <><dt className="text-nerv-dim">steam id</dt><dd className="text-right text-nerv-orange tabular-nums">{g.steam_appid}</dd></>}
            </dl>
          </section>
        </div>
      </div>
    </div>
  )
}
