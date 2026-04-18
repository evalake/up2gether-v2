import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import {
  sessionsKey,
  useCreateSession,
  useDeleteSession,
  useSetRsvp,
} from './hooks'
import type { PlaySession, SessionRsvp } from './api'

vi.mock('./api', () => ({
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  listSessions: vi.fn(),
  setRsvp: vi.fn(),
  getSessionAudit: vi.fn(),
}))

import * as api from './api'

const GID = 'g1'

function makeSession(overrides: Partial<PlaySession> = {}): PlaySession {
  return {
    id: 's1',
    group_id: GID,
    game_id: 'gA',
    created_by: 'u1',
    title: 'play',
    description: null,
    start_at: '2026-01-01T20:00:00Z',
    duration_minutes: 60,
    max_participants: null,
    status: 'scheduled',
    created_at: '2026-01-01T00:00:00Z',
    rsvp_yes: 1,
    rsvp_no: 0,
    rsvp_maybe: 0,
    user_rsvp: 'yes',
    rsvps: [],
    ...overrides,
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
  return { qc, wrapper }
}

describe('useSetRsvp', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it.each<[SessionRsvp, SessionRsvp, Partial<PlaySession>]>([
    ['yes', 'no', { rsvp_yes: 0, rsvp_no: 1, rsvp_maybe: 0 }],
    ['yes', 'maybe', { rsvp_yes: 0, rsvp_no: 0, rsvp_maybe: 1 }],
    ['no', 'yes', { rsvp_yes: 2, rsvp_no: 0, rsvp_maybe: 0 }],
  ])('aplica optimistic %s -> %s', async (from, to, expected) => {
    const { qc, wrapper } = makeWrapper()
    const initial = makeSession({
      user_rsvp: from,
      rsvp_yes: from === 'yes' ? 1 : 1,
      rsvp_no: from === 'no' ? 1 : 0,
      rsvp_maybe: from === 'maybe' ? 1 : 0,
    })
    qc.setQueryData(sessionsKey(GID), [initial])
    vi.mocked(api.setRsvp).mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => useSetRsvp(GID), { wrapper })
    result.current.mutate({ sessionId: 's1', status: to })

    await waitFor(() => {
      const data = qc.getQueryData<PlaySession[]>(sessionsKey(GID))
      expect(data?.[0].user_rsvp).toBe(to)
    })
    const data = qc.getQueryData<PlaySession[]>(sessionsKey(GID))!
    expect(data[0].rsvp_yes).toBe(expected.rsvp_yes)
    expect(data[0].rsvp_no).toBe(expected.rsvp_no)
    expect(data[0].rsvp_maybe).toBe(expected.rsvp_maybe)
  })

  it('rollback no erro: volta pro estado anterior', async () => {
    const { qc, wrapper } = makeWrapper()
    const initial = makeSession({ user_rsvp: 'yes', rsvp_yes: 1, rsvp_no: 0 })
    qc.setQueryData(sessionsKey(GID), [initial])
    vi.mocked(api.setRsvp).mockRejectedValue(new Error('500'))

    const { result } = renderHook(() => useSetRsvp(GID), { wrapper })
    result.current.mutate({ sessionId: 's1', status: 'no' })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = qc.getQueryData<PlaySession[]>(sessionsKey(GID))!
    expect(data[0].user_rsvp).toBe('yes')
    expect(data[0].rsvp_yes).toBe(1)
    expect(data[0].rsvp_no).toBe(0)
  })

  it('substitui session no cache com fresh do server apos sucesso', async () => {
    const { qc, wrapper } = makeWrapper()
    qc.setQueryData(sessionsKey(GID), [makeSession({ user_rsvp: 'yes' })])
    const fresh = makeSession({ user_rsvp: 'no', rsvp_yes: 0, rsvp_no: 1 })
    vi.mocked(api.setRsvp).mockResolvedValue(fresh)

    const { result } = renderHook(() => useSetRsvp(GID), { wrapper })
    result.current.mutate({ sessionId: 's1', status: 'no' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = qc.getQueryData<PlaySession[]>(sessionsKey(GID))!
    expect(data[0].user_rsvp).toBe('no')
    expect(data[0].rsvp_yes).toBe(0)
    expect(data[0].rsvp_no).toBe(1)
  })
})

describe('useCreateSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalida sessions key apos sucesso', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.createSession).mockResolvedValue(makeSession())

    const { result } = renderHook(() => useCreateSession(GID), { wrapper })
    result.current.mutate({
      game_id: 'gA',
      title: 't',
      start_at: '2026-01-01T20:00:00Z',
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: sessionsKey(GID) })
  })
})

describe('useDeleteSession', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalida sessions key apos sucesso', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.deleteSession).mockResolvedValue(null)

    const { result } = renderHook(() => useDeleteSession(GID), { wrapper })
    result.current.mutate('s1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: sessionsKey(GID) })
  })
})
