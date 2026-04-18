import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useT } from '@/i18n'

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
  const t = useT()
  const [confirmKind, setConfirmKind] = useState<null | 'reset' | 'destroy'>(null)

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-sm border border-up-red/20 bg-up-red/5 p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-up-red">{t.admin.dangerZone}</div>
          <p className="mt-0.5 text-[11px] text-up-dim">{t.admin.dangerZoneSub}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setConfirmKind('reset')}
            className="rounded-sm border border-up-amber/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-amber transition-colors hover:bg-up-amber/10"
          >
            {t.admin.resetData}
          </button>
          <button
            onClick={() => setConfirmKind('destroy')}
            className="rounded-sm border border-up-red/50 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/10"
          >
            {t.admin.deleteServerBtn}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {confirmKind === 'reset' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-up-amber/30 bg-black/30 p-3">
              <p className="text-xs text-up-amber">
                {t.admin.resetConfirmShort}
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text">{t.common.cancel}</button>
                <button
                  onClick={async () => { await onConfirmReset(); setConfirmKind(null) }}
                  disabled={resetPending}
                  className="rounded-sm border border-up-amber/60 bg-up-amber/10 px-3 py-1 text-[11px] uppercase tracking-wider text-up-amber disabled:opacity-40"
                >
                  {resetPending ? t.admin.resetting : t.admin.yesResetBtn}
                </button>
              </div>
            </div>
          </motion.div>
        )}
        {confirmKind === 'destroy' && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 flex items-center justify-between gap-3 rounded-sm border border-up-red/40 bg-black/30 p-3">
              <p className="text-xs text-up-red">
                {t.admin.deleteConfirmShort}
              </p>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => setConfirmKind(null)} className="text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:text-up-text">{t.common.cancel}</button>
                <button
                  onClick={async () => { await onConfirmDelete(); setConfirmKind(null) }}
                  disabled={deletePending}
                  className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1 text-[11px] uppercase tracking-wider text-up-red disabled:opacity-40"
                >
                  {deletePending ? t.admin.deleting : t.admin.yesDeleteBtn}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
