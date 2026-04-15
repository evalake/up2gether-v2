import type { UseMutationResult } from '@tanstack/react-query'
import type { GroupMember, GroupRole } from '@/features/groups/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { Avatar } from '@/components/nerv/Avatar'
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
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Membros</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Gerencie roles e remoção. Apenas o dono promove/rebaixa outros admins. Mods não aparecem aqui como editáveis.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-nerv-dim">
          <span className="tabular-nums text-nerv-orange">{members?.length ?? 0}</span> total
        </div>
      </div>
      {isLoading && <div className="mt-4"><Loading /></div>}
      {error && <div className="mt-4"><ErrorBox error={error} /></div>}
      <div className="mt-4 divide-y divide-nerv-line/30">
        {members?.map((m) => {
          const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
          const isMe = currentUserId === m.user_id
          const isTargetOwner = ownerUserId === m.user_id
          const canEdit = !isMe && !isTargetOwner
          const canTouchThisRole = isOwner || (m.role !== 'admin')
          const roleColor =
            m.role === 'admin' ? 'text-nerv-orange' : m.role === 'mod' ? 'text-nerv-amber' : 'text-nerv-dim'
          return (
            <div key={m.id} className="flex items-center gap-3 py-3">
              <button type="button" onClick={() => onOpenProfile(m.user_id)} className="shrink-0 transition-transform hover:scale-105" title="ver perfil">
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
              </button>
              <button type="button" onClick={() => onOpenProfile(m.user_id)} className="min-w-0 flex-1 text-left">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-nerv-text transition-colors hover:text-nerv-orange">{name}</span>
                  {isMe && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">você</span>}
                  {isTargetOwner && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-magenta">dono</span>}
                </div>
                <div className={`font-mono text-[9px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
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
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim transition-colors hover:border-nerv-green/60 hover:text-nerv-green"
                      title={m.role === 'mod' ? 'promover pra admin' : 'promover pra mod'}
                    >
                      {m.role === 'mod' ? 'admin' : 'mod'}
                    </button>
                  )}
                  {m.role !== 'member' && (
                    <button
                      onClick={() => demote.mutate(m.user_id)}
                      className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim transition-colors hover:border-nerv-amber/60 hover:text-nerv-amber"
                      title="rebaixar"
                    >
                      -
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm(`remover ${name} do grupo?`)) kick.mutate(m.user_id)
                    }}
                    className="rounded-sm border border-nerv-line px-2 py-1 font-mono text-[10px] text-nerv-dim transition-colors hover:border-nerv-red/60 hover:text-nerv-red"
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
