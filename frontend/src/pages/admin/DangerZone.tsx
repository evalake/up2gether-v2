import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export function DangerZone({
  onConfirmReset,
  onConfirmDelete,
  resetPending,
  deletePending,
}: {
  onConfirmReset: () => Promise<void> | void
  onConfirmDelete: () => Promise<void> | void
  resetPending: boolean
  deletePending: boolean
}) {
  const [confirmKind, setConfirmKind] = useState<null | 'reset' | 'destroy'>(null)

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-sm border border-nerv-red/20 bg-nerv-red/5 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-nerv-red/80">Zona Perigosa</div>
          <p className="mt-0.5 text-[11px] text-nerv-dim">Acoes irreversiveis. So o dono do servidor ve.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmKind('reset')}
            className="rounded-sm border border-nerv-amber/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-amber transition-colors hover:bg-nerv-amber/10"
          >
            Resetar Dados
          </button>
          <button
            onClick={() => setConfirmKind('destroy')}
            className="rounded-sm border border-nerv-red/50 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red transition-colors hover:bg-nerv-red/10"
          >
            Excluir Servidor
          </button>
        </div>
      </div>
      <AnimatePresence>
        {confirmKind === 'reset' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-amber/30 bg-black/30 p-3">
              <p className="text-xs text-nerv-amber">
                Apaga jogos, votacoes, temas e sessoes. Mantem grupo e membros. Tem certeza?
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text">cancelar</button>
                <button
                  onClick={async () => { await onConfirmReset(); setConfirmKind(null) }}
                  disabled={resetPending}
                  className="rounded-sm border border-nerv-amber/60 bg-nerv-amber/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-amber disabled:opacity-40"
                >
                  {resetPending ? 'resetando...' : 'sim, resetar'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {confirmKind === 'destroy' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-nerv-red/40 bg-black/30 p-3">
              <p className="text-xs text-nerv-red">
                Apaga o servidor e tudo dentro. Nao da pra desfazer. Tem certeza?
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:text-nerv-text">cancelar</button>
                <button
                  onClick={async () => { await onConfirmDelete(); setConfirmKind(null) }}
                  disabled={deletePending}
                  className="rounded-sm border border-nerv-red/60 bg-nerv-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-nerv-red disabled:opacity-40"
                >
                  {deletePending ? 'excluindo...' : 'sim, excluir'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
