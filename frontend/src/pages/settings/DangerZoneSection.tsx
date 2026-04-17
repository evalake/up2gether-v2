import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { deleteMyAccount } from '@/features/users/api'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'
import { SettingsCard } from './SettingsCard'

export function DangerZoneSection() {
  const t = useT()
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const toast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  const onDelete = async () => {
    setLoading(true)
    try {
      await deleteMyAccount()
      toast.success(t.settings.accountClosed)
      logout()
      navigate('/', { replace: true })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.settings.closeFail)
      setLoading(false)
    }
  }

  return (
    <SettingsCard
      title={t.settings.closeAccount}
      description={t.settings.closeAccountHint}
    >
      {!confirming && (
        <button
          onClick={() => setConfirming(true)}
          className="text-sm text-up-red underline underline-offset-4 transition-colors hover:text-up-text"
        >
          {t.settings.closeMyAccount}
        </button>
      )}

      {confirming && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <span className="text-sm text-up-text">{t.settings.closeConfirm}</span>
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              disabled={loading}
              className="rounded-sm border border-up-red/60 bg-up-red/10 px-3 py-1.5 text-xs text-up-red transition-colors hover:bg-up-red hover:text-up-bg disabled:opacity-40"
            >
              {loading ? t.settings.closing : t.settings.yesClose}
            </button>
            <button
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="rounded-sm border border-up-line px-3 py-1.5 text-xs text-up-dim transition-colors hover:border-up-orange hover:text-up-text"
            >
              {t.common.cancel}
            </button>
          </div>
        </div>
      )}
    </SettingsCard>
  )
}
