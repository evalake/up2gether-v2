import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useMemberProfile } from '@/features/groups/hooks'
import { Avatar } from '@/components/nerv/Avatar'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'

type Props = {
  groupId: string
  userId: string | null
  onClose: () => void
}

const ROLE_LABEL: Record<string, string> = {
  admin: 'admin',
  mod: 'mod',
  member: 'membro',
}

const ROLE_CLASS: Record<string, string> = {
  admin: 'border-nerv-red/40 text-nerv-red',
  mod: 'border-nerv-amber/40 text-nerv-amber',
  member: 'border-nerv-orange/30 text-nerv-dim',
}

function fmtDate(iso: string | null) {
  if (!iso) return '---'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtSession(iso: string | null) {
  if (!iso) return '---'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function MemberProfileModal({ groupId, userId, onClose }: Props) {
  const profile = useMemberProfile(groupId, userId)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <AnimatePresence>
      {userId && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            key="panel"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg border border-nerv-orange/25 bg-nerv-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <button
              onClick={onClose}
              aria-label="fechar"
              className="absolute right-3 top-3 z-20 grid h-7 w-7 place-items-center rounded-full bg-black/40 text-nerv-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-nerv-text"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
            </button>

            {profile.isLoading && (
              <div className="p-10"><Loading /></div>
            )}
            {profile.error && (
              <div className="p-6"><ErrorBox error={profile.error} /></div>
            )}
            {profile.data && <Body data={profile.data} groupId={groupId} onNavigate={onClose} />}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Body({ data, groupId, onNavigate }: { data: NonNullable<ReturnType<typeof useMemberProfile>['data']>; groupId: string; onNavigate: () => void }) {
  const { user, role, joined_at, is_sys_admin, stats, top_wants, recent_sessions, steam } = data
  const displayName = user.discord_display_name ?? user.discord_username

  return (
    <div>
      {/* banner */}
      <div className="relative h-20 bg-gradient-to-br from-nerv-orange/25 via-nerv-orange/5 to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_50%,rgba(255,102,0,0.15),transparent_60%)]" />
      </div>

      {/* header */}
      <div className="relative -mt-10 px-5">
        <div className="flex items-end gap-3">
          <div className="rounded-full border-4 border-nerv-panel bg-nerv-panel">
            <Avatar
              discordId={user.discord_id}
              hash={user.discord_avatar}
              name={displayName}
              size="lg"
            />
          </div>
          <div className="min-w-0 flex-1 pb-2">
            <div className="truncate text-lg font-medium text-nerv-text">{displayName}</div>
            <div className="truncate text-xs text-nerv-dim">@{user.discord_username}</div>
          </div>
          <div className={`mb-2 rounded-sm border px-2 py-0.5 text-[10px] uppercase tracking-wider ${ROLE_CLASS[role] ?? ROLE_CLASS.member}`}>
            {is_sys_admin ? 'sys' : ROLE_LABEL[role] ?? role}
          </div>
        </div>
      </div>

      {/* body */}
      <div className="space-y-4 px-5 pb-5 pt-4">
        <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
          no grupo desde {fmtDate(joined_at)}
        </div>

        {/* stats grid */}
        <div className="grid grid-cols-5 gap-1.5">
          <Stat label="hosted" value={stats.sessions_hosted} />
          <Stat label="going" value={stats.sessions_rsvp_going} />
          <Stat label="votes" value={stats.votes_cast} />
          <Stat label="owned" value={stats.games_owned} />
          <Stat label="wants" value={stats.games_wanted} />
        </div>

        {top_wants.length > 0 && (
          <section>
            <h4 className="mb-2 text-[10px] uppercase tracking-wider text-nerv-dim">quer jogar</h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {top_wants.map((w) => (
                <Link
                  key={w.game_id}
                  to={`/groups/${groupId}/games/${w.game_id}`}
                  className="shrink-0 w-20 transition-transform hover:scale-105"
                  title={w.name}
                  onClick={onNavigate}
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-sm border border-nerv-orange/15 bg-black/40">
                    {w.cover_url ? (
                      <img src={w.cover_url} alt="" className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
                    ) : (
                      <div className="grid h-full place-items-center text-[9px] text-nerv-dim">sem capa</div>
                    )}
                  </div>
                  <div className="mt-1 truncate text-[10px] text-nerv-dim">{w.name}</div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {recent_sessions.length > 0 && (
          <section>
            <h4 className="mb-2 text-[10px] uppercase tracking-wider text-nerv-dim">sessoes recentes</h4>
            <ul className="space-y-1.5">
              {recent_sessions.map((s) => (
                <li key={s.id} className="flex items-center gap-2 rounded-sm border border-nerv-orange/10 bg-black/20 px-2 py-1.5 transition-colors hover:border-nerv-orange/30 hover:bg-black/30">
                  <div className="h-8 w-8 shrink-0 overflow-hidden rounded-sm border border-nerv-orange/15 bg-black/40">
                    {s.game_cover_url ? (
                      <img src={s.game_cover_url} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-nerv-text">{s.title}</div>
                    <div className="truncate text-[10px] text-nerv-dim">
                      {s.game_name} // {fmtSession(s.start_at)}
                    </div>
                  </div>
                  {s.hosted ? (
                    <span className="rounded-sm border border-nerv-orange/30 px-1 py-0.5 text-[9px] uppercase text-nerv-orange">host</span>
                  ) : s.rsvp_status ? (
                    <span className="rounded-sm border border-nerv-dim/30 px-1 py-0.5 text-[9px] uppercase text-nerv-dim">{s.rsvp_status}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}

        {steam && (
          <section className="rounded-sm border border-nerv-orange/15 bg-black/20 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-nerv-orange/80">
                  <path d="M12 2C6.5 2 2 6.5 2 12c0 4.6 3.1 8.5 7.4 9.7l3-4.3c-.2-.5-.3-1-.3-1.5 0-1.2.5-2.3 1.3-3.1l-2-4.5c-2.1 0-3.9 1.7-3.9 3.9 0 .7.2 1.4.6 2l1.4-.6c.3-.6.9-1 1.6-1 1 0 1.9.9 1.9 1.9s-.8 1.9-1.9 1.9c-.1 0-.2 0-.3-.1l-1.4.6c.6.8 1.5 1.3 2.6 1.3 1.8 0 3.3-1.5 3.3-3.3 0-.1 0-.3-.1-.4l4.2-3c1.7 0 3-1.3 3-3s-1.3-3-3-3c-1.6 0-3 1.3-3 3v.2l-4.1 3c-.5-.2-1.1-.4-1.7-.4l-2.1-4.5c.9-.4 1.9-.7 3-.7 4 0 7.2 3.2 7.2 7.2s-3.2 7.2-7.2 7.2c-3.4 0-6.2-2.3-7-5.5L2.9 14c.5 4.5 4.4 8 9.1 8 5.5 0 10-4.5 10-10S17.5 2 12 2z"/>
                </svg>
                <span className="font-mono text-[10px] uppercase tracking-wider text-nerv-orange/80">steam</span>
                {steam.persona_name && (
                  <a href={steam.profile_url ?? undefined} target="_blank" rel="noreferrer" className="truncate text-[11px] text-nerv-text transition-colors hover:text-nerv-orange">
                    {steam.persona_name}
                  </a>
                )}
              </div>
              {steam.steam_level != null && (
                <div className="rounded-sm border border-nerv-green/30 bg-nerv-green/10 px-1.5 py-0.5 font-mono text-[9px] text-nerv-green">
                  lvl {steam.steam_level}
                </div>
              )}
            </div>

            <div className="mb-3 grid grid-cols-2 gap-1.5">
              <div className="rounded-sm border border-nerv-orange/15 bg-black/30 px-2 py-1.5">
                <div className="font-mono text-sm tabular-nums text-nerv-orange">{steam.group_total_hours}h</div>
                <div className="text-[9px] uppercase tracking-wider text-nerv-dim">total no grupo</div>
              </div>
              <div className="rounded-sm border border-nerv-orange/15 bg-black/30 px-2 py-1.5">
                <div className="font-mono text-sm tabular-nums text-nerv-amber">{steam.group_hours_2weeks}h</div>
                <div className="text-[9px] uppercase tracking-wider text-nerv-dim">ultimas 2 semanas</div>
              </div>
            </div>

            {steam.top_played.length > 0 && (
              <div className="mb-3">
                <div className="mb-1.5 text-[9px] uppercase tracking-wider text-nerv-dim">mais jogados</div>
                <ul className="space-y-1">
                  {steam.top_played.map((g) => (
                    <li key={g.game_id} className="flex items-center gap-2">
                      <div className="h-6 w-6 shrink-0 overflow-hidden rounded-sm border border-nerv-orange/15 bg-black/40">
                        {g.cover_url ? <img src={g.cover_url} alt="" className="h-full w-full object-cover" /> : null}
                      </div>
                      <span className="min-w-0 flex-1 truncate text-[11px] text-nerv-text">{g.name}</span>
                      <span className="font-mono text-[10px] tabular-nums text-nerv-orange">{g.hours}h</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {steam.recent_games.length > 0 && (
              <div>
                <div className="mb-1.5 text-[9px] uppercase tracking-wider text-nerv-dim">jogando agora (2 sem)</div>
                <ul className="space-y-1">
                  {steam.recent_games.slice(0, 5).map((g) => (
                    <li key={g.appid} className="flex items-center gap-2">
                      {g.img_icon_url ? (
                        <img
                          src={`https://media.steampowered.com/steamcommunity/public/images/apps/${g.appid}/${g.img_icon_url}.jpg`}
                          alt=""
                          className="h-5 w-5 shrink-0 rounded-sm border border-nerv-orange/15"
                        />
                      ) : (
                        <div className="h-5 w-5 shrink-0 rounded-sm border border-nerv-orange/15 bg-black/40" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[11px] text-nerv-text">{g.name}</span>
                      <span className="font-mono text-[10px] tabular-nums text-nerv-amber">
                        {Math.round(g.playtime_2weeks_minutes / 60 * 10) / 10}h
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {top_wants.length === 0 && recent_sessions.length === 0 && !steam && (
          <div className="rounded-sm border border-dashed border-nerv-orange/15 p-4 text-center text-[11px] text-nerv-dim">
            sem atividade recente
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-nerv-orange/15 bg-black/30 px-1 py-2 text-center">
      <div className="font-mono text-base tabular-nums text-nerv-orange">{value}</div>
      <div className="text-[9px] uppercase tracking-wider text-nerv-dim">{label}</div>
    </div>
  )
}
