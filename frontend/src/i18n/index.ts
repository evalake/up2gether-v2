import { useLocaleStore } from '@/features/locale/store'
import type { InterestSignal, GameStage } from '@/features/games/api'
import { en, type Translations } from './en'
import { pt } from './pt'

const locales: Record<string, Translations> = { en, pt }

export type { Translations }

export function useT(): Translations {
  const locale = useLocaleStore((s) => s.locale)
  return locales[locale] ?? en
}

// SIGNALS / STAGES as functions of translations

type Signal = { value: InterestSignal; label: string; color: string }
type Stage = { value: GameStage; label: string }

export function getSignals(t: Translations): Signal[] {
  return [
    { value: 'want', label: t.signals.want, color: 'text-up-green border-up-green' },
    { value: 'ok', label: t.signals.ok, color: 'text-up-amber border-up-amber' },
    { value: 'pass', label: t.signals.pass, color: 'text-up-red border-up-red' },
  ]
}

export function getStages(t: Translations): Stage[] {
  return [
    { value: 'exploring', label: t.stages.exploring },
    { value: 'campaign', label: t.stages.campaign },
    { value: 'endgame', label: t.stages.endgame },
    { value: 'paused', label: t.stages.paused },
    { value: 'abandoned', label: t.stages.abandoned },
  ]
}

// convenience hooks
export function useSignals(): Signal[] {
  const t = useT()
  return getSignals(t)
}

export function useStages(): Stage[] {
  const t = useT()
  return getStages(t)
}
