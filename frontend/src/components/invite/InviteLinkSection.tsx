import { useState } from 'react'
import { useMe } from '@/features/auth/hooks'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from '@/pages/settings/SettingsCard'

export function InviteLinkSection() {
  const me = useMe()
  const toast = useToast()
  const [copied, setCopied] = useState(false)
  if (!me.data) return null

  const url = `${window.location.origin}/?ref=${me.data.id}`

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('link copiado')
      setTimeout(() => setCopied(false), 1800)
    } catch {
      toast.error('falha ao copiar')
    }
  }

  return (
    <SettingsCard
      title="Seu link de convite"
      description="Cada pessoa que entra por este link fica creditada como sua indicação."
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code
          title={url}
          className="flex-1 truncate rounded-sm border border-up-line bg-black/60 px-3 py-2 font-mono text-xs text-up-text"
        >
          {url}
        </code>
        <button
          onClick={onCopy}
          className="rounded-sm border border-up-orange/40 bg-up-orange/5 px-4 py-2 text-xs text-up-orange transition-colors hover:bg-up-orange/15"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </SettingsCard>
  )
}
