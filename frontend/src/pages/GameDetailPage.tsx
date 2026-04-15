import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
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
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EnergyBar } from '@/components/nerv/EnergyBar'
import { useToast } from '@/components/ui/toast'
import { steamGetDetails, builtinGetDetails } from '@/features/steam/api'
import { useTitle } from '@/lib/useTitle'
import { MemberProfileModal } from '@/components/members/MemberProfileModal'
import { GameEditForm } from '@/components/games/GameEditForm'
import { GameHero } from '@/components/games/GameHero'
import { GameSidebar } from '@/components/games/GameSidebar'

export function GameDetailPage() {
  const { id = '', gameId = '' } = useParams()
  const game = useGame(id, gameId)
  useTitle(game.data?.name)
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
  const [profileUserId, setProfileUserId] = useState<string | null>(null)

  if (game.isLoading) return <Loading />
  if (game.error) return <ErrorBox error={game.error} />
  if (!game.data) return null

  const g = game.data
  const v = g.viability

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

  const builtinSlug = g.source && g.source !== 'steam' && g.source !== 'manual'
    ? g.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    : null

  const refreshFromCatalog = async () => {
    if (!builtinSlug) return
    try {
      const b = await builtinGetDetails(builtinSlug, g.name)
      await update.mutateAsync({
        cover_url: b.cover_url,
        description: b.description ?? g.description,
        player_min: b.player_min ?? g.player_min,
        player_max: b.player_max ?? g.player_max,
        min_hardware_tier: b.min_hardware_tier ?? g.min_hardware_tier,
        developer: b.developer ?? g.developer,
        release_date: b.release_date ?? g.release_date,
      })
      toast.success('atualizado do catalogo')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao atualizar')
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-wider text-nerv-dim">
        <Link to={`/groups/${id}/games`} className="text-nerv-dim/70 transition-colors hover:text-nerv-orange">biblioteca</Link>
        <div className="flex gap-3">
          {g.steam_appid && (
            <button onClick={refreshFromSteam} className="transition-colors hover:text-nerv-orange">atualizar da steam</button>
          )}
          {builtinSlug && (
            <button onClick={refreshFromCatalog} className="transition-colors hover:text-nerv-orange">atualizar do catalogo</button>
          )}
          {canManage && (
            <button onClick={() => setEditing((v) => !v)} className="transition-colors hover:text-nerv-orange">
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
              className="text-nerv-red/80 transition-colors hover:text-nerv-red disabled:opacity-40"
            >
              {archive.isPending ? 'removendo...' : 'remover'}
            </button>
          )}
        </div>
      </header>

      <AnimatePresence>
        {editing && <GameEditForm game={g} update={update} onClose={() => setEditing(false)} />}
      </AnimatePresence>

      <GameHero game={g} />

      <div className="grid gap-4 lg:grid-cols-3">
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
            <div className="mt-4 grid grid-cols-3 gap-3 text-center text-[10px] uppercase tracking-wider text-nerv-dim">
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

        <GameSidebar
          game={g}
          owners={owners.data}
          ownersLoading={owners.isLoading}
          onOpenProfile={setProfileUserId}
          onSetInterest={(gameId, signal) => setInt.mutate({ gameId, signal: signal as 'want' | 'ok' | 'pass' })}
          onToggleOwnership={(gameId, owns) => toggleOwn.mutate({ gameId, owns })}
          setInterestPending={setInt.isPending}
          toggleOwnPending={toggleOwn.isPending}
          update={update}
        />
      </div>
      <MemberProfileModal groupId={id} userId={profileUserId} onClose={() => setProfileUserId(null)} />
    </div>
  )
}
