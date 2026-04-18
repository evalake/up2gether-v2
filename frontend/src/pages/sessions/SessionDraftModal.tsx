import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { steamCover } from '@/lib/steamCover'
import type { Game } from '@/features/games/api'
import { useT } from '@/i18n'
import { useLocaleStore } from '@/features/locale/store'

const TIME_PRESETS = [19, 20, 21, 22]
const DURATION_PRESETS: { label: string; value: number }[] = [
  { label: '1h', value: 60 },
  { label: '1h30', value: 90 },
  { label: '2h', value: 120 },
  { label: '3h', value: 180 },
  { label: '4h', value: 240 },
]
const MINUTE_STEP = 5
const DURATION_MIN = 30
const DURATION_MAX = 480
const DURATION_STEP = 30

const fmtDuration = (m: number) => {
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h === 0) return `${min}min`
  if (min === 0) return `${h}h`
  return `${h}h${min}`
}

function Stepper({
  display,
  width,
  onDec,
  onInc,
  ariaLabel,
}: {
  display: string
  width: string
  onDec: () => void
  onInc: () => void
  ariaLabel: string
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        aria-label={ariaLabel}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-up-line/50 text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
      <div className={`relative ${width} text-center`}>
        <AnimatePresence mode="popLayout">
          <motion.span
            key={display}
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 3 }}
            transition={{ duration: 0.12 }}
            className="block font-display text-xl tabular-nums text-up-text"
          >
            {display}
          </motion.span>
        </AnimatePresence>
      </div>
      <button
        type="button"
        onClick={onInc}
        aria-label={ariaLabel}
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-up-line/50 text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
      </button>
    </div>
  )
}

export function SessionDraftModal({
  start,
  setStart,
  games,
  gameId,
  setGameId,
  title,
  setTitle,
  duration,
  setDuration,
  onCancel,
  onSave,
  isPending,
}: {
  start: Date
  setStart: (d: Date) => void
  games: Game[]
  gameId: string
  setGameId: (v: string) => void
  title: string
  setTitle: (v: string) => void
  duration: number
  setDuration: (v: number) => void
  onCancel: () => void
  onSave: () => void
  isPending: boolean
}) {
  const t = useT()
  const locale = useLocaleStore(s => s.locale)
  const [query, setQuery] = useState('')
  const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '')
  const q = norm(query.trim())
  const filtered = useMemo(() => {
    if (!q) return games
    return games.filter((g) => g.id === gameId || norm(g.name).includes(q))
  }, [games, q, gameId])
  const selected = games.find((g) => g.id === gameId) ?? null
  const selectedCover = selected ? steamCover(selected) : null
  const end = new Date(start.getTime() + duration * 60_000)
  const hour = (d: Date) => d.toLocaleTimeString(locale === 'pt' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' })
  const hh = start.getHours()
  const mm = start.getMinutes()

  const setHour = (h: number) => {
    const wrapped = ((h % 24) + 24) % 24
    const next = new Date(start)
    next.setHours(wrapped, mm, 0, 0)
    setStart(next)
  }
  const setMinute = (m: number) => {
    const wrapped = ((m % 60) + 60) % 60
    const next = new Date(start)
    next.setHours(hh, wrapped, 0, 0)
    setStart(next)
  }
  const setQuickTime = (h: number) => {
    const next = new Date(start)
    next.setHours(h, 0, 0, 0)
    setStart(next)
  }

  const decDuration = () => setDuration(Math.max(DURATION_MIN, duration - DURATION_STEP))
  const incDuration = () => setDuration(Math.min(DURATION_MAX, duration + DURATION_STEP))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const dayLabel = start.toLocaleDateString(locale === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')

  return createPortal(
    <motion.div
      key="draft-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onCancel}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-md"
    >
      <motion.div
        key="draft-panel"
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 4 }}
        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-lg border border-up-orange/25 bg-up-panel shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
      >
        <button
          onClick={onCancel}
          aria-label={t.common.close}
          className="absolute right-2.5 top-2.5 z-10 grid h-6 w-6 place-items-center rounded-sm bg-black/40 text-up-dim backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-up-text"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>

        <div className="relative h-16 shrink-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedCover ? (
              <motion.img
                key={selectedCover}
                src={selectedCover}
                alt=""
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1.1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 h-full w-full object-cover blur-[2px]"
              />
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-gradient-to-br from-up-orange/20 via-up-panel to-up-magenta/10"
              />
            )}
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-up-panel via-up-panel/85 to-up-panel/30" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-2 pt-1">
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-wider text-up-orange">{t.sessions.schedule}</div>
              <div className="truncate font-display text-sm capitalize text-up-text">{dayLabel}</div>
            </div>
            <div className="font-mono text-[10px] tabular-nums text-up-orange">
              {hour(start)} {'\u2192'} {hour(end)} · {fmtDuration(duration)}
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          <section>
            <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider text-up-dim">
              <span>{t.sessions.gameLabel}</span>
              {selected && <span className="truncate text-up-orange">{selected.name}</span>}
            </div>
            <input
              aria-label={t.sessions.searchGame}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.sessions.searchGamePlaceholder}
              className="h-8 w-full rounded-sm border border-up-line bg-black/30 px-2.5 text-xs text-up-text placeholder:text-up-dim focus-visible:border-up-orange/60 focus-visible:outline-none"
            />
            <div className="mt-1.5 max-h-32 overflow-y-auto rounded-sm border border-up-line/50 bg-black/20">
              {filtered.length === 0 ? (
                <div className="py-4 text-center text-[11px] text-up-dim">{t.common.noResults(query)}</div>
              ) : (
                <div className="grid gap-1 p-1.5 sm:grid-cols-2">
                  {filtered.map((g) => {
                    const on = g.id === gameId
                    const cover = steamCover(g)
                    return (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGameId(g.id)}
                        className={`flex items-center gap-2 rounded-sm border px-1.5 py-1 text-left transition-colors ${
                          on
                            ? 'border-up-orange bg-up-orange/10 text-up-orange'
                            : 'border-transparent text-up-text hover:border-up-orange/30 hover:bg-up-orange/5'
                        }`}
                      >
                        {cover ? (
                          <img loading="lazy" src={cover} alt="" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} className="h-5 w-9 shrink-0 rounded-sm object-cover" />
                        ) : (
                          <div className="h-5 w-9 shrink-0 rounded-sm bg-up-line/30" />
                        )}
                        <span className="truncate text-[11px]">{g.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-up-dim">{t.sessions.titleLabel} <span className="text-up-dim">{t.sessions.titleOptional}</span></div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={selected?.name ?? t.sessions.titlePlaceholder}
              className="h-8 w-full rounded-sm border border-up-line bg-black/30 px-2.5 text-xs text-up-text placeholder:text-up-dim focus-visible:border-up-orange/60 focus-visible:outline-none"
            />
          </section>

          <div className="grid grid-cols-2 gap-3">
            <section>
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-up-dim">
                <span>{t.sessions.timeLabel}</span>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Stepper
                  display={String(hh).padStart(2, '0')}
                  width="w-7"
                  onDec={() => setHour(hh - 1)}
                  onInc={() => setHour(hh + 1)}
                  ariaLabel={t.sessions.hourAria}
                />
                <span className="font-display text-xl text-up-dim/40">:</span>
                <Stepper
                  display={String(mm).padStart(2, '0')}
                  width="w-7"
                  onDec={() => setMinute(mm - MINUTE_STEP)}
                  onInc={() => setMinute(mm + MINUTE_STEP)}
                  ariaLabel={t.sessions.minuteAria}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {TIME_PRESETS.map((h) => {
                  const on = hh === h && mm === 0
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setQuickTime(h)}
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors ${
                        on
                          ? 'border-up-orange/60 bg-up-orange/10 text-up-orange'
                          : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
                      }`}
                    >
                      {String(h).padStart(2, '0')}h
                    </button>
                  )
                })}
              </div>
            </section>

            <section>
              <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-wider text-up-dim">
                <span>{t.sessions.durationLabel}</span>
              </div>
              <div className="flex items-center justify-center">
                <Stepper
                  display={fmtDuration(duration)}
                  width="w-16"
                  onDec={decDuration}
                  onInc={incDuration}
                  ariaLabel={t.sessions.durationAria}
                />
              </div>
              <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                {DURATION_PRESETS.map((p) => {
                  const on = duration === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setDuration(p.value)}
                      className={`rounded-full border px-2 py-0.5 font-mono text-[10px] tabular-nums transition-colors ${
                        on
                          ? 'border-up-orange/60 bg-up-orange/10 text-up-orange'
                          : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
                      }`}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </section>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-up-line/50 px-4 py-2.5">
          <button
            onClick={onCancel}
            className="rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text"
          >
            {t.common.cancel}
          </button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onSave}
            disabled={!gameId || isPending}
            className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:opacity-40"
          >
            {isPending ? t.sessions.savingDraft : t.sessions.schedule}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
