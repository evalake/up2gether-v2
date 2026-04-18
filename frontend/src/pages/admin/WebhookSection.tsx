import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupKey } from '@/features/groups/hooks'
import { updateWebhook } from '@/features/groups/api'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'

export function WebhookSection({ groupId, current }: { groupId: string; current: string | null }) {
  const t = useT()
  const toast = useToast()
  const qc = useQueryClient()
  const [value, setValue] = useState(current ?? '')
  const [editing, setEditing] = useState(false)
  const mut = useMutation({
    mutationFn: (url: string | null) => updateWebhook(groupId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKey(groupId) })
      toast.success(t.admin.webhookUpdated)
      setEditing(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : t.admin.webhookUpdateFail),
  })
  const save = () => {
    const v = value.trim()
    if (v && !v.startsWith('https://discord.com/api/webhooks/') && !v.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error(t.admin.webhookInvalid)
      return
    }
    mut.mutate(v || null)
  }
  const clear = () => {
    setValue('')
    mut.mutate(null)
  }
  const masked = current ? current.slice(0, 48) + '...' : t.admin.webhookNotSet
  return (
    <section className="rounded-sm border border-up-orange/20 bg-up-panel/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-up-dim">{t.admin.webhookTitle}</div>
          <p className="mt-1 text-[11px] text-up-dim">
            {t.admin.webhookLegend}
          </p>
          {!editing && (
            <div className="mt-2 truncate font-mono text-[11px] text-up-text">{masked}</div>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => { setValue(current ?? ''); setEditing(true) }}
            className="shrink-0 rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-orange hover:text-up-orange"
          >
            {t.admin.editBtn}
          </button>
        )}
      </div>
      <AnimatePresence>
      {editing && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
        <div className="mt-3 space-y-2">
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={t.admin.webhookPlaceholder}
            maxLength={512}
            className="h-9 w-full rounded-sm border border-up-line bg-black/40 px-2 text-xs text-up-text focus-visible:border-up-orange focus-visible:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={mut.isPending}
              className="rounded-sm border border-up-orange/60 bg-up-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-orange transition-colors hover:bg-up-orange/25 disabled:opacity-40"
            >
              {mut.isPending ? t.common.saving : t.common.save}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(current ?? '') }}
              className="rounded-sm border border-up-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-dim transition-colors hover:border-up-line/70 hover:text-up-text"
            >
              {t.common.cancel}
            </button>
            {current && (
              <button
                onClick={clear}
                disabled={mut.isPending}
                className="ml-auto rounded-sm border border-up-red/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-up-red transition-colors hover:bg-up-red/10 disabled:opacity-40"
              >
                {t.common.remove}
              </button>
            )}
          </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </section>
  )
}
