import { QueryClient } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import {
  useCreateVote,
  useDeleteVote,
  useSubmitBallot,
  votesKey,
} from './hooks'
import type { VoteSession } from './api'

vi.mock('./api', () => ({
  createVote: vi.fn(),
  deleteVote: vi.fn(),
  submitBallot: vi.fn(),
  closeVote: vi.fn(),
  listVotes: vi.fn(),
  getVoteAudit: vi.fn(),
}))

import * as api from './api'

const GID = 'g1'

function makeVote(overrides: Partial<VoteSession> = {}): VoteSession {
  return {
    id: 'v1',
    group_id: GID,
    created_by: 'u1',
    title: 'next',
    description: null,
    status: 'open',
    candidate_game_ids: ['gA', 'gB', 'gC'],
    eligible_voter_count: 5,
    quorum_count: 3,
    max_selections: 2,
    opens_at: '2026-01-01T00:00:00Z',
    closes_at: null,
    closed_at: null,
    winner_game_id: null,
    created_at: '2026-01-01T00:00:00Z',
    ballots_count: 0,
    tallies: { gA: 1, gB: 0, gC: 0 },
    your_approvals: ['gA'],
    current_stage_number: 1,
    total_stages: null,
    stages: [],
    ...overrides,
  }
}

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
  return { qc, wrapper }
}

describe('useSubmitBallot', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('aplica optimistic: tira voto antigo, soma os novos', async () => {
    const { qc, wrapper } = makeWrapper()
    const initial = makeVote({ tallies: { gA: 1, gB: 0, gC: 0 }, your_approvals: ['gA'] })
    qc.setQueryData(votesKey(GID), [initial])

    vi.mocked(api.submitBallot).mockImplementation(
      () => new Promise(() => {}), // never resolves -> deixa cache no estado optimistic
    )

    const { result } = renderHook(() => useSubmitBallot(GID), { wrapper })
    result.current.mutate({ voteId: 'v1', approvals: ['gB', 'gC'] })

    await waitFor(() => {
      const data = qc.getQueryData<VoteSession[]>(votesKey(GID))
      expect(data?.[0].your_approvals).toEqual(['gB', 'gC'])
    })
    const data = qc.getQueryData<VoteSession[]>(votesKey(GID))!
    expect(data[0].tallies).toEqual({ gA: 0, gB: 1, gC: 1 })
  })

  it('rollback no erro: volta pro estado anterior', async () => {
    const { qc, wrapper } = makeWrapper()
    const initial = makeVote({ tallies: { gA: 1, gB: 0, gC: 0 }, your_approvals: ['gA'] })
    qc.setQueryData(votesKey(GID), [initial])
    vi.mocked(api.submitBallot).mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useSubmitBallot(GID), { wrapper })
    result.current.mutate({ voteId: 'v1', approvals: ['gB'] })

    await waitFor(() => expect(result.current.isError).toBe(true))
    const data = qc.getQueryData<VoteSession[]>(votesKey(GID))!
    expect(data[0].your_approvals).toEqual(['gA'])
    expect(data[0].tallies).toEqual({ gA: 1, gB: 0, gC: 0 })
  })

  it('substitui o vote no cache com o que o server devolve', async () => {
    const { qc, wrapper } = makeWrapper()
    qc.setQueryData(votesKey(GID), [makeVote()])
    const fresh = makeVote({ status: 'closed', winner_game_id: 'gB' })
    vi.mocked(api.submitBallot).mockResolvedValue(fresh)

    const { result } = renderHook(() => useSubmitBallot(GID), { wrapper })
    result.current.mutate({ voteId: 'v1', approvals: ['gB'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const data = qc.getQueryData<VoteSession[]>(votesKey(GID))!
    expect(data[0].status).toBe('closed')
    expect(data[0].winner_game_id).toBe('gB')
  })
})

describe('useCreateVote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalida votes key apos sucesso', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.createVote).mockResolvedValue(makeVote())

    const { result } = renderHook(() => useCreateVote(GID), { wrapper })
    result.current.mutate({ title: 't', candidate_game_ids: ['gA', 'gB'] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: votesKey(GID) })
  })
})

describe('useDeleteVote', () => {
  beforeEach(() => vi.clearAllMocks())

  it('invalida votes + current-game audit apos sucesso', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.deleteVote).mockResolvedValue(null)

    const { result } = renderHook(() => useDeleteVote(GID), { wrapper })
    result.current.mutate('v1')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(spy).toHaveBeenCalledWith({ queryKey: votesKey(GID) })
    expect(spy).toHaveBeenCalledWith({
      queryKey: ['groups', GID, 'current-game', 'audit'],
    })
  })
})
