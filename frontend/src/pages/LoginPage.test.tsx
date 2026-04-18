import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LoginPage } from './LoginPage'

vi.mock('@/features/auth/api', () => ({
  fetchDiscordLoginUrl: () =>
    Promise.resolve({ url: 'https://discord.com/api/oauth2/authorize?state=signed' }),
}))

describe('LoginPage', () => {
  it('renders Discord login link pointing to backend-signed URL', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={qc}>
        <LoginPage />
      </QueryClientProvider>,
    )
    const link = screen.getByRole('link', { name: /authenticate/i })
    expect(link).toBeInTheDocument()
    await waitFor(() =>
      expect(link.getAttribute('href')).toContain('discord.com/api/oauth2/authorize'),
    )
  })
})
