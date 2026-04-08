import { beforeEach, describe, expect, it } from 'vitest'
import { useAuthStore } from './store'

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: null })
    localStorage.clear()
  })

  it('starts with no token', () => {
    expect(useAuthStore.getState().token).toBeNull()
  })

  it('setToken stores the token', () => {
    useAuthStore.getState().setToken('abc')
    expect(useAuthStore.getState().token).toBe('abc')
  })

  it('logout clears the token', () => {
    useAuthStore.getState().setToken('abc')
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().token).toBeNull()
  })
})
