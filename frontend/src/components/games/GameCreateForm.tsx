import { useEffect, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { useT } from '@/i18n'
import { useCreateGame } from '@/features/games/hooks'
import { steamSearch, steamGetDetails, builtinGetDetails, type SteamSearchItem } from '@/features/steam/api'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/core/Button'
import { SteamResultsList, SteamPreview, ManualForm, emptyForm, type FormState } from './GameCreateParts'

export function GameCreateForm({
  groupId,
  onCreated,
  onCancel,
}: {
  groupId: string
  onCreated: (createdId: string) => void
  onCancel: () => void
}) {
  const t = useT()
  const create = useCreateGame(groupId)
  const toast = useToast()

  const [mode, setMode] = useState<'steam' | 'manual'>('steam')
  const [form, setForm] = useState<FormState>(emptyForm)
  const [picked, setPicked] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [steamQ, setSteamQ] = useState('')
  const [steamHits, setSteamHits] = useState<SteamSearchItem[]>([])
  const [steamLoading, setSteamLoading] = useState(false)
  const [filling, setFilling] = useState(false)

  const close = useCallback(() => {
    setForm(emptyForm)
    setPicked(false)
    setShowAdvanced(false)
    setSteamQ('')
    setSteamHits([])
    onCancel()
  }, [onCancel])

  // lock body scroll + escape
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', handler)
    }
  }, [close])

  // steam debounced search
  useEffect(() => {
    if (steamQ.trim().length < 2) {
      setSteamHits([])
      return
    }
    const t = setTimeout(async () => {
      setSteamLoading(true)
      try {
        setSteamHits(await steamSearch(steamQ.trim()))
      } catch {
        setSteamHits([])
      } finally {
        setSteamLoading(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [steamQ])

  const pickSteam = async (it: SteamSearchItem) => {
    setSteamHits([])
    setSteamQ('')
    setFilling(true)
    try {
      if (it.slug && it.source && it.source !== 'steam') {
        const b = await builtinGetDetails(it.slug)
        setForm({
          name: b.name,
          steam_appid: '',
          description: b.description ?? '',
          is_free: b.is_free,
          price_current: '',
          cover_url: b.cover_url,
          genres: b.genres ?? [],
          tags: [],
          player_min: b.player_min ?? 1,
          player_max: b.player_max ?? null,
          min_hardware_tier: b.min_hardware_tier ?? 'unknown',
          developer: b.developer ?? null,
          release_date: b.release_date ?? null,
          metacritic_score: null,
          price_original: null,
          discount_percent: null,
          source: b.source,
        })
      } else {
        const d = await steamGetDetails(it.appid!)
        setForm({
          name: d.name || it.name,
          steam_appid: String(it.appid),
          description: d.short_description ?? '',
          is_free: d.price === null || d.price === 0,
          price_current: d.price !== null && d.price !== undefined ? String(d.price / 100) : '',
          cover_url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${it.appid}/header.jpg`,
          genres: d.genres ?? [],
          tags: d.categories ?? [],
          player_min: d.player_min ?? 1,
          player_max: d.player_max ?? null,
          min_hardware_tier: d.hardware_tier ?? 'unknown',
          developer: d.developer ?? null,
          release_date: d.release_date ?? null,
          metacritic_score: d.metacritic_score ?? null,
          price_original: d.price_initial != null ? d.price_initial / 100 : null,
          discount_percent: d.discount_percent ?? null,
        })
      }
      setPicked(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.games.detailFail)
    } finally {
      setFilling(false)
    }
  }

  const doSubmit = () => {
    if (!form.name) return
    create.mutate(
      {
        name: form.name,
        steam_appid: form.steam_appid ? Number(form.steam_appid) : null,
        cover_url: form.cover_url || null,
        description: form.description || null,
        is_free: form.is_free,
        price_current: form.is_free ? 0 : form.price_current ? Number(form.price_current) : null,
        genres: form.genres,
        tags: form.tags,
        player_min: form.player_min,
        player_max: form.player_max,
        min_hardware_tier: form.min_hardware_tier,
        developer: form.developer,
        release_date: form.release_date,
        metacritic_score: form.metacritic_score,
        price_original: form.price_original,
        discount_percent: form.discount_percent,
        source: form.source,
      },
      {
        onSuccess: (created) => {
          toast.success(t.games.gameAdded)
          onCreated(created.id)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : t.games.createFail)
        },
      },
    )
  }

  const clearPick = () => {
    setForm(emptyForm)
    setPicked(false)
    setSteamQ('')
  }

  const switchToManual = () => {
    setMode('manual')
    setPicked(false)
    if (!form.name) setForm(emptyForm)
  }

  // steam search: is there content to show?
  const steamEmpty = steamQ.trim().length < 2 && steamHits.length === 0
  const steamSearching = steamQ.trim().length >= 2

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) close() }}
      role="dialog"
      aria-modal="true"
      aria-label={t.games.addNewGame}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="relative mx-4 flex h-[min(520px,85vh)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-up-orange/25 bg-up-bg shadow-2xl shadow-black/50"
      >
        {/* header */}
        <div className="shrink-0 flex items-center justify-between border-b border-up-orange/20 bg-black/40 px-4 py-2">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-up-orange">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-up-orange" />
            {t.games.addNewGame}
          </div>
          <button onClick={close} className="p-1 text-up-dim transition-colors hover:text-up-text" aria-label={t.common.close}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {/* tabs */}
        <div className="shrink-0 flex border-b border-up-line/40">
          <button
            onClick={() => { setMode('steam'); setPicked(false) }}
            className={`flex-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-colors ${
              mode === 'steam' ? 'border-b-2 border-up-orange text-up-orange' : 'text-up-dim hover:text-up-text'
            }`}
          >
            {t.games.importTab}
          </button>
          <button
            onClick={switchToManual}
            className={`flex-1 py-2 text-center font-mono text-[10px] uppercase tracking-wider transition-colors ${
              mode === 'manual' ? 'border-b-2 border-up-orange text-up-orange' : 'text-up-dim hover:text-up-text'
            }`}
          >
            {t.games.manualTab}
          </button>
        </div>

        {/* body: steam search tab uses flex layout with pinned input, manual uses scroll */}
        {mode === 'steam' && !picked && (
          <div className="flex min-h-0 flex-1 flex-col">
            {/* pinned search input */}
            <div className="shrink-0 border-b border-up-line/20 px-4 py-3">
              <div className="flex items-center gap-2 rounded-sm border border-up-orange/30 bg-black/40 px-2.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-up-dim">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  autoFocus
                  aria-label={t.games.searchSteam}
                  value={steamQ}
                  onChange={(e) => setSteamQ(e.target.value)}
                  placeholder={t.games.searchSteamPlaceholder}
                  className="h-9 flex-1 bg-transparent text-sm focus-visible:outline-none"
                />
                {(steamLoading || filling) && (
                  <span className="text-[10px] text-up-dim animate-pulse">{t.games.searching}</span>
                )}
              </div>
            </div>

            {/* results area: fills remaining space, only this scrolls */}
            <div className="min-h-0 flex-1 overflow-y-auto">
              {steamEmpty && !steamLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                  <span className="font-display text-3xl text-up-orange/20">?</span>
                  <p className="text-xs text-up-dim">
                    {t.games.importHint}
                  </p>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className="mt-1 text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
                  >
                    {t.games.orAddManually}
                  </button>
                </div>
              )}

              {steamSearching && steamHits.length === 0 && !steamLoading && (
                <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                  <p className="text-xs text-up-dim">{t.common.noResults(steamQ)}</p>
                  <button
                    type="button"
                    onClick={switchToManual}
                    className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
                  >
                    {t.games.addManually}
                  </button>
                </div>
              )}

              {steamHits.length > 0 && (
                <SteamResultsList hits={steamHits} onPick={pickSteam} />
              )}
            </div>
          </div>
        )}

        {mode === 'steam' && picked && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <SteamPreview form={form} onClear={clearPick} />
          </div>
        )}

        {mode === 'manual' && (
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <ManualForm
              form={form}
              setForm={setForm}
              showAdvanced={showAdvanced}
              setShowAdvanced={setShowAdvanced}
            />
          </div>
        )}

        {/* footer: always pinned at bottom */}
        <div className="shrink-0 flex items-center justify-end gap-2 border-t border-up-line/40 px-4 py-3">
          <Button type="button" variant="subtle" size="sm" onClick={close}>
            {t.common.cancel}
          </Button>
          <Button
            size="sm"
            disabled={create.isPending || !form.name}
            onClick={doSubmit}
          >
            {create.isPending ? t.common.saving : t.games.add}
          </Button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}
