import { motion } from 'framer-motion'
import { useT } from '@/i18n'
import type { GroupMember, GroupRole } from '@/features/groups/api'
import { Avatar } from '@/components/core/Avatar'
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
  const t = useT()
  return (
    <motion.section {...fadeUp} transition={{ duration: 0.4, delay: 0.3 }} className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-dim">
        {t.groupDetail.crew(members?.length ?? 0)}
      </div>
      {isLoading && <Loading />}
      {error && <ErrorBox error={error} />}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {members?.map((m, i) => {
          const name = m.user?.discord_display_name ?? m.user?.discord_username ?? m.user_id
          const isMe = meId === m.user_id
          const roleColor =
            m.role === 'admin' ? 'text-up-orange' : m.role === 'mod' ? 'text-up-amber' : 'text-up-dim'
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.35 + i * 0.03 }}
              className="group flex items-center gap-3 rounded-sm border border-up-line bg-up-panel/20 px-3 py-2.5 transition-colors hover:border-up-orange hover:bg-up-panel/50"
            >
              <button
                type="button"
                onClick={() => onOpenProfile(m.user_id)}
                className="shrink-0 rounded-full transition-transform hover:scale-105"
                title={t.groupDetail.viewProfile}
              >
                <Avatar discordId={m.user?.discord_id} hash={m.user?.discord_avatar} name={name} size="sm" />
              </button>
              <button
                type="button"
                onClick={() => onOpenProfile(m.user_id)}
                className="min-w-0 flex-1 text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-up-text transition-colors hover:text-up-orange">{name}</span>
                  {isMe && <span className="font-mono text-[10px] uppercase tracking-wider text-up-orange">{t.groupDetail.you}</span>}
                </div>
                <div className={`font-mono text-[10px] uppercase tracking-wider ${roleColor}`}>{m.role}</div>
              </button>
              {isAdmin && !isMe && (
                <div className="flex gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  {m.role !== 'admin' && (
                    <button
                      onClick={() => onPromote(m.user_id, m.role === 'mod' ? 'admin' : 'mod')}
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] text-up-dim transition-colors hover:bg-up-green/20 hover:text-up-green"
                      title={t.groupDetail.promote}
                    >
                      ↑
                    </button>
                  )}
                  {m.role !== 'member' && (
                    <button
                      onClick={() => onDemote(m.user_id)}
                      className="rounded px-1.5 py-0.5 font-mono text-[10px] text-up-dim transition-colors hover:bg-up-amber/20 hover:text-up-amber"
                      title={t.groupDetail.demote}
                    >
                      ↓
                    </button>
                  )}
                  <button
                    onClick={() => onKick(m.user_id, name)}
                    className="rounded px-1.5 py-0.5 font-mono text-[10px] text-up-dim transition-colors hover:bg-up-red/20 hover:text-up-red"
                    title={t.common.remove}
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
