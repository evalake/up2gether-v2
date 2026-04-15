import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { deleteMyAccount } from '@/features/users/api'
import { useToast } from '@/components/ui/toast'

const CONFIRM_PHRASE = 'EXCLUIR CONTA'

export function DangerZoneSection() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [phrase, setPhrase] = useState('')
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    if (phrase !== CONFIRM_PHRASE) return
    setLoading(true)
    try {
      await deleteMyAccount()
      toast.success('conta excluída, até logo')
      logout()
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'falha ao excluir conta')
      setLoading(false)
    }
  }

  return (
    <section className="rounded-sm border border-nerv-red/30 bg-nerv-red/5 p-5">
      <div className="mb-2 text-[11px] uppercase tracking-wider text-nerv-red/90">
        Zona de perigo
      </div>
      <p className="mb-3 text-xs leading-relaxed text-nerv-text/70">
        Excluir a sua conta remove em definitivo o seu perfil, a sua participação em todos os
        grupos, os seus votos, as suas confirmações de presença e as integrações conectadas.
        Conteúdo histórico (sessões e votações de grupos onde você foi criador) permanece no
        grupo, porém sem autoria. Esta ação é irreversível.
      </p>

      {!confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="rounded-sm border border-nerv-red/50 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red transition-colors hover:bg-nerv-red/10"
        >
          Excluir minha conta
        </button>
      )}

      {confirming && (
        <div className="space-y-3">
          <p className="text-[11px] text-nerv-red/90">
            Para confirmar, digite <strong className="font-mono">{CONFIRM_PHRASE}</strong> abaixo.
          </p>
          <input
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder={CONFIRM_PHRASE}
            className="h-9 w-full max-w-xs rounded-sm border border-nerv-red/40 bg-black/40 px-2 text-sm text-nerv-text focus-visible:border-nerv-red focus-visible:outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onDelete}
              disabled={phrase !== CONFIRM_PHRASE || loading}
              className="rounded-sm border border-nerv-red/60 bg-nerv-red/20 px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-red transition-colors hover:bg-nerv-red/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? 'Excluindo...' : 'Confirmar exclusão'}
            </button>
            <button
              onClick={() => {
                setConfirming(false)
                setPhrase('')
              }}
              disabled={loading}
              className="rounded-sm border border-nerv-line px-3 py-1.5 text-[11px] uppercase tracking-wider text-nerv-dim transition-colors hover:border-nerv-orange/40 hover:text-nerv-orange"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
