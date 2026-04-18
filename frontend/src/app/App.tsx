import { lazy, Suspense, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom'
import { LoginPage } from '@/pages/LoginPage'
import { DiscordCallbackPage } from '@/pages/DiscordCallbackPage'
import { LandingPage } from '@/pages/LandingPage'
import { PrivacyPage } from '@/pages/PrivacyPage'
import { TermsPage } from '@/pages/TermsPage'
import { ContactPage } from '@/pages/ContactPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

const GroupsPage = lazy(() => import('@/pages/GroupsPage').then(m => ({ default: m.GroupsPage })))
const GroupDetailPage = lazy(() => import('@/pages/GroupDetailPage').then(m => ({ default: m.GroupDetailPage })))
const GroupAdminPage = lazy(() => import('@/pages/GroupAdminPage').then(m => ({ default: m.GroupAdminPage })))
const GamesPage = lazy(() => import('@/pages/GamesPage').then(m => ({ default: m.GamesPage })))
const GameDetailPage = lazy(() => import('@/pages/GameDetailPage').then(m => ({ default: m.GameDetailPage })))
const VotesPage = lazy(() => import('@/pages/VotesPage').then(m => ({ default: m.VotesPage })))
const SessionsPage = lazy(() => import('@/pages/SessionsPage').then(m => ({ default: m.SessionsPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const PublicSessionPage = lazy(() => import('@/pages/PublicSessionPage').then(m => ({ default: m.PublicSessionPage })))
const OnboardingPage = lazy(() => import('@/pages/OnboardingPage').then(m => ({ default: m.OnboardingPage })))
const AdminMetricsPage = lazy(() => import('@/pages/AdminMetricsPage').then(m => ({ default: m.AdminMetricsPage })))
import { RequireAuth } from './RequireAuth'
import { Toaster } from '@/components/ui/Toaster'
// SSE religado em modo seletivo: so "momentos grandes" (vote opened/closed,
// phase advanced, session created) disparam refetch. granular fica com poll.
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

const SCROLL_TOP_PATHS = ['/privacy', '/terms', '/contact']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (SCROLL_TOP_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [pathname])
  return null
}

function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.15 }}
      >
        <Routes location={location}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/discord/callback" element={<DiscordCallbackPage />} />
          <Route path="/share/sessions/:id" element={<PublicSessionPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/contact" element={<ContactPage />} />
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
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBoot />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={null}>
          <AnimatedRoutes />
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
