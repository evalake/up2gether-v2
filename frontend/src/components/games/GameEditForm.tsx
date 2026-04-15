import { useState } from 'react'
import { motion } from 'framer-motion'
import type { UseMutationResult } from '@tanstack/react-query'
import type { Game, GameUpdateInput, HardwareTier } from '@/features/games/api'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/Textarea'
import { TIERS } from '@/lib/constants'

type EditState = {
  name: string
  cover_url: string
  description: string
  is_free: boolean
  price_current: string
  player_min: number
  player_max: number | null
  min_hardware_tier: HardwareTier
}

function initialEdit(g: Game): EditState {
  return {
    name: g.name,
    cover_url: g.cover_url ?? '',
    description: g.description ?? '',
    is_free: g.is_free,
    price_current: g.price_current?.toString() ?? '',
    player_min: g.player_min,
    player_max: g.player_max,
    min_hardware_tier: g.min_hardware_tier,
  }
}

export function GameEditForm({
  game,
  update,
  onClose,
}: {
  game: Game
  update: UseMutationResult<Game, Error, GameUpdateInput>
  onClose: () => void
}) {
  const toast = useToast()
  const [edit, setEdit] = useState<EditState>(() => initialEdit(game))

  const save = async () => {
    try {
      await update.mutateAsync({
        name: edit.name,
        cover_url: edit.cover_url || null,
        description: edit.description || null,
        is_free: edit.is_free,
        price_current: edit.is_free ? 0 : edit.price_current ? Number(edit.price_current) : null,
        player_min: edit.player_min,
        player_max: edit.player_max,
        min_hardware_tier: edit.min_hardware_tier,
      })
      onClose()
      toast.success('jogo atualizado')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao salvar')
    }
  }

  return (
    <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5">
      <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">editar jogo</div>
      <div className="space-y-3">
        <input
          value={edit.name}
          maxLength={150}
          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
          placeholder="nome"
          className="h-8 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none"
        />
        <div className="flex items-center gap-2">
          {edit.cover_url && (
            <img loading="lazy" src={edit.cover_url} alt="" className="h-8 w-14 shrink-0 rounded-sm object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
          )}
          <input
            value={edit.cover_url}
            maxLength={500}
            onChange={(e) => setEdit({ ...edit, cover_url: e.target.value })}
            placeholder="url da capa (imagem)"
            className="h-8 flex-1 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none"
          />
        </div>
        <Textarea
          value={edit.description}
          maxLength={2000}
          onChange={(e) => setEdit({ ...edit, description: e.target.value })}
          rows={3}
          placeholder="descrição"
        />
        <div className="grid grid-cols-12 gap-2">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100000"
            disabled={edit.is_free}
            value={edit.is_free ? '' : edit.price_current}
            onChange={(e) => {
              const v = e.target.value
              if (v === '' || /^\d+(\.\d{0,2})?$/.test(v)) setEdit({ ...edit, price_current: v })
            }}
            placeholder="R$"
            className="col-span-3 h-8 rounded-sm border border-nerv-line bg-black/40 px-2 text-xs focus:border-nerv-orange focus:outline-none disabled:opacity-40"
          />
          <button
            type="button"
            onClick={() => setEdit({ ...edit, is_free: !edit.is_free })}
            className={`col-span-3 h-8 rounded-sm border text-[10px] uppercase tracking-wider ${
              edit.is_free ? 'border-nerv-green bg-nerv-green/10 text-nerv-green' : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-green/40'
            }`}
          >
            {edit.is_free ? '✓ free' : 'free?'}
          </button>
          <div className="col-span-6 flex items-center gap-1 rounded-sm border border-nerv-line bg-black/40 px-2 h-8">
            <span className="text-[10px] uppercase text-nerv-dim">players</span>
            <input
              type="number"
              min="1"
              value={edit.player_min}
              onChange={(e) => setEdit({ ...edit, player_min: Number(e.target.value) || 1 })}
              className="w-10 bg-transparent text-center text-xs focus:outline-none"
            />
            <span className="text-nerv-dim">-</span>
            <input
              type="number"
              min="1"
              value={edit.player_max ?? ''}
              onChange={(e) => setEdit({ ...edit, player_max: e.target.value ? Number(e.target.value) : null })}
              placeholder="∞"
              className="w-10 bg-transparent text-center text-xs focus:outline-none"
            />
          </div>
        </div>
        <div className="flex gap-1">
          {TIERS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setEdit({ ...edit, min_hardware_tier: t })}
              className={`h-8 flex-1 rounded-sm border text-[10px] uppercase tracking-wider transition-all ${
                edit.min_hardware_tier === t
                  ? 'border-nerv-orange bg-nerv-orange/10 text-nerv-orange'
                  : 'border-nerv-line text-nerv-dim transition-colors hover:border-nerv-orange/40'
              }`}
            >
              hw: {t}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/40"
          >
            cancelar
          </button>
          <button
            onClick={save}
            disabled={update.isPending || !edit.name}
            className="rounded-sm border border-nerv-orange bg-nerv-orange/10 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/20 disabled:opacity-40"
          >
            {update.isPending ? 'salvando...' : 'salvar'}
          </button>
        </div>
      </div>
    </motion.section>
  )
}
