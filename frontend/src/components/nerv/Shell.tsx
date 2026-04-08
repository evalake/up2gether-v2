import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/features/auth/store'
import { useMe } from '@/features/auth/hooks'
import { useGroup } from '@/features/groups/hooks'
import { Avatar } from './Avatar'
import { NotificationBell } from './NotificationBell'

const TOP_NAV = [
  { label: 'groups', to: '/groups' },
  { label: 'settings', to: '/settings' },
]

const GROUP_NAV = [
  { label: 'overview', slug: '' },
  { label: 'games', slug: '/games' },
  { label: 'votes', slug: '/votes' },
  { label: 'themes', slug: '/themes' },
  { label: 'sessions', slug: '/sessions' },
]

function Clock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs tabular-nums text-nerv-orange/80">
      {now.toLocaleTimeString('pt-BR', { hour12: false })}
    </span>
  )
}

function GroupContext({ groupId }: { groupId: string }) {
  const group = useGroup(groupId)
  const me = useMe()
  const loc = useLocation()
  const sub = loc.pathname.replace(`/groups/${groupId}`, '') || ''
  const isAdmin = group.data?.user_role === 'admin' || group.data?.user_role === 'mod' || !!me.data?.is_sys_admin
  const nav = isAdmin ? [...GROUP_NAV, { label: 'admin', slug: '/admin' }] : GROUP_NAV
  return (
    <div className="border-t border-nerv-orange/15 px-3 py-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-nerv-dim">current group</div>
      <div className="mb-3 truncate text-sm font-medium text-nerv-text">
        {group.data?.name ?? '...'}
      </div>
      <div className="space-y-0.5">
        {nav.map((item) => {
          const active = sub === item.slug
          return (
            <Link
              key={item.slug}
              to={`/groups/${groupId}${item.slug}`}
              className={`block rounded-sm border-l-2 px-2 py-1.5 text-xs lowercase transition-all ${
                active
                  ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                  : 'border-transparent text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-text'
              }`}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  const loc = useLocation()
  const me = useMe()
  const logout = useAuthStore((s) => s.logout)
  const params = useParams<{ id: string }>()
  const inGroup = /^\/groups\/[^/]+/.test(loc.pathname) ? params.id : undefined

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <aside className="flex w-60 shrink-0 flex-col border-r border-nerv-orange/20 bg-nerv-panel/80 backdrop-blur-sm">
        <Link to="/groups" className="flex items-center gap-3 border-b border-nerv-orange/20 p-4">
          <img src="/up2gether-mark.png" alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
          <div className="min-w-0">
            <div className="font-display text-xl leading-none text-nerv-orange">up2gether</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-nerv-dim">
              session ops
            </div>
          </div>
        </Link>

        <nav className="flex-1 overflow-y-auto py-2">
          {TOP_NAV.map((item) => {
            const active = loc.pathname === item.to || loc.pathname.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block border-l-2 px-4 py-2 text-xs lowercase tracking-wider transition-all ${
                  active && !inGroup
                    ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                    : 'border-transparent text-nerv-dim hover:border-nerv-orange/40 hover:text-nerv-text'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          {inGroup && <GroupContext groupId={inGroup} />}
        </nav>

        <div className="border-t border-nerv-orange/20 p-3">
          <div className="flex items-center gap-2">
            <Avatar
              discordId={me.data?.discord_id}
              hash={me.data?.discord_avatar}
              name={me.data?.discord_display_name ?? me.data?.discord_username}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-nerv-text">
                {me.data?.discord_display_name ?? me.data?.discord_username ?? '---'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-nerv-dim">
                {me.data?.is_sys_admin ? (
                  <span className="text-nerv-red">sys_admin // cyberbandolero</span>
                ) : (
                  'online'
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-3 w-full rounded-sm border border-nerv-red/30 px-2 py-1.5 text-[10px] uppercase tracking-wider text-nerv-red/80 transition-all hover:border-nerv-red hover:bg-nerv-red hover:text-nerv-bg"
          >
            disconnect
          </button>
        </div>
      </aside>

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-nerv-orange/15 bg-nerv-panel/80 px-6 py-2.5 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-[11px] lowercase tracking-wider text-nerv-green">
            <span className="inline-block h-1.5 w-1.5 rounded-full nerv-pulse" style={{ background: 'currentColor' }} />
            online
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <Clock />
          </div>
        </header>
        <motion.div
          key={loc.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="flex-1 overflow-y-auto"
        >
          <div className="mx-auto max-w-5xl px-8 py-8">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
