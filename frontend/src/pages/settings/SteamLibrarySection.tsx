import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/core/Button'
import { useToast } from '@/components/ui/toast'
import { useT } from '@/i18n'
import { SettingsCard } from './SettingsCard'

export function SteamLibrarySection() {
  const t = useT()
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
      toast.success(t.settings.steamImported(r.owned_count, r.matched_count))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t.settings.steamImportFail)
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
      {t.settings.openProfile}
    </a>
  )

  return (
    <SettingsCard
      title={t.settings.steamTitle}
      description={t.settings.steamSubtitle}
      action={action}
    >
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.settings.steamPlaceholder}
          maxLength={64}
          className="h-9 min-w-[240px] flex-1 rounded-sm border border-up-line bg-black/50 px-3 text-sm text-up-text placeholder:text-up-dim focus-visible:border-up-orange focus-visible:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !loading) run()
          }}
        />
        <Button onClick={run} disabled={loading || !input.trim()} size="sm">
          {loading ? t.settings.importing : t.settings.importLabel}
        </Button>
      </div>

      {result && (
        <p className="mt-3 text-xs text-up-green">
          {t.settings.steamResult(result.matched, result.owned)}
        </p>
      )}

      <p className="mt-3 text-xs text-up-dim">
        {t.settings.steamProfileHint}
      </p>
    </SettingsCard>
  )
}
