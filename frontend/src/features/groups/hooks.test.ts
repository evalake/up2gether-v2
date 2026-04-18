import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import {
  groupsKey,
  membersKey,
  useDemote,
  useKick,
  usePromote,
} from './hooks'

vi.mock('./api', () => ({
  promoteMember: vi.fn(),
  demoteMember: vi.fn(),
  kickMember: vi.fn(),
  createGroup: vi.fn(),
  deleteGroup: vi.fn(),
  leaveGroup: vi.fn(),
  listGroups: vi.fn(),
  listMembers: vi.fn(),
  getGroup: vi.fn(),
  purgeGroup: vi.fn(),
  syncDiscord: vi.fn(),
  getCurrentGameAudit: vi.fn(),
  setCurrentGame: vi.fn(),
  getGroupPresence: vi.fn(),
  getMemberProfile: vi.fn(),
}))

import * as api from './api'

const GID = 'g1'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
  return { qc, wrapper }
}

describe('admin mutations cache invalidation', () => {
  beforeEach(() => vi.clearAllMocks())
  afterEach(() => vi.restoreAllMocks())

  it('promote chama API e invalida members', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.promoteMember).mockResolvedValue(null)

    const { result } = renderHook(() => usePromote(GID), { wrapper })
    result.current.mutate({ userId: 'u2', role: 'admin' })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.promoteMember).toHaveBeenCalledWith(GID, 'u2', 'admin')
    expect(spy).toHaveBeenCalledWith({ queryKey: membersKey(GID) })
  })

  it('demote chama API e invalida members', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.demoteMember).mockResolvedValue(null)

    const { result } = renderHook(() => useDemote(GID), { wrapper })
    result.current.mutate('u3')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.demoteMember).toHaveBeenCalledWith(GID, 'u3')
    expect(spy).toHaveBeenCalledWith({ queryKey: membersKey(GID) })
  })

  it('kick chama API e invalida members', async () => {
    const { qc, wrapper } = makeWrapper()
    const spy = vi.spyOn(qc, 'invalidateQueries')
    vi.mocked(api.kickMember).mockResolvedValue(null)

    const { result } = renderHook(() => useKick(GID), { wrapper })
    result.current.mutate('u4')

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.kickMember).toHaveBeenCalledWith(GID, 'u4')
    expect(spy).toHaveBeenCalledWith({ queryKey: membersKey(GID) })
  })

  it('membersKey nao compartilha prefixo com groupsKey (regra critica)', () => {
    expect(membersKey(GID)[0]).toBe(groupsKey[0])
    expect(membersKey(GID).slice(0, 2)).toEqual(['groups', GID])
    // membersKey termina com 'members' pra evitar cascata em outros details de [groups, gid]
    expect(membersKey(GID)[2]).toBe('members')
  })
})
