import { useState } from 'react'
import { useMe } from '@/features/auth/hooks'
import { useToast } from '@/components/ui/toast'

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
      toast.error('nao rolou copiar, selecione a mao')
    }
  }
  return (
    <section className="rounded-sm border border-nerv-green/20 bg-nerv-green/5 p-5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-green/80">
        convide a galera
      </div>
      <p className="mb-3 text-xs leading-relaxed text-nerv-text/70">
        manda esse link pra comunidade. cada signup atraves dele fica creditado pra voce no painel
        (e ajuda a gente a entender de onde vem o pessoal bom).
      </p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <code className="flex-1 truncate rounded-sm border border-nerv-line/40 bg-black/40 px-3 py-2 font-mono text-[11px] text-nerv-text">
          {url}
        </code>
        <button
          onClick={onCopy}
          className="rounded-sm border border-nerv-green/40 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-green transition-colors hover:bg-nerv-green/10"
        >
          {copied ? 'copiado' : 'copiar'}
        </button>
      </div>
    </section>
  )
}
