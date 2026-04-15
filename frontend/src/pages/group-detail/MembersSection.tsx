import { motion } from 'framer-motion'
import type { GroupMember, GroupRole } from '@/features/groups/api'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
}

type Props = {
  members: GroupMember[] | undefined
  isLoading: boolean
  error: Error | null
  isAdmin: boolean
  meId?: string
  onOpenProfile: (userId: string) => void
  onPromote: (userId: string, role: GroupRole) => void
  onDemote: (userId: string) => void
  onKick: (userId: string, name: string) => void
}

export function MembersSection({ members, isLoading, error, isAdmin, meId, onOpenProfile, onPromote, onDemote, onKick }: Props) {
  return (
    <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="space-y-3">
      <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.2em] text-nerv-dim">
        <span>tripulação</span>
        <span className="tabular-nums text-nerv-orange">{members?.length ?? 0}</span>
      </div>
      {isLoading && <Loading />}
      {error && <ErrorBox error={error} />}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m, i) => {
          const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
          const isMe = meId === m.user_id
          const roleColor =
            m.role === 'admin' ? 'text-nerv-orange' : m.role === 'mod' ? 'text-nerv-amber' : 'text-nerv-dim'
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.03 }}
              className="group flex items-center gap-3 rounded-sm border border-nerv-line/40 bg-nerv-panel/20 px-3 py-2.5 transition-all hover:border-nerv-orange/40 hover:bg-nerv-panel/40"
            >
              <button
                type="button"
                onClick={() => onOpenProfile(m.user_id)}
                className="shrink-0 rounded-full transition-transform hover:scale-105"
                title="ver perfil"
              >
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
              </button>
              <button
                type="button"
                onClick={() => onOpenProfile(m.user_id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-nerv-text transition-colors hover:text-nerv-orange">{name}</span>
                  {isMe && <span className="font-mono text-[9px] uppercase tracking-wider text-nerv-orange">você</span>}
                </div>
                <div className={`font-mono text-[9px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
              </button>
              {isAdmin && !isMe && (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {m.role !== 'admin' && (
                    <button
                      onClick={() => onPromote(m.user_id, m.role === 'mod' ? 'admin' : 'mod')}
                      className="rounded px-1 py-0.5 font-mono text-[10px] text-nerv-dim transition-all hover:bg-nerv-green/15 hover:text-nerv-green"
                      title="promover"
                    >
                      ↑
                    </button>
                  )}
                  {m.role !== 'member' && (
                    <button
                      onClick={() => onDemote(m.user_id)}
                      className="rounded px-1 py-0.5 font-mono text-[10px] text-nerv-dim transition-all hover:bg-nerv-amber/15 hover:text-nerv-amber"
                      title="rebaixar"
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => onKick(m.user_id, name)}
                    className="rounded px-1 py-0.5 font-mono text-[10px] text-nerv-dim transition-all hover:bg-nerv-red/15 hover:text-nerv-red"
                    title="remover"
                  >
                    ×
                  </button>
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </motion.section>
  )
}
