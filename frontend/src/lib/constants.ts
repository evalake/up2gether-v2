import type { HardwareTier } from '@/features/games/api'

export const STAGE_COLOR: Record<string, string> = {
  exploring: 'text-up-amber',
  campaign: 'text-up-green',
  endgame: 'text-up-orange',
  paused: 'text-up-dim',
  abandoned: 'text-up-red',
}

export const STAGE_BORDER: Record<string, string> = {
  exploring: 'border-up-amber',
  campaign: 'border-up-green',
  endgame: 'border-up-orange',
  paused: 'border-up-dim',
  abandoned: 'border-up-red',
}

import type { GameStage } from '@/features/games/api'

export const STAGE_VALUES: GameStage[] = ['exploring', 'campaign', 'endgame', 'paused', 'abandoned']

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
