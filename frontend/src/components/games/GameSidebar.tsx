import type { UseMutationResult } from '@tanstack/react-query'
import type { Game, GameOwner, GameStage, GameUpdateInput } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { Avatar } from '@/components/nerv/Avatar'
import { useToast } from '@/components/ui/toast'
import { formatPlayers } from '@/lib/players'
import { SIGNALS, STAGES } from '@/lib/constants'

export function GameSidebar({
  game,
  owners,
  ownersLoading,
  onOpenProfile,
  onSetInterest,
  onToggleOwnership,
  setInterestPending,
  toggleOwnPending,
  update,
}: {
  game: Game
  owners: GameOwner[] | undefined
  ownersLoading: boolean
  onOpenProfile: (userId: string) => void
  onSetInterest: (gameId: string, signal: string) => void
  onToggleOwnership: (gameId: string, owns: boolean) => void
  setInterestPending: boolean
  toggleOwnPending: boolean
  update: UseMutationResult<Game, Error, GameUpdateInput>
}) {
  const toast = useToast()
  const g = game

  const setStage = async (s: GameStage) => {
    try {
      await update.mutateAsync({ stage: s })
      toast.success('estágio atualizado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha')
    }
  }

  return (
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
                  disabled={setInterestPending}
                  onClick={() => onSetInterest(g.id, s.value)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-[10px] uppercase tracking-wider transition-all disabled:opacity-40 ${
                    g.user_interest === s.value
                      ? `${s.color} bg-current/10`
                      : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <button
            disabled={toggleOwnPending}
            onClick={() => onToggleOwnership(g.id, !g.user_owns_game)}
            className={`w-full rounded-sm border px-2 py-2 text-xs uppercase tracking-wider transition-all disabled:opacity-40 ${
              g.user_owns_game
                ? 'border-nerv-green bg-nerv-green/10 text-nerv-green'
                : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
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
                  : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-sm border border-nerv-line/40 bg-nerv-panel/20 p-5">
        <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">quem tem <span className="text-nerv-orange tabular-nums">{owners?.length ?? 0}</span></div>
        {ownersLoading && <Loading />}
        {owners && owners.length === 0 && (
          <p className="text-xs text-nerv-dim">ninguém marcou ainda.</p>
        )}
        <div className="space-y-1.5">
          {owners?.map((o) => (
            <button
              key={o.id}
              onClick={() => onOpenProfile(o.id)}
              className="flex w-full items-center gap-2 rounded-sm border border-nerv-line bg-black/30 px-2 py-1.5 text-left transition-colors hover:border-nerv-orange/40 hover:bg-black/40"
              title={o.discord_display_name ?? o.discord_username}
            >
              <Avatar discordId={o.discord_id} hash={o.discord_avatar} name={o.discord_display_name ?? o.discord_username} size="sm" />
              <span className="truncate text-xs text-nerv-text">
                {o.discord_display_name ?? o.discord_username}
              </span>
            </button>
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
          {g.source && <><dt className="text-nerv-dim">fonte</dt><dd className="text-right text-nerv-magenta">{g.source}</dd></>}
        </dl>
      </section>
    </div>
  )
}
