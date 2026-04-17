// theme store: frost (default, laranja frio) ou ember (ambar quente).
// persistido, aplicado via <html data-theme="frost|ember">.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'frost' | 'ember'

type ThemeState = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'frost',
      setMode: (m) => {
        set({ mode: m })
        applyTheme(m)
      },
      toggle: () => {
        const next: ThemeMode = get().mode === 'frost' ? 'ember' : 'frost'
        set({ mode: next })
        applyTheme(next)
      },
    }),
    {
      name: 'u2g-theme',
      version: 3,
      migrate: (persisted: unknown) => {
        const p = persisted as { mode?: string } | null
        if (p && (p.mode === 'dark' || p.mode === 'nerv')) return { mode: 'frost' as ThemeMode }
        if (p && (p.mode === 'light' || p.mode === 'lcl')) return { mode: 'ember' as ThemeMode }
        return p as { mode: ThemeMode } | null
      },
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.mode)
      },
    },
  ),
)

export function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', mode)
}
