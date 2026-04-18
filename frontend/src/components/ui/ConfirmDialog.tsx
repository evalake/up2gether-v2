// modal de confirmacao reusavel. substitui window.confirm() (que e bloqueante,
// nao da pra estilizar e quebra E2E em headless).
//
// padroes do modal sao do CLAUDE.md: createPortal, body scroll lock,
// blur-md, rounded-lg, borda orange/25, escape, ARIA, AnimatePresence.
//
// uso direto (controlled, com pending state proprio):
//   <ConfirmDialog open={isOpen} onConfirm={...} onCancel={...} title=... message=... />
//
// uso imperativo via hook (sem pending interno, caller cuida do async):
//   const confirm = useConfirm()
//   if (await confirm({ title: 'apagar?', tone: 'danger' })) doIt()

import { useCallback, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { create } from 'zustand'
import { useT } from '@/i18n'

export type ConfirmTone = 'danger' | 'warn' | 'neutral'

export type ConfirmDialogProps = {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
  pending?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

const toneClasses: Record<ConfirmTone, { border: string; bg: string; text: string; hover: string }> = {
  danger: {
    border: 'border-up-red/60',
    bg: 'bg-up-red/10',
    text: 'text-up-red',
    hover: 'hover:bg-up-red hover:text-up-bg',
  },
  warn: {
    border: 'border-up-amber/60',
    bg: 'bg-up-amber/10',
    text: 'text-up-amber',
    hover: 'hover:bg-up-amber hover:text-up-bg',
  },
  neutral: {
    border: 'border-up-orange/60',
    bg: 'bg-up-orange/10',
    text: 'text-up-orange',
    hover: 'hover:bg-up-orange hover:text-up-bg',
  },
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = 'neutral',
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const t = useT()
  const cancelBtnRef = useRef<HTMLButtonElement>(null)
  const tones = toneClasses[tone]

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, pending, onCancel])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // foca no cancel: enter destrutivo nao confirma sem leitura
    cancelBtnRef.current?.focus()
    return () => { document.body.style.overflow = prev }
  }, [open])

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={pending ? undefined : onCancel}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md"
        >
          <motion.div
            key="panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby={message ? 'confirm-msg' : undefined}
            initial={{ opacity: 0, scale: 0.94, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-lg border border-up-orange/25 bg-up-panel p-5 shadow-[0_20px_80px_-20px_rgba(255,102,0,0.35)]"
          >
            <h2 id="confirm-title" className="text-sm font-semibold uppercase tracking-wider text-up-text">
              {title}
            </h2>
            {message && (
              <p id="confirm-msg" className="mt-2 text-sm leading-relaxed text-up-dim">
                {message}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelBtnRef}
                onClick={onCancel}
                disabled={pending}
                className="rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-text disabled:opacity-40"
              >
                {cancelLabel ?? t.common.cancel}
              </button>
              <button
                onClick={() => { void onConfirm() }}
                disabled={pending}
                className={`rounded-sm border ${tones.border} ${tones.bg} px-3 py-1.5 text-[11px] uppercase tracking-wider ${tones.text} transition-colors ${tones.hover} disabled:opacity-40`}
              >
                {pending ? '...' : (confirmLabel ?? t.common.confirm)}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}

// ----- imperative hook + host -----

type ConfirmRequest = Omit<ConfirmDialogProps, 'open' | 'onConfirm' | 'onCancel' | 'pending'>

type ConfirmStore = {
  request: ConfirmRequest | null
  resolve: ((ok: boolean) => void) | null
  ask: (req: ConfirmRequest) => Promise<boolean>
  close: (ok: boolean) => void
}

const useConfirmStore = create<ConfirmStore>((set, get) => ({
  request: null,
  resolve: null,
  ask: (req) =>
    new Promise<boolean>((resolve) => {
      // se ja tem um aberto, resolve false antes (evita perder o resolver)
      const prev = get().resolve
      if (prev) prev(false)
      set({ request: req, resolve })
    }),
  close: (ok) => {
    const r = get().resolve
    if (r) r(ok)
    set({ request: null, resolve: null })
  },
}))

/** retorna funcao async pra abrir o modal. resolve true se confirmar, false se cancelar.
 *  o componente <ConfirmHost /> precisa estar montado uma vez no app root. */
export function useConfirm() {
  return useConfirmStore((s) => s.ask)
}

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request)
  const close = useConfirmStore((s) => s.close)
  const onConfirm = useCallback(() => close(true), [close])
  const onCancel = useCallback(() => close(false), [close])

  return (
    <ConfirmDialog
      open={!!request}
      title={request?.title ?? ''}
      message={request?.message}
      confirmLabel={request?.confirmLabel}
      cancelLabel={request?.cancelLabel}
      tone={request?.tone}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
