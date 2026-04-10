// theme store: NERV (default, laranja frio) ou LCL (entry plug, ambar quente).
// persistido, aplicado via <html data-theme="nerv|lcl">.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'nerv' | 'lcl'

type ThemeState = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'nerv',
      setMode: (m) => {
        set({ mode: m })
        applyTheme(m)
      },
      toggle: () => {
        const next: ThemeMode = get().mode === 'nerv' ? 'lcl' : 'nerv'
        set({ mode: next })
        applyTheme(next)
      },
    }),
    {
      name: 'u2g-theme',
      version: 2,
      migrate: (persisted: unknown) => {
        // migra values antigos dark/light pra nerv/lcl
        const p = persisted as { mode?: string } | null
        if (p && p.mode === 'dark') return { mode: 'nerv' as ThemeMode }
        if (p && p.mode === 'light') return { mode: 'lcl' as ThemeMode }
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
