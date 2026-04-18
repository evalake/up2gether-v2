// store de auth com persist em localStorage. so token + flag de hidratacao.

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logoutApi } from './api'

type AuthState = {
  token: string | null
  setToken: (t: string) => void
  // limpa local sem chamar backend. usado no auto-logout do api.ts (401 em /auth/me)
  // pra evitar loop infinito.
  clearLocal: () => void
  // logout completo: revoga server-side e limpa local. fire-and-forget no servidor.
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      setToken: (t) => set({ token: t }),
      clearLocal: () => set({ token: null }),
      logout: () => {
        // dispara revoke no backend mas nao espera. local limpa imediato pra UX.
        // se backend falhar, o token expira pelo TTL normal de qualquer jeito.
        void logoutApi().catch(() => {
          /* ignore: token pode ja estar invalido ou rede caiu */
        })
        set({ token: null })
      },
    }),
    { name: 'u2g-auth' },
  ),
)
