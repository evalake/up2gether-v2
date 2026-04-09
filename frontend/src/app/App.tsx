import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DiscordCallbackPage } from '@/pages/DiscordCallbackPage'
import { GroupsPage } from '@/pages/GroupsPage'
import { GroupDetailPage } from '@/pages/GroupDetailPage'
import { GroupAdminPage } from '@/pages/GroupAdminPage'
import { GamesPage } from '@/pages/GamesPage'
import { GameDetailPage } from '@/pages/GameDetailPage'
import { VotesPage } from '@/pages/VotesPage'
import { ThemesPage } from '@/pages/ThemesPage'
import { SessionsPage } from '@/pages/SessionsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { PublicSessionPage } from '@/pages/PublicSessionPage'
import { Navigate } from 'react-router-dom'
import { RequireAuth } from './RequireAuth'
import { Toaster } from '@/components/ui/Toaster'
// SSE desligado: estava causando lag perceptivel em prod (refetch storm em cada evento).
// mutations agora sao otimistas e polls (30-60s) sincronizam entre users.
// import { useRealtime } from '@/lib/realtime'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      retry: 1,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      // polling so roda na aba ativa. aba escondida = zero request.
      // isso permite intervalos agressivos (10s) sem gastar bateria/rede.
      refetchIntervalInBackground: false,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/discord/callback" element={<DiscordCallbackPage />} />
          <Route path="/share/sessions/:id" element={<PublicSessionPage />} />
          <Route path="/" element={<Navigate to="/groups" replace />} />
          <Route
            path="/groups"
            element={
              <RequireAuth>
                <GroupsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id"
            element={
              <RequireAuth>
                <GroupDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/admin"
            element={
              <RequireAuth>
                <GroupAdminPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/games"
            element={
              <RequireAuth>
                <GamesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/games/:gameId"
            element={
              <RequireAuth>
                <GameDetailPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/votes"
            element={
              <RequireAuth>
                <VotesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/themes"
            element={
              <RequireAuth>
                <ThemesPage />
              </RequireAuth>
            }
          />
          <Route
            path="/groups/:id/sessions"
            element={
              <RequireAuth>
                <SessionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/settings"
            element={
              <RequireAuth>
                <SettingsPage />
              </RequireAuth>
            }
          />
        </Routes>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
