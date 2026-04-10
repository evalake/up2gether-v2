import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  useCreateGame,
  useGames,
  useSetInterest,
  useToggleOwnership,
} from '@/features/games/hooks'
import type { HardwareTier } from '@/features/games/api'
import { steamSearch, steamGetDetails, type SteamSearchItem } from '@/features/steam/api'
import { Loading } from '@/components/ui/Loading'
import { ErrorBox } from '@/components/ui/ErrorBox'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/nerv/Button'
import { steamCover } from '@/lib/steamCover'
import { useTitle } from '@/lib/useTitle'
import { SteamThumb } from '@/components/SteamThumb'
import { SIGNALS, STAGE_COLOR, STAGE_VALUES, TIERS } from '@/lib/constants'

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

function ChipInput({ label, value, onChange, max, placeholder }: {
  label: string
  value: string[]
  onChange: (v: string[]) => void
  max: number
  placeholder: string
}) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const t = draft.trim()
    if (!t || value.includes(t) || value.length >= max) return
    onChange([...value, t])
    setDraft('')
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs uppercase tracking-wider text-nerv-dim">
        <span>{label}</span>
        <span className="text-[10px]">{value.length}/{max}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 rounded-sm border border-nerv-line bg-black/40 p-2">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-sm border border-nerv-orange/40 bg-nerv-orange/10 px-2 py-0.5 text-[11px] text-nerv-orange">
            {t}
            <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} className="transition-colors hover:text-nerv-red">×</button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add() } }}
          onBlur={add}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[120px] flex-1 bg-transparent text-xs text-nerv-text placeholder:text-nerv-dim/60 focus:outline-none"
        />
      </div>
    </div>
  )
}

export function GamesPage() {
  useTitle('biblioteca')
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const games = useGames(id)
  const create = useCreateGame(id)
  const setInt = useSetInterest(id)
  const toggleOwn = useToggleOwnership(id)
  const toast = useToast()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [steamQ, setSteamQ] = useState('')
  const [steamHits, setSteamHits] = useState<SteamSearchItem[]>([])
  const [steamLoading, setSteamLoading] = useState(false)
  const [filling, setFilling] = useState(false)

  const [stageFilter, setStageFilter] = useState<Set<string>>(new Set())
  const [genreFilter, setGenreFilter] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const topGenres = useMemo(() => {
    const counts = new Map<string, number>()
    for (const g of games.data ?? []) {
      for (const x of g.genres) counts.set(x, (counts.get(x) ?? 0) + 1)
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g)
  }, [games.data])

  // debounced realtime steam search
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
      const d = await steamGetDetails(it.appid)
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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao buscar detalhes')
    } finally {
      setFilling(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name) return
    try {
      await create.mutateAsync({
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
      })
      setForm(emptyForm)
      setShowForm(false)
      toast.success('jogo adicionado')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'falha ao criar jogo')
    }
  }

  const filteredGames = useMemo(() => games.data?.filter((g) => {
    if (stageFilter.size > 0 && !stageFilter.has(g.stage)) return false
    if (genreFilter.size > 0 && !g.genres.some((x) => genreFilter.has(x))) return false
    if (search && !g.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  }), [games.data, stageFilter, genreFilter, search])

  const toggleStage = (s: string) => setStageFilter((p) => {
    const n = new Set(p); if (n.has(s)) n.delete(s); else n.add(s); return n
  })
  const toggleGenre = (g: string) => setGenreFilter((p) => {
    const n = new Set(p); if (n.has(g)) n.delete(g); else n.add(g); return n
  })

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-nerv-text">biblioteca</h1>
          <p className="mt-1 text-xs text-nerv-dim">
            <Link to={`/groups/${id}`} className="text-nerv-dim/70 transition-colors hover:text-nerv-orange">grupo</Link>
            {' · '}{games.data?.length ?? 0} jogos
          </p>
        </div>
        <Button onClick={() => setShowForm((v) => !v)}>
          {showForm ? 'cancelar' : 'adicionar jogo'}
        </Button>
      </header>

      {showForm && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5">
            <div className="mb-4 text-[11px] uppercase tracking-wider text-nerv-dim">novo jogo</div>
            <form onSubmit={onSubmit} className="space-y-4">
              {/* Steam search compacto */}
              <div className="relative">
                <div className="flex items-center gap-2 rounded-sm border border-nerv-orange/30 bg-black/40 px-2">
                  {form.cover_url && (
                    <img src={form.cover_url} alt="" className="h-8 w-14 shrink-0 rounded-sm object-cover" />
                  )}
                  <input
                    aria-label="buscar na steam"
                    value={steamQ}
                    onChange={(e) => setSteamQ(e.target.value)}
                    placeholder={form.name ? form.name : 'buscar na steam pra autopreencher...'}
                    className="h-8 flex-1 bg-transparent text-xs focus:outline-none"
                  />
                  {(steamLoading || filling) && <span className="text-[10px] text-nerv-dim">...</span>}
                </div>
                {steamHits.length > 0 && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-sm border border-nerv-orange/40 bg-nerv-panel shadow-lg">
                    {steamHits.map((it) => (
                      <button
                        key={it.appid}
                        type="button"
                        onClick={() => pickSteam(it)}
                        className="flex w-full items-center gap-2 border-b border-nerv-line/60 px-2 py-1.5 text-left transition-colors hover:bg-nerv-orange/10"
                      >
                        <SteamThumb appid={it.appid} alt={it.name} className="h-7 w-14 rounded-sm object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs">{it.name}</div>
                          <div className="text-[9px] text-nerv-dim">#{it.appid}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Linha 1: nome + appid + price + f2p */}
              {showAdvanced && (
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
              )}

              {/* Linha 2: players min/max + hardware tier inline */}
              {showAdvanced && (
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
              )}

              {/* Description compacta */}
              {showAdvanced && (
              <textarea
                value={form.description}
                maxLength={2000}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="descricao (opcional)"
                className="w-full rounded-sm border border-nerv-line bg-black/40 px-2 py-1.5 text-xs focus:border-nerv-orange focus:outline-none"
              />
              )}

              {/* Chips em uma linha */}
              {showAdvanced && (
              <div className="grid grid-cols-2 gap-2">
                <ChipInput label="gêneros" value={form.genres} onChange={(v) => setForm({ ...form, genres: v })} max={10} placeholder="FPS, RPG..." />
                <ChipInput label="tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} max={20} placeholder="Co-op..." />
              </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
                >
                  {showAdvanced ? '− menos opções' : '+ mais opções'}
                </button>
                <div className="flex gap-2">
                <Button type="button" variant="subtle" onClick={() => { setForm(emptyForm); setShowForm(false); setShowAdvanced(false) }}>
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
      )}

      {/* Filter bar */}
      {games.data && games.data.length > 0 && (
        <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            aria-label="buscar jogo"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="buscar..."
            className="rounded-sm border border-nerv-line bg-black/40 px-3 py-1 text-xs focus:border-nerv-orange focus:outline-none"
          />
          {STAGE_VALUES.map((s) => {
            const active = stageFilter.has(s)
            return (
              <button
                key={s}
                onClick={() => toggleStage(s)}
                className={`rounded-sm border px-2 py-1 text-[10px] uppercase tracking-wider transition-all ${
                  active
                    ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                    : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
                }`}
              >
                {s}
              </button>
            )
          })}
          {(stageFilter.size > 0 || genreFilter.size > 0 || search) && (
            <button
              onClick={() => { setStageFilter(new Set()); setGenreFilter(new Set()); setSearch('') }}
              className="text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-orange"
            >
              limpar
            </button>
          )}
          <span className="ml-auto text-[10px] uppercase tracking-wider text-nerv-dim">
            {filteredGames?.length ?? 0} de {games.data.length}
          </span>
        </div>
        {topGenres.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            <span className="text-[9px] uppercase tracking-wider text-nerv-dim/60">gêneros</span>
            {topGenres.map((g) => {
              const active = genreFilter.has(g)
              return (
                <button
                  key={g}
                  onClick={() => toggleGenre(g)}
                  className={`rounded-full border px-2.5 py-0.5 text-[10px] transition-all ${
                    active
                      ? 'border-nerv-magenta/60 bg-nerv-magenta/10 text-nerv-magenta'
                      : 'border-nerv-line/50 text-nerv-dim transition-colors hover:border-nerv-magenta/40 hover:text-nerv-magenta/80'
                  }`}
                >
                  {g}
                </button>
              )
            })}
          </div>
        )}
        </div>
      )}

      {games.isLoading && <Loading />}
      {games.error && <ErrorBox error={games.error} />}
      {games.data && games.data.length === 0 && (
        <EmptyState title="biblioteca vazia" hint="adicione o primeiro jogo para começar uma votação" />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filteredGames?.map((g, i) => {
          const cover = steamCover(g)
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <div
                onClick={() => navigate(`/groups/${id}/games/${g.id}`)}
                className="group relative cursor-pointer overflow-hidden rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 transition-colors hover:border-nerv-orange/50"
              >
                {cover ? (
                  <div className="relative h-32 overflow-hidden">
                    <img
                      src={cover}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                      alt={g.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-nerv-panel via-nerv-panel/30 to-transparent" />
                    <div className={`absolute right-2 top-2 rounded-sm bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-wider backdrop-blur-sm ${STAGE_COLOR[g.stage]}`}>
                      {g.stage}
                    </div>
                    {g.is_free && (
                      <div className="absolute left-2 top-2 rounded-sm border border-nerv-green/60 bg-black/70 px-2 py-0.5 text-[9px] uppercase tracking-wider text-nerv-green backdrop-blur-sm">
                        free
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-nerv-line to-black">
                    <span className="font-display text-4xl text-nerv-orange/30">?</span>
                  </div>
                )}

                <div className="p-3">
                  <div className="mb-2 truncate text-sm font-semibold text-nerv-text">{g.name}</div>

                  <div className="mb-2">
                    <div className="mb-1 flex items-center justify-between text-[9px] uppercase tracking-wider text-nerv-dim">
                      <span>viabilidade</span>
                      <span className="text-nerv-orange">{(g.viability.viability_score).toFixed(0)}%</span>
                    </div>
                    <div className="h-1 overflow-hidden rounded-sm bg-nerv-line">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${g.viability.viability_score}%` }}
                        transition={{ duration: 0.6, delay: i * 0.03 }}
                        className="h-full bg-gradient-to-r from-nerv-orange to-nerv-amber"
                      />
                    </div>
                  </div>

                  <div className="mb-2 flex gap-3 text-[9px] uppercase tracking-wider text-nerv-dim">
                    <span>quero <span className="text-nerv-green">{g.viability.interest_want_count}</span></span>
                    <span>tem <span className="text-nerv-amber">{g.viability.ownership_count}</span></span>
                  </div>

                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    {SIGNALS.map((s) => (
                      <button
                        key={s.value}
                        onClick={() => setInt.mutate({ gameId: g.id, signal: s.value })}
                        className={`flex-1 rounded-sm border px-1 py-1 text-[9px] uppercase tracking-wider transition-all ${
                          g.user_interest === s.value
                            ? `${s.color} bg-current/10`
                            : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-text'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleOwn.mutate({ gameId: g.id, owns: !g.user_owns_game }) }}
                    className={`mt-1.5 w-full rounded-sm border px-2 py-1 text-[9px] uppercase tracking-wider transition-all ${
                      g.user_owns_game
                        ? 'border-nerv-green bg-nerv-green/10 text-nerv-green'
                        : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
                    }`}
                  >
                    {g.user_owns_game ? '✓ na biblioteca' : 'marcar como tenho'}
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
