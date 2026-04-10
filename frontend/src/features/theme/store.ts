// theme store: dark (default) ou light. persistido, aplicado no <html data-theme="...">

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ThemeMode = 'dark' | 'light'

type ThemeState = {
  mode: ThemeMode
  setMode: (m: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      setMode: (m) => {
        set({ mode: m })
        applyTheme(m)
      },
      toggle: () => {
        const next = get().mode === 'dark' ? 'light' : 'dark'
        set({ mode: next })
        applyTheme(next)
      },
    }),
    {
      name: 'u2g-theme',
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
