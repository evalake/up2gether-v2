import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { GroupsPage } from './GroupsPage'

vi.mock('@/features/groups/api', () => ({
  listGroups: vi.fn(async () => [
    {
      id: 'g1',
      name: 'Squad Alpha',
      discord_guild_id: '123',
      icon_url: null,
      owner_user_id: 'u1',
      webhook_url: null,
      budget_max: null,
      typical_party_size: 4,
      created_at: '2026-01-01T00:00:00Z',
      member_count: 3,
      game_count: 5,
      active_vote_sessions: 0,
      user_role: 'admin',
    },
  ]),
  createGroup: vi.fn(),
  getGroup: vi.fn(),
  listMembers: vi.fn(),
  leaveGroup: vi.fn(),
  deleteGroup: vi.fn(),
  promoteMember: vi.fn(),
  demoteMember: vi.fn(),
}))

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <GroupsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('GroupsPage', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.clearAllMocks())

  it('renders groups from the API', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Squad Alpha')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/membros/i).length).toBeGreaterThan(0)
  })
})
