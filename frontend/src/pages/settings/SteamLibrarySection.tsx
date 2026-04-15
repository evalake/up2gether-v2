import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/nerv/Button'
import { useToast } from '@/components/ui/toast'

export function SteamLibrarySection() {
  const toast = useToast()
  const [vanity, setVanity] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ owned: number; matched: number } | null>(null)

  const run = async () => {
    if (!vanity.trim()) return
    setLoading(true)
    try {
      const r = await api<{ owned_count: number; matched_count: number; steam_id: string }>(
        '/steam/library/import',
        { method: 'POST', body: { steam_id_or_vanity: vanity.trim() } },
      )
      setResult({ owned: r.owned_count, matched: r.matched_count })
      toast.success(`importado: ${r.matched_count} de ${r.owned_count} jogos vinculados`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao importar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-sm border border-nerv-orange/15 bg-nerv-panel/30 p-5">
      <div className="mb-3 text-[11px] uppercase tracking-wider text-nerv-dim">Biblioteca Steam</div>
      <p className="mb-2 text-xs text-nerv-text/70">
        Importe sua lista de jogos pra marcar automaticamente tudo que você possui em todos os grupos. Vale também pros jogos adicionados depois.
      </p>
      <ol className="mb-3 list-decimal space-y-1 pl-5 text-[11px] text-nerv-text/60">
        <li>Clique em <strong>Abrir Meu Perfil</strong> (abre numa aba nova, já logado).</li>
        <li>
          Copie a URL inteira da barra de endereço, algo como{' '}
          <code className="text-nerv-text/80">steamcommunity.com/id/seunick</code> ou{' '}
          <code className="text-nerv-text/80">steamcommunity.com/profiles/76561198...</code>
        </li>
        <li>Cole no campo abaixo e clique em Importar.</li>
        <li>
          Seu perfil precisa estar com <strong>Detalhes do jogo</strong> em <strong>Público</strong> nas configs de privacidade da Steam.
        </li>
      </ol>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={vanity}
          onChange={(e) => setVanity(e.target.value)}
          placeholder="Cole aqui a URL, nick ou steam id"
          className="h-9 flex-1 min-w-[220px] rounded-sm border border-nerv-line bg-black/40 px-3 text-xs focus-visible:border-nerv-orange focus-visible:outline-none"
        />
        <a
          href="https://steamcommunity.com/my/profile"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-sm border border-nerv-line px-3 text-[10px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/60 hover:text-nerv-orange"
        >
          Abrir Meu Perfil
        </a>
        <Button onClick={run} disabled={loading || !vanity.trim()}>
          {loading ? 'Importando...' : 'Importar'}
        </Button>
      </div>
      {result && (
        <div className="mt-3 text-[11px] text-nerv-green">
          {result.matched} de {result.owned} jogos vinculados
        </div>
      )}
    </section>
  )
}
