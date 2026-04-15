import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateGame } from '@/features/games/hooks'
import type { HardwareTier, GameSource } from '@/features/games/api'
import { steamSearch, steamGetDetails, builtinGetDetails, type SteamSearchItem } from '@/features/steam/api'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/Textarea'
import { Button } from '@/components/nerv/Button'
import { SteamThumb } from '@/components/SteamThumb'
import { TIERS } from '@/lib/constants'
import { ChipInput } from './ChipInput'

type FormState = {
  name: string
  steam_appid: string
  description: string
  is_free: boolean
  price_current: string
  cover_url: string
  genres: string[]
  tags: string[]
  player_min: number
  player_max: number | null
  min_hardware_tier: HardwareTier
  developer: string | null
  release_date: string | null
  metacritic_score: number | null
  price_original: number | null
  discount_percent: number | null
  source?: GameSource
}

const emptyForm: FormState = {
  name: '',
  steam_appid: '',
  description: '',
  is_free: false,
  price_current: '',
  cover_url: '',
  genres: [],
  tags: [],
  player_min: 1,
  player_max: null,
  min_hardware_tier: 'unknown',
  developer: null,
  release_date: null,
  metacritic_score: null,
  price_original: null,
  discount_percent: null,
}

export function GameCreateForm({
  groupId,
  onCreated,
  onCancel,
}: {
  groupId: string
  onCreated: (createdId: string) => void
  onCancel: () => void
}) {
  const create = useCreateGame(groupId)
  const toast = useToast()

  const [form, setForm] = useState<FormState>(emptyForm)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [steamQ, setSteamQ] = useState('')
  const [steamHits, setSteamHits] = useState<SteamSearchItem[]>([])
  const [steamLoading, setSteamLoading] = useState(false)
  const [filling, setFilling] = useState(false)

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao buscar detalhes')
    } finally {
      setFilling(false)
    }
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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
          setForm(emptyForm)
          toast.success('jogo adicionado')
          onCreated(created.id)
        },
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : 'falha ao criar jogo')
        },
      },
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
      <div className="rounded-sm border border-nerv-orange/40 bg-nerv-panel/60 p-5 shadow-lg shadow-black/30">
        <div className="mb-4 text-[11px] uppercase tracking-wider text-nerv-dim">novo jogo</div>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="relative">
            <div className="flex items-center gap-2 rounded-sm border border-nerv-orange/30 bg-black/40 px-2">
              {form.cover_url && (
                <img loading="lazy" src={form.cover_url} alt="" className="h-8 w-14 shrink-0 rounded-sm object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
              )}
              <input
                aria-label="buscar jogo"
                value={steamQ}
                onChange={(e) => setSteamQ(e.target.value)}
                placeholder={form.name ? form.name : 'buscar jogo pra autopreencher...'}
                className="h-8 flex-1 bg-transparent text-xs focus:outline-none"
              />
              {(steamLoading || filling) && <span className="text-[10px] text-nerv-dim">...</span>}
            </div>
            <AnimatePresence>
              {steamHits.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }} className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-sm border border-nerv-orange/40 bg-nerv-panel shadow-lg">
                  {steamHits.map((it, i) => (
                    <button
                      key={it.slug ?? it.appid ?? i}
                      type="button"
                      onClick={() => pickSteam(it)}
                      className="flex w-full items-center gap-2 border-b border-nerv-line/60 px-2 py-1.5 text-left transition-colors hover:bg-nerv-orange/10"
                    >
                      {it.appid ? (
                        <SteamThumb appid={it.appid} alt={it.name} className="h-7 w-14 rounded-sm object-cover" />
                      ) : (
                        <img loading="lazy" src={it.header_image ?? ''} alt={it.name} className="h-7 w-14 rounded-sm object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs">{it.name}</div>
                        <div className="flex items-center gap-1.5 text-[9px] text-nerv-dim">
                          {it.source && it.source !== 'steam' ? (
                            <span className="rounded-sm border border-nerv-magenta/40 bg-nerv-magenta/10 px-1 text-nerv-magenta">{it.source}</span>
                          ) : (
                            <span>#{it.appid}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <AnimatePresence>
            {showAdvanced && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3 overflow-hidden">
                <div className="grid grid-cols-12 gap-2">
                  <input
                    value={form.name}
                    maxLength={150}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="nome do jogo *"
                    className="col-span-6 h-8 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none"
                  />
                  <input
                    value={form.steam_appid}
                    onChange={(e) => setForm({ ...form, steam_appid: e.target.value })}
                    placeholder="appid"
                    className="col-span-2 h-8 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={form.is_free}
                    value={form.is_free ? '' : form.price_current}
                    onChange={(e) => setForm({ ...form, price_current: e.target.value })}
                    placeholder="R$"
                    className="col-span-2 h-8 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none disabled:opacity-40"
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_free: !form.is_free })}
                    className={`col-span-2 h-8 rounded-sm border text-[10px] uppercase tracking-wider transition-all ${
                      form.is_free
                        ? 'border-nerv-green bg-nerv-green/10 text-nerv-green'
                        : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-green/40'
                    }`}
                  >
                    {form.is_free ? '✓ free' : 'free?'}
                  </button>
                </div>

                <div className="grid grid-cols-12 gap-2">
                  <div className="col-span-3 flex items-center gap-1 rounded-sm border border-nerv-line bg-black/40 px-2 h-8">
                    <span className="text-[10px] uppercase text-nerv-dim">players</span>
                    <input
                      type="number"
                      min="1"
                      value={form.player_min}
                      onChange={(e) => setForm({ ...form, player_min: Number(e.target.value) || 1 })}
                      className="w-8 bg-transparent text-center text-xs focus:outline-none"
                    />
                    <span className="text-nerv-dim">-</span>
                    <input
                      type="number"
                      min="1"
                      value={form.player_max ?? ''}
                      onChange={(e) => setForm({ ...form, player_max: e.target.value ? Number(e.target.value) : null })}
                      placeholder="∞"
                      className="w-8 bg-transparent text-center text-xs focus:outline-none"
                    />
                  </div>
                  <div className="col-span-9 flex gap-1">
                    {TIERS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setForm({ ...form, min_hardware_tier: t })}
                        className={`h-8 flex-1 rounded-sm border text-[10px] uppercase tracking-wider transition-all ${
                          form.min_hardware_tier === t
                            ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                            : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
                        }`}
                      >
                        hw: {t}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea
                  value={form.description}
                  maxLength={2000}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2}
                  placeholder="descrição (opcional)"
                />

                <div className="grid grid-cols-2 gap-2">
                  <ChipInput label="gêneros" value={form.genres} onChange={(v) => setForm({ ...form, genres: v })} max={10} placeholder="FPS, RPG..." />
                  <ChipInput label="tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} max={20} placeholder="Co-op..." />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
            >
              {showAdvanced ? '− menos opções' : '+ mais opções'}
            </button>
            <div className="flex gap-2">
              <Button type="button" variant="subtle" onClick={() => { setForm(emptyForm); setShowAdvanced(false); onCancel() }}>
                cancelar
              </Button>
              <Button type="submit" disabled={create.isPending || !form.name}>
                {create.isPending ? 'salvando...' : 'adicionar'}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  )
}
