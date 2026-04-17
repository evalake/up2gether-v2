import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useClearNotifications, useDeleteNotification, useMarkRead, useNotifications } from '@/features/notifications/hooks'
import { useT } from '@/i18n'

function timeAgo(iso: string, nowLabel: string): string {
  const d = new Date(iso)
  const secs = Math.floor((Date.now() - d.getTime()) / 1000)
  if (secs < 60) return nowLabel
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

export function NotificationBell() {
  const t = useT()
  const q = useNotifications()
  const mark = useMarkRead()
  const del = useDeleteNotification()
  const clear = useClearNotifications()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  const items = q.data ?? []
  const unread = items.filter((n) => !n.read_at).length

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const onItem = (id: string, link: string | null) => {
    mark.mutate([id])
    if (link) nav(link)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t.notifications.label}
        className="relative grid h-8 w-8 place-items-center rounded-full text-up-dim transition-colors hover:bg-up-orange/10 hover:text-up-orange"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-3.5 min-w-[14px] place-items-center rounded-full bg-up-orange px-1 font-mono text-[8px] text-up-bg">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-[100] mt-2 w-80 overflow-hidden rounded-sm border border-up-orange/30 bg-up-panel shadow-[0_0_40px_rgba(255,102,0,0.15)]"
          >
            <div className="flex items-center justify-between border-b border-up-orange/15 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-up-dim">{t.notifications.label}</div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => mark.mutate(undefined)}
                    className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
                  >
                    {t.notifications.markAll}
                  </button>
                )}
                {items.length > 0 && (
                  <button
                    onClick={() => clear.mutate()}
                    className="text-[10px] uppercase tracking-wider text-up-dim hover:text-up-red"
                  >
                    {t.notifications.clear}
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 && (
                <div className="px-3 py-8 text-center text-[11px] text-up-dim">{t.notifications.empty}</div>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`group relative flex items-start border-b border-up-orange/10 transition-colors last:border-b-0 hover:bg-up-orange/5 ${
                    !n.read_at ? 'bg-up-orange/5' : ''
                  }`}
                >
                  <button
                    onClick={() => onItem(n.id, n.link)}
                    className="flex min-w-0 flex-1 flex-col items-start gap-0.5 px-3 py-2 pr-8 text-left"
                  >
                    <div className="flex w-full items-baseline justify-between gap-2">
                      <span className={`truncate text-xs ${!n.read_at ? 'text-up-text' : 'text-up-dim'}`}>{n.title}</span>
                      <span className="shrink-0 font-mono text-[10px] text-up-dim">{timeAgo(n.created_at, t.notifications.now)}</span>
                    </div>
                    {n.body && <div className="truncate text-[10px] text-up-dim">{n.body}</div>}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      del.mutate(n.id)
                    }}
                    aria-label={t.notifications.remove}
                    className="absolute right-2 top-1/2 -translate-y-1/2 grid h-5 w-5 place-items-center rounded-sm text-up-dim opacity-0 transition-opacity hover:bg-up-red/10 hover:text-up-red group-hover:opacity-100"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
