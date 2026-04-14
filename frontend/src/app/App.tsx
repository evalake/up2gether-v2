import { lazy, Suspense } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DiscordCallbackPage } from '@/pages/DiscordCallbackPage'
import { LandingPage } from '@/pages/LandingPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'

const GroupsPage = lazy(() => import('@/pages/GroupsPage').then(m => ({ default: m.GroupsPage })))
const GroupDetailPage = lazy(() => import('@/pages/GroupDetailPage').then(m => ({ default: m.GroupDetailPage })))
const GroupAdminPage = lazy(() => import('@/pages/GroupAdminPage').then(m => ({ default: m.GroupAdminPage })))
const GamesPage = lazy(() => import('@/pages/GamesPage').then(m => ({ default: m.GamesPage })))
const GameDetailPage = lazy(() => import('@/pages/GameDetailPage').then(m => ({ default: m.GameDetailPage })))
const VotesPage = lazy(() => import('@/pages/VotesPage').then(m => ({ default: m.VotesPage })))
const ThemesPage = lazy(() => import('@/pages/ThemesPage').then(m => ({ default: m.ThemesPage })))
const SessionsPage = lazy(() => import('@/pages/SessionsPage').then(m => ({ default: m.SessionsPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const PublicSessionPage = lazy(() => import('@/pages/PublicSessionPage').then(m => ({ default: m.PublicSessionPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const AdminMetricsPage = lazy(() => import('@/pages/AdminMetricsPage').then(m => ({ default: m.AdminMetricsPage })))
import { RequireAuth } from './RequireAuth'
import { Toaster } from '@/components/ui/Toaster'
// SSE religado em modo seletivo: so "momentos grandes" (vote opened/closed,
// phase advanced, theme decided, session created) disparam refetch. granular
// fica com o poll.
import { useRealtime } from '@/lib/realtime'

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

function RealtimeBoot() {
  useRealtime()
  return null
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBoot />
      <BrowserRouter>
        <Suspense fallback={null}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/discord/callback" element={<DiscordCallbackPage />} />
          <Route path="/share/sessions/:id" element={<PublicSessionPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/onboarding"
            element={
              <RequireAuth>
                <OnboardingPage />
              </RequireAuth>
            }
          />
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
            path="/groups/:id/history"
            element={
              <RequireAuth>
                <HistoryPage />
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
          <Route
            path="/admin/metrics"
            element={
              <RequireAuth>
                <AdminMetricsPage />
              </RequireAuth>
            }
          />
        </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
