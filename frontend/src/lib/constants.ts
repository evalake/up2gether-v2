import type { GameStage, HardwareTier, InterestSignal } from '@/features/games/api'

export const SIGNALS: { value: InterestSignal; label: string; color: string }[] = [
  { value: 'want', label: 'quero', color: 'text-nerv-green border-nerv-green' },
  { value: 'ok', label: 'topo', color: 'text-nerv-amber border-nerv-amber' },
  { value: 'pass', label: 'passo', color: 'text-nerv-dim border-nerv-line' },
]

export const STAGES: { value: GameStage; label: string }[] = [
  { value: 'exploring', label: 'explorando' },
  { value: 'campaign', label: 'campanha' },
  { value: 'endgame', label: 'endgame' },
  { value: 'paused', label: 'pausado' },
  { value: 'abandoned', label: 'abandonado' },
]

export const STAGE_COLOR: Record<string, string> = {
  exploring: 'text-nerv-amber',
  campaign: 'text-nerv-green',
  endgame: 'text-nerv-orange',
  paused: 'text-nerv-dim',
  abandoned: 'text-nerv-red',
}

export const STAGE_VALUES = STAGES.map((s) => s.value)

export const TIERS: HardwareTier[] = ['low', 'mid', 'high', 'unknown']

// polling intervals centralizados (ms)
export const POLL = {
  FAST: 5_000,       // presence, coisas que mudam rapido
  ACTIVE: 10_000,    // votes abertas, ciclo de temas ativo
  MEDIUM: 15_000,    // sessions
  SLOW: 20_000,      // games list
  LAZY: 30_000,      // notificacoes, themes history
  VERY_LAZY: 60_000, // groups list, ciclo inativo
} as const
