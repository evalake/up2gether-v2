import type { UseMutationResult } from '@tanstack/react-query'
import type { Game, GameOwner, GameStage, GameUpdateInput } from '@/features/games/api'
import { Loading } from '@/components/ui/Loading'
import { Avatar } from '@/components/core/Avatar'
import { useToast } from '@/components/ui/toast'
import { STAGES, STAGE_COLOR, STAGE_BORDER } from '@/lib/constants'

export function GameSidebar({
  game,
  owners,
  ownersLoading,
  memberCount,
  canManage,
  onOpenProfile,
  update,
}: {
  game: Game
  owners: GameOwner[] | undefined
  ownersLoading: boolean
  memberCount?: number
  canManage: boolean
  onOpenProfile: (userId: string) => void
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

  const ownerPct =
    memberCount != null && owners && owners.length > 0
      ? Math.min(100, Math.round((owners.length / Math.max(1, memberCount)) * 100))
      : 0

  return (
    <div className="space-y-4">
      <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-4">
        <div className="mb-2.5 text-[11px] uppercase tracking-wider text-up-dim">
          {owners && owners.length > 0
            ? <span><span className="text-up-orange tabular-nums">{owners.length}</span> {owners.length === 1 ? 'pessoa' : 'pessoas'}{memberCount != null ? ` de ${memberCount}` : ''} no servidor {owners.length === 1 ? 'tem' : 'têm'} este jogo</span>
            : <span>ninguém tem este jogo ainda</span>
          }
        </div>
        {memberCount != null && memberCount > 4 && owners && owners.length > 0 && (
          <div className="mb-2.5 h-1 overflow-hidden rounded-full bg-up-line/30">
            <div className="h-full bg-up-orange" style={{ width: `${ownerPct}%` }} />
          </div>
        )}
        {ownersLoading && <Loading />}
        <div className="space-y-1">
          {owners?.map((o) => (
            <button
              key={o.id}
              onClick={() => onOpenProfile(o.id)}
              className="flex w-full items-center gap-2 rounded-sm border border-up-line bg-black/30 px-2 py-1.5 text-left transition-colors hover:border-up-orange hover:bg-black/40"
              title={o.discord_display_name ?? o.discord_username}
            >
              <Avatar discordId={o.discord_id} hash={o.discord_avatar} name={o.discord_display_name ?? o.discord_username} size="sm" />
              <span className="truncate text-xs text-up-text">
                {o.discord_display_name ?? o.discord_username}
              </span>
            </button>
          ))}
        </div>
      </section>

      {canManage && (
        <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-4">
          <div className="mb-2 text-[10px] uppercase tracking-wider text-up-dim">
            alterar estágio
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((s) => {
              const active = g.stage === s.value
              const color = STAGE_COLOR[s.value] ?? 'text-up-dim'
              const border = STAGE_BORDER[s.value] ?? 'border-up-dim'
              return (
                <button
                  key={s.value}
                  onClick={() => setStage(s.value)}
                  className={`min-h-[44px] rounded-sm border px-2.5 py-1 text-[10px] uppercase tracking-wider transition-colors sm:min-h-0 ${
                    active
                      ? `${color} ${border} bg-current/10`
                      : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
                  }`}
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </section>
      )}
    </div>
  )
}
