import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'en' | 'pt'

type LocaleState = {
  locale: Locale
  hasExplicit: boolean
  setLocale: (l: Locale, explicit?: boolean) => void
  toggle: () => void
}

// detecta locale do browser. pt-BR, pt-PT etc caem em pt, resto em en
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en'
  const langs = [navigator.language, ...(navigator.languages ?? [])]
  for (const l of langs) {
    if (!l) continue
    if (l.toLowerCase().startsWith('pt')) return 'pt'
    if (l.toLowerCase().startsWith('en')) return 'en'
  }
  return 'en'
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: detectBrowserLocale(),
      hasExplicit: false,
      setLocale: (l, explicit = true) => set({ locale: l, hasExplicit: explicit || get().hasExplicit }),
      toggle: () =>
        set({ locale: get().locale === 'en' ? 'pt' : 'en', hasExplicit: true }),
    }),
    {
      name: 'u2g-locale',
      // mantem compat com schema antigo que so tinha locale
      partialize: (s) => ({ locale: s.locale, hasExplicit: s.hasExplicit }),
    },
  ),
)
