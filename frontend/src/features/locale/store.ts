import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Locale = 'en' | 'pt'

type LocaleState = {
  locale: Locale
  setLocale: (l: Locale) => void
  toggle: () => void
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'en',
      setLocale: (l) => set({ locale: l }),
      toggle: () => set({ locale: get().locale === 'en' ? 'pt' : 'en' }),
    }),
    { name: 'u2g-locale' },
  ),
)
