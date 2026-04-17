import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import type { UseMutationResult } from '@tanstack/react-query'
import type { Game, GameUpdateInput, HardwareTier } from '@/features/games/api'
import { useToast } from '@/components/ui/toast'
import { Textarea } from '@/components/ui/Textarea'
import { TIERS } from '@/lib/constants'

const inputCls =
  'h-9 w-full rounded-sm border border-up-line bg-black/30 px-3 text-sm text-up-text placeholder:text-up-dim transition-colors focus-visible:border-up-orange focus-visible:outline-none'

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

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', handler)
    }
  }, [onClose])

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

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -4 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg overflow-y-auto rounded-lg border border-up-orange/25 bg-up-panel shadow-2xl shadow-black/40 max-h-[calc(100vh-4rem)]"
        role="dialog"
        aria-modal="true"
        aria-label="editar jogo"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-up-orange/15 px-6 py-4">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-up-orange">editar jogo</div>
          <button
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-sm text-up-dim transition-colors hover:bg-up-line/30 hover:text-up-text"
            aria-label="fechar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          {/* identidade */}
          <Field label="nome">
            <input
              value={edit.name}
              maxLength={150}
              onChange={(e) => setEdit({ ...edit, name: e.target.value })}
              placeholder="nome do jogo"
              className={inputCls}
            />
          </Field>

          <Field label="capa">
            <div className="flex items-center gap-3">
              {edit.cover_url && (
                <img
                  loading="lazy"
                  src={edit.cover_url}
                  alt=""
                  className="h-9 w-16 shrink-0 rounded-sm border border-up-line object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                />
              )}
              <input
                value={edit.cover_url}
                maxLength={500}
                onChange={(e) => setEdit({ ...edit, cover_url: e.target.value })}
                placeholder="url da imagem"
                className={`${inputCls} flex-1`}
              />
            </div>
          </Field>

          <Field label="descricao">
            <Textarea
              value={edit.description}
              maxLength={2000}
              onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              rows={3}
              placeholder="sobre o jogo"
              spellCheck={false}
              className="w-full resize-none rounded-sm border border-up-line bg-black/30 px-3 py-2 text-sm text-up-text transition-colors placeholder:text-up-dim focus-visible:border-up-orange focus-visible:outline-none"
            />
          </Field>

          {/* metricas */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="preco">
              <div className="flex items-center gap-2">
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
                  className={`${inputCls} w-28 tabular-nums disabled:opacity-40`}
                />
                <button
                  type="button"
                  onClick={() => setEdit({ ...edit, is_free: !edit.is_free })}
                  className={`h-9 rounded-sm border px-3 text-[10px] uppercase tracking-wider transition-colors ${
                    edit.is_free ? 'border-up-green/60 bg-up-green/10 text-up-green' : 'border-up-line text-up-dim hover:border-up-green hover:text-up-green'
                  }`}
                >
                  {edit.is_free ? 'free' : 'free?'}
                </button>
              </div>
            </Field>

            <Field label="jogadores">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  value={edit.player_min}
                  onChange={(e) => setEdit({ ...edit, player_min: Number(e.target.value) || 1 })}
                  className={`${inputCls} w-16 px-2 text-center tabular-nums`}
                />
                <span className="text-up-dim">-</span>
                <input
                  type="number"
                  min="1"
                  value={edit.player_max ?? ''}
                  onChange={(e) => setEdit({ ...edit, player_max: e.target.value ? Number(e.target.value) : null })}
                  placeholder="max"
                  className={`${inputCls} w-16 px-2 text-center tabular-nums`}
                />
              </div>
            </Field>
          </div>

          <Field label="hardware minimo">
            <div className="flex gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEdit({ ...edit, min_hardware_tier: t })}
                  className={`h-9 flex-1 rounded-sm border text-[10px] uppercase tracking-wider transition-colors ${
                    edit.min_hardware_tier === t
                      ? 'border-up-orange/60 bg-up-orange/10 text-up-orange'
                      : 'border-up-line text-up-dim hover:border-up-orange hover:text-up-text'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {/* footer */}
          <div className="flex justify-end gap-2 border-t border-up-orange/15 pt-4">
            <button
              onClick={onClose}
              className="rounded-sm border border-up-line px-4 py-2 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-text hover:text-up-text"
            >
              cancelar
            </button>
            <button
              onClick={save}
              disabled={update.isPending || !edit.name}
              className="rounded-sm border border-up-orange/60 bg-up-orange/10 px-4 py-2 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/20 disabled:opacity-40"
            >
              {update.isPending ? 'salvando...' : 'salvar'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-wider text-up-dim">{label}</div>
      {children}
    </div>
  )
}
