import { useState } from 'react'
import { motion } from 'framer-motion'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
      <ConfirmDialog
        open={confirmKind === 'reset'}
        title={t.admin.resetData}
        message={t.admin.resetConfirmShort}
        confirmLabel={resetPending ? t.admin.resetting : t.admin.yesResetBtn}
        tone="warn"
        pending={resetPending}
        onConfirm={async () => { await onConfirmReset(); setConfirmKind(null) }}
        onCancel={() => setConfirmKind(null)}
      />
      <ConfirmDialog
        open={confirmKind === 'destroy'}
        title={t.admin.deleteServerBtn}
        message={t.admin.deleteConfirmShort}
        confirmLabel={deletePending ? t.admin.deleting : t.admin.yesDeleteBtn}
        tone="danger"
        pending={deletePending}
        onConfirm={async () => { await onConfirmDelete(); setConfirmKind(null) }}
        onCancel={() => setConfirmKind(null)}
      />
    </motion.section>
  )
}
