import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, useThemeStore } from './features/theme/store'
import { captureRef } from './features/auth/api'
import { App } from './app/App.tsx'

applyTheme(useThemeStore.getState().mode)
captureRef()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
