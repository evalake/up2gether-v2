import { motion, AnimatePresence } from 'framer-motion'
import type { HardwareTier } from '@/features/games/api'
import type { SteamSearchItem } from '@/features/steam/api'
import { Textarea } from '@/components/ui/Textarea'
import { SteamThumb } from '@/components/SteamThumb'
import { TIERS } from '@/lib/constants'
import { ChipInput } from './ChipInput'

const JUNK_RE = /\b(dlc|soundtrack|ost|avatar|skin|unlock|artbook|art book|demo|wallpaper|costume|pack|bundle|season pass)\b/i
function steamItemTag(name: string): string | null {
  const m = name.match(JUNK_RE)
  if (!m) return null
  const k = m[1].toLowerCase()
  if (k === 'ost' || k === 'soundtrack') return 'ost'
  if (k === 'dlc' || k === 'season pass') return 'dlc'
  if (k === 'demo') return 'demo'
  if (k === 'avatar' || k === 'skin' || k === 'unlock' || k === 'costume' || k === 'wallpaper') return 'item'
  if (k === 'artbook' || k === 'art book') return 'artbook'
  if (k === 'pack' || k === 'bundle') return 'pack'
  return null
}

const HW_LABEL: Record<string, string> = { low: 'leve', mid: 'medio', high: 'pesado', unknown: 'n/a' }

export type FormState = {
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
  source?: 'steam' | 'riot' | 'epic' | 'manual'
}

export const emptyForm: FormState = {
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

// -- Steam results list (inline, not dropdown) --

export function SteamResultsList({ hits, onPick }: { hits: SteamSearchItem[]; onPick: (it: SteamSearchItem) => void }) {
  return (
    <div>
      {hits.map((it, i) => {
        const tag = it.source && it.source !== 'steam' ? null : steamItemTag(it.name)
        const isJunk = !!tag
        return (
          <button
            key={it.slug ?? it.appid ?? i}
            type="button"
            onClick={() => onPick(it)}
            className={`flex w-full items-center gap-3 border-b border-up-line/20 px-4 py-2.5 text-left transition-colors hover:bg-up-orange/10 ${isJunk ? 'opacity-60' : ''}`}
          >
            {it.appid ? (
              <SteamThumb appid={it.appid} alt={it.name} className="h-9 w-[72px] shrink-0 rounded-sm object-cover" />
            ) : (
              <img loading="lazy" src={it.header_image ?? ''} alt={it.name} className="h-9 w-[72px] shrink-0 rounded-sm object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm text-up-text">{it.name}</div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                {it.source && it.source !== 'steam' ? (
                  <span className="rounded-sm border border-up-magenta/40 bg-up-magenta/10 px-1.5 py-px text-up-magenta">{it.source}</span>
                ) : (
                  <>
                    {tag ? (
                      <span className="rounded-sm border border-up-amber/40 bg-up-amber/10 px-1.5 py-px font-semibold uppercase text-up-amber">{tag}</span>
                    ) : (
                      <span className="rounded-sm border border-up-green/40 bg-up-green/10 px-1.5 py-px text-up-green">jogo</span>
                    )}
                    <span className="text-up-dim">#{it.appid}</span>
                  </>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// -- Steam preview after picking --

export function SteamPreview({ form, onClear }: { form: FormState; onClear: () => void }) {
  const priceLabel = form.is_free
    ? 'gratuito'
    : form.price_current
      ? `R$ ${Number(form.price_current).toFixed(2)}`
      : 'sem preco'

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-green">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-up-green mr-1.5" />
        pronto para adicionar
      </div>

      {form.cover_url && (
        <div className="overflow-hidden rounded-sm border border-up-line/30">
          <img
            src={form.cover_url}
            alt={form.name}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            className="h-36 w-full object-cover"
          />
        </div>
      )}

      <div>
        <div className="font-display text-xl leading-tight text-up-text">{form.name}</div>
        {form.developer && (
          <div className="mt-0.5 text-xs text-up-dim">{form.developer}</div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-sm border border-up-line/40 bg-up-panel/30 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">preco</div>
          <div className={`mt-0.5 text-sm font-semibold ${form.is_free ? 'text-up-green' : 'text-up-text'}`}>{priceLabel}</div>
        </div>
        <div className="rounded-sm border border-up-line/40 bg-up-panel/30 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">jogadores</div>
          <div className="mt-0.5 text-sm font-semibold text-up-text">
            {form.player_min}{form.player_max ? `-${form.player_max}` : '+'}
          </div>
        </div>
        <div className="rounded-sm border border-up-line/40 bg-up-panel/30 py-1.5">
          <div className="font-mono text-[10px] uppercase tracking-wider text-up-dim">hardware</div>
          <div className="mt-0.5 text-sm font-semibold text-up-text">{HW_LABEL[form.min_hardware_tier]}</div>
        </div>
      </div>

      {form.genres.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {form.genres.slice(0, 8).map((g) => (
            <span key={g} className="rounded-sm border border-up-magenta/40 bg-up-magenta/10 px-2 py-0.5 text-[10px] text-up-magenta">{g}</span>
          ))}
          {form.genres.length > 8 && (
            <span className="px-1 text-[10px] text-up-dim">+{form.genres.length - 8}</span>
          )}
        </div>
      )}

      {form.description && (
        <p className="line-clamp-3 text-xs leading-relaxed text-up-dim">{form.description}</p>
      )}

      <button
        type="button"
        onClick={onClear}
        className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
      >
        buscar outro
      </button>
    </motion.div>
  )
}

// -- Manual form --

export function ManualForm({
  form, setForm, showAdvanced, setShowAdvanced,
}: {
  form: FormState
  setForm: (f: FormState) => void
  showAdvanced: boolean
  setShowAdvanced: (v: boolean) => void
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-up-dim">Preencha os dados basicos. Use "mais opcoes" para campos extras.</p>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">nome *</label>
        <input
          autoFocus
          value={form.name}
          maxLength={150}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="nome do jogo"
          className="h-9 w-full rounded-sm border border-up-line bg-black/40 px-3 text-sm focus-visible:border-up-orange focus-visible:outline-none"
        />
      </div>

      <div className="grid grid-cols-12 gap-2">
        <div className="col-span-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">preco</label>
          <input
            type="number"
            step="0.01"
            min="0"
            disabled={form.is_free}
            value={form.is_free ? '' : form.price_current}
            onChange={(e) => setForm({ ...form, price_current: e.target.value })}
            placeholder="R$"
            className="h-9 w-full rounded-sm border border-up-line bg-black/40 px-3 text-sm focus-visible:border-up-orange focus-visible:outline-none disabled:opacity-40"
          />
        </div>
        <div className="col-span-2 flex items-end">
          <button
            type="button"
            onClick={() => setForm({ ...form, is_free: !form.is_free })}
            className={`h-9 w-full rounded-sm border text-[10px] uppercase tracking-wider transition-colors ${
              form.is_free
                ? 'border-up-green bg-up-green/10 text-up-green'
                : 'border-up-line text-up-dim hover:border-up-green'
            }`}
          >
            {form.is_free ? 'gratis' : 'gratis?'}
          </button>
        </div>
        <div className="col-span-6">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">jogadores</label>
          <div className="flex h-9 items-center gap-1 rounded-sm border border-up-line bg-black/40 px-3">
            <input
              type="number"
              min="1"
              value={form.player_min}
              onChange={(e) => setForm({ ...form, player_min: Number(e.target.value) || 1 })}
              className="w-10 bg-transparent text-center text-sm focus-visible:outline-none"
            />
            <span className="text-up-dim">-</span>
            <input
              type="number"
              min="1"
              value={form.player_max ?? ''}
              onChange={(e) => setForm({ ...form, player_max: e.target.value ? Number(e.target.value) : null })}
              placeholder="max"
              className="w-10 bg-transparent text-center text-sm focus-visible:outline-none"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">descricao</label>
        <Textarea
          value={form.description}
          maxLength={2000}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          rows={2}
          placeholder="opcional"
          spellCheck={false}
        />
      </div>

      <AnimatePresence>
        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            <div>
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">hardware</label>
              <div className="flex gap-1">
                {TIERS.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, min_hardware_tier: t })}
                    className={`h-8 flex-1 rounded-sm border text-[10px] uppercase tracking-wider transition-colors ${
                      form.min_hardware_tier === t
                        ? 'border-up-orange bg-up-orange/10 text-up-orange'
                        : 'border-up-line text-up-dim hover:border-up-orange'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <ChipInput label="generos" value={form.genres} onChange={(v) => setForm({ ...form, genres: v })} max={10} placeholder="FPS, RPG..." />
              <ChipInput label="tags" value={form.tags} onChange={(v) => setForm({ ...form, tags: v })} max={20} placeholder="Co-op..." />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">steam appid</label>
                <input
                  value={form.steam_appid}
                  onChange={(e) => setForm({ ...form, steam_appid: e.target.value })}
                  placeholder="opcional"
                  className="h-8 w-full rounded-sm border border-up-line bg-black/40 px-2 text-xs focus-visible:border-up-orange focus-visible:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-up-dim">cover url</label>
                <input
                  value={form.cover_url}
                  onChange={(e) => setForm({ ...form, cover_url: e.target.value })}
                  placeholder="opcional"
                  className="h-8 w-full rounded-sm border border-up-line bg-black/40 px-2 text-xs focus-visible:border-up-orange focus-visible:outline-none"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        className="text-[10px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-orange"
      >
        {showAdvanced ? '- menos opcoes' : '+ mais opcoes'}
      </button>
    </div>
  )
}
