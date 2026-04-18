import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, useThemeStore } from './features/theme/store'
import { captureRef } from './features/auth/api'
import { useLocaleStore } from './features/locale/store'
import { App } from './app/App.tsx'

applyTheme(useThemeStore.getState().mode)
captureRef()

// reflete locale no <html lang=> pra a11y e SEO antes do React montar
document.documentElement.lang = useLocaleStore.getState().locale
useLocaleStore.subscribe((s) => {
  document.documentElement.lang = s.locale
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
