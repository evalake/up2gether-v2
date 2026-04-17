import type { UseMutationResult } from '@tanstack/react-query'
import type { GroupMember, GroupRole } from '@/features/groups/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { Avatar } from '@/components/core/Avatar'
import { useToast } from '@/components/ui/toast'

export function MembersTab({
  members,
  isLoading,
  error,
  currentUserId,
  ownerUserId,
  isOwner,
  onOpenProfile,
  promote,
  demote,
  kick,
}: {
  members: GroupMember[] | undefined
  isLoading: boolean
  error: Error | null
  currentUserId: string | undefined
  ownerUserId: string | null
  isOwner: boolean
  onOpenProfile: (userId: string) => void
  promote: UseMutationResult<unknown, Error, { userId: string; role: GroupRole }>
  demote: UseMutationResult<unknown, Error, string>
  kick: UseMutationResult<unknown, Error, string>
}) {
  const toast = useToast()

  return (
    <section className="rounded-sm border border-up-orange/15 bg-up-panel/30 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-up-dim">Membros</div>
          <p className="mt-1 text-[11px] text-up-dim">
            Gerencie roles e remoção. Apenas o dono promove/rebaixa outros admins. Mods não aparecem aqui como editáveis.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">
          <span className="tabular-nums text-up-orange">{members?.length ?? 0}</span> total
        </div>
      </div>
      {isLoading && <div className="mt-4"><Loading /></div>}
      {error && <div className="mt-4"><ErrorBox error={error} /></div>}
      <div className="mt-4 divide-y divide-up-line/30">
        {members?.map((m) => {
          const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
          const isMe = currentUserId === m.user_id
          const isTargetOwner = ownerUserId === m.user_id
          const canEdit = !isMe && !isTargetOwner
          const canTouchThisRole = isOwner || (m.role !== 'admin')
          const roleColor =
            m.role === 'admin' ? 'text-up-orange' : m.role === 'mod' ? 'text-up-amber' : 'text-up-dim'
          return (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <button type="button" onClick={() => onOpenProfile(m.user_id)} className="shrink-0 transition-transform hover:scale-105" title="ver perfil">
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
              </button>
              <button type="button" onClick={() => onOpenProfile(m.user_id)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-up-text transition-colors hover:text-up-orange">{name}</span>
                  {isMe && <span className="font-mono text-[10px] uppercase tracking-wider text-up-orange">você</span>}
                  {isTargetOwner && <span className="font-mono text-[10px] uppercase tracking-wider text-up-magenta">dono</span>}
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
              </button>
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
                      className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:border-up-green/60 hover:text-up-green"
                      title={m.role === 'mod' ? 'promover pra admin' : 'promover pra mod'}
                    >
                      {m.role === 'mod' ? 'admin' : 'mod'}
                    </button>
                  )}
                  {m.role !== 'member' && (
                    <button
                      onClick={() => demote.mutate(m.user_id)}
                      className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:border-up-amber/60 hover:text-up-amber"
                      title="rebaixar"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`remover ${name} do grupo?`)) kick.mutate(m.user_id)
                    }}
                    className="rounded-sm border border-up-line px-2 py-1 font-mono text-[10px] text-up-dim transition-colors hover:border-up-red/60 hover:text-up-red"
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
  )
}
