import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { groupKey } from '@/features/groups/hooks'
import { updateWebhook } from '@/features/groups/api'
import { useToast } from '@/components/ui/toast'

export function WebhookSection({ groupId, current }: { groupId: string; current: string | null }) {
  const toast = useToast()
  const qc = useQueryClient()
  const [value, setValue] = useState(current ?? '')
  const [editing, setEditing] = useState(false)
  const mut = useMutation({
    mutationFn: (url: string | null) => updateWebhook(groupId, url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: groupKey(groupId) })
      toast.success('webhook atualizado')
      setEditing(false)
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'falha ao atualizar'),
  })
  const save = () => {
    const v = value.trim()
    if (v && !v.startsWith('https://discord.com/api/webhooks/') && !v.startsWith('https://discordapp.com/api/webhooks/')) {
      toast.error('URL invalida')
      return
    }
    mut.mutate(v || null)
  }
  const clear = () => {
    setValue('')
    mut.mutate(null)
  }
  const masked = current ? current.slice(0, 48) + '...' : '-- não configurado'
  return (
    <section className="rounded-sm border border-nerv-orange/20 bg-nerv-panel/30 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[11px] uppercase tracking-wider text-nerv-dim">Discord Webhook</div>
          <p className="mt-1 text-[11px] text-nerv-dim/80">
            Usado pra avisar o servidor quando votação abre ou sessão é agendada. Cole a URL de um webhook criado no canal do Discord.
          </p>
          {!editing && (
            <div className="mt-2 truncate font-mono text-[11px] text-nerv-text/80">{masked}</div>
          )}
        </div>
        {!editing && (
          <button
            onClick={() => { setValue(current ?? ''); setEditing(true) }}
            className="shrink-0 rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/50 hover:text-nerv-orange"
          >
            Editar
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
            placeholder="https://discord.com/api/webhooks/..."
            className="h-9 w-full rounded-sm border border-nerv-line bg-black/40 px-2 text-xs text-nerv-text focus:border-nerv-orange focus:outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <button
              onClick={save}
              disabled={mut.isPending}
              className="rounded-sm border border-nerv-orange/60 bg-nerv-orange/15 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-orange transition-colors hover:bg-nerv-orange/25 disabled:opacity-40"
            >
              {mut.isPending ? 'salvando...' : 'salvar'}
            </button>
            <button
              onClick={() => { setEditing(false); setValue(current ?? '') }}
              className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-line/70 hover:text-nerv-text"
            >
              cancelar
            </button>
            {current && (
              <button
                onClick={clear}
                disabled={mut.isPending}
                className="ml-auto rounded-sm border border-nerv-red/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red transition-colors hover:bg-nerv-red/10 disabled:opacity-40"
              >
                remover
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
