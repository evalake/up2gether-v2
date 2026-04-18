import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/store'
import { deleteMyAccount } from '@/features/users/api'
import { useToast } from '@/components/ui/toast'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
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
      setConfirming(false)
    }
  }

  return (
    <>
      <SettingsCard
        title={t.settings.closeAccount}
        description={t.settings.closeAccountHint}
      >
        <button
          onClick={() => setConfirming(true)}
          className="text-sm text-up-red underline underline-offset-4 transition-colors hover:text-up-text"
        >
          {t.settings.closeMyAccount}
        </button>
      </SettingsCard>
      <ConfirmDialog
        open={confirming}
        title={t.settings.closeAccount}
        message={t.settings.closeConfirm}
        confirmLabel={t.settings.yesClose}
        tone="danger"
        pending={loading}
        onConfirm={onDelete}
        onCancel={() => setConfirming(false)}
      />
    </>
  )
}
