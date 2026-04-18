import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { useAuthStore } from '@/features/auth/store'
import { useThemeStore } from '@/features/theme/store'
import { useLocaleStore } from '@/features/locale/store'
import { useMe } from '@/features/auth/hooks'
import { useGroup } from '@/features/groups/hooks'
import { useT } from '@/i18n'
import { Avatar } from './Avatar'
import { NotificationBell } from './NotificationBell'

function LocaleToggle() {
  const locale = useLocaleStore((s) => s.locale)
  const toggle = useLocaleStore((s) => s.toggle)
  const t = useT()
  return (
    <button
      type="button"
      onClick={toggle}
      title={t.nav.switchLang}
      aria-label={t.nav.switchLang}
      className="flex items-center gap-1.5 rounded-sm border border-up-orange/30 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-up-orange transition-colors hover:border-up-orange hover:bg-up-orange/10"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${locale === 'en' ? 'bg-up-orange' : 'bg-up-amber'}`} />
      {locale}
    </button>
  )
}

function ThemeToggle() {
  const mode = useThemeStore((s) => s.mode)
  const toggle = useThemeStore((s) => s.toggle)
  const t = useT()
  return (
    <button
      type="button"
      onClick={toggle}
      title={t.nav.switchTheme}
      aria-label={t.nav.switchTheme}
      className="flex items-center gap-1.5 rounded-sm border border-up-orange/30 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-up-orange transition-colors hover:border-up-orange hover:bg-up-orange/10"
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${mode === 'frost' ? 'bg-up-orange' : 'bg-up-amber'}`} />
      {mode}
    </button>
  )
}

function Clock() {
  const locale = useLocaleStore((s) => s.locale)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span className="font-mono text-xs tabular-nums text-up-orange">
      {now.toLocaleTimeString(locale === 'pt' ? 'pt-BR' : 'en-US', { hour12: false })}
    </span>
  )
}

function GroupContext({ groupId }: { groupId: string }) {
  const t = useT()
  const group = useGroup(groupId)
  const me = useMe()
  const loc = useLocation()
  const sub = loc.pathname.replace(`/groups/${groupId}`, '') || ''
  const isAdmin = group.data?.user_role === 'admin' || !!me.data?.is_sys_admin
  const groupNav = [
    { label: t.nav.overview, slug: '' },
    { label: t.nav.games, slug: '/games' },
    { label: t.nav.votes, slug: '/votes' },
    { label: t.nav.sessions, slug: '/sessions' },
  ]
  const nav = isAdmin ? [...groupNav, { label: t.nav.admin, slug: '/admin' }] : groupNav
  return (
    <div className="border-t border-up-orange/15 px-3 py-3">
      <div className="mb-2 text-[10px] uppercase tracking-wider text-up-dim">{t.nav.currentGroup}</div>
      <div className="mb-3 truncate text-sm font-medium text-up-text">
        {group.data?.name ?? '...'}
      </div>
      <div className="space-y-0.5">
        {nav.map((item) => {
          const active = sub === item.slug
          return (
            <Link
              key={item.slug}
              to={`/groups/${groupId}${item.slug}`}
              className={`block rounded-sm border-l-2 px-2 py-1.5 text-xs lowercase transition-colors ${
                active
                  ? 'border-up-orange bg-up-orange/10 text-up-orange'
                  : 'border-transparent text-up-dim hover:border-up-orange hover:bg-up-orange/5 hover:text-up-text'
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
  const t = useT()
  const loc = useLocation()
  const me = useMe()
  const logout = useAuthStore((s) => s.logout)
  const params = useParams<{ id: string }>()
  const inGroup = /^\/groups\/[^/]+/.test(loc.pathname) ? params.id : undefined
  const [navOpen, setNavOpen] = useState(false)
  const topNav = [
    { label: t.nav.groups, to: '/groups' },
    { label: t.nav.settings, to: '/settings' },
  ]

  // fecha drawer ao navegar
  useEffect(() => { setNavOpen(false) }, [loc.pathname])

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {navOpen && (
        <div
          onClick={() => setNavOpen(false)}
          aria-label={t.common.close}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[13.5rem] shrink-0 flex-col border-r border-up-orange/20 bg-up-panel/95 backdrop-blur-sm transition-transform md:static md:translate-x-0 ${navOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Link to="/groups" className="flex items-center gap-3 border-b border-up-orange/20 p-4">
          <img src="/up2gether-mark.png" alt="" className="h-10 w-10 shrink-0 rounded-sm object-cover" />
          <div className="min-w-0">
            <div className="font-display text-xl leading-none text-up-orange">up2gether</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-up-dim">
              session ops
            </div>
          </div>
        </Link>

        <nav aria-label="main navigation" className="flex-1 overflow-y-auto py-2">
          {topNav.map((item) => {
            const active = loc.pathname === item.to || loc.pathname.startsWith(item.to + '/')
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`block border-l-2 px-4 py-2 text-xs lowercase tracking-wider transition-colors ${
                  active && !inGroup
                    ? 'border-up-orange bg-up-orange/10 text-up-orange'
                    : 'border-transparent text-up-dim hover:border-up-orange hover:bg-up-orange/5 hover:text-up-text'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
          {inGroup && <GroupContext groupId={inGroup} />}
          {me.data?.is_sys_admin && (
            <Link
              to="/admin/metrics"
              className={`mt-2 block border-l-2 px-4 py-2 text-xs lowercase tracking-wider transition-colors ${
                loc.pathname.startsWith('/admin')
                  ? 'border-up-red bg-up-red/10 text-up-red'
                  : 'border-transparent text-up-dim hover:border-up-red hover:bg-up-red/5 hover:text-up-red'
              }`}
            >
              {t.nav.metrics}
            </Link>
          )}
        </nav>

        <div className="border-t border-up-orange/20 p-3">
          <div className="flex items-center gap-2">
            <Avatar
              discordId={me.data?.discord_id}
              hash={me.data?.discord_avatar}
              name={me.data?.discord_display_name ?? me.data?.discord_username}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-up-text">
                {me.data?.discord_display_name ?? me.data?.discord_username ?? '---'}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-up-dim">
                {me.data?.is_sys_admin ? (
                  <span className="text-up-red">sys_admin // cyberbandolero</span>
                ) : (
                  'online'
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            aria-label={t.nav.disconnect}
            className="mt-3 w-full rounded-sm border border-up-red/30 px-2 py-1.5 text-[10px] uppercase tracking-wider text-up-red transition-colors hover:border-up-red hover:bg-up-red hover:text-up-bg"
          >
            {t.nav.disconnect}
          </button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-up-orange/15 bg-up-panel/80 px-4 py-2.5 backdrop-blur-sm md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setNavOpen(true)}
              aria-label="open menu"
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-up-orange/30 text-up-orange md:hidden"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <div className="flex items-center gap-2 text-[11px] lowercase tracking-wider text-up-green">
              <span className="inline-block h-1.5 w-1.5 rounded-full up-pulse" style={{ background: 'currentColor' }} />
              online
            </div>
          </div>
          <div className="flex items-center gap-4">
            <LocaleToggle />
            <ThemeToggle />
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
          <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
            {children}
          </div>
        </motion.div>
      </main>
    </div>
  )
}
