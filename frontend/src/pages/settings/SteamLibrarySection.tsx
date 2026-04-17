import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/core/Button'
import { useToast } from '@/components/ui/toast'
import { SettingsCard } from './SettingsCard'

export function SteamLibrarySection() {
  const toast = useToast()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ owned: number; matched: number } | null>(null)

  const run = async () => {
    const v = input.trim()
    if (!v) return
    setLoading(true)
    try {
      const r = await api<{ owned_count: number; matched_count: number; steam_id: string }>(
        '/steam/library/import',
        { method: 'POST', body: { steam_id_or_vanity: v } },
      )
      setResult({ owned: r.owned_count, matched: r.matched_count })
      toast.success(`dos ${r.owned_count} jogos na sua steam, ${r.matched_count} batem com o catálogo`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao importar')
    } finally {
      setLoading(false)
    }
  }

  const action = (
    <a
      href="https://steamcommunity.com/my/profile"
      target="_blank"
      rel="noreferrer"
      className="text-xs text-up-orange underline underline-offset-4 transition-colors hover:text-up-text"
    >
      Abrir meu perfil
    </a>
  )

  return (
    <SettingsCard
      title="Biblioteca Steam"
      description="Importe seus jogos para marcar automaticamente o que você já tem, em todos os grupos."
      action={action}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Cole a URL do seu perfil Steam"
          className="h-9 min-w-[240px] flex-1 rounded-sm border border-up-line bg-black/50 px-3 text-sm text-up-text placeholder:text-up-dim focus-visible:border-up-orange focus-visible:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) run()
          }}
        />
        <Button onClick={run} disabled={loading || !input.trim()} size="sm">
          {loading ? 'Importando...' : 'Importar'}
        </Button>
      </div>

      {result && (
        <p className="mt-3 text-xs text-up-green">
          {result.matched} de {result.owned} jogos vinculados.
        </p>
      )}

      <p className="mt-3 text-xs text-up-dim">
        Seu perfil precisa estar com <strong className="text-up-text">Detalhes do jogo</strong> em <strong className="text-up-text">Público</strong> nas configurações da Steam.
      </p>
    </SettingsCard>
  )
}
