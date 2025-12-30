import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'

// Mock the api module
vi.mock('@/services/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
  },
}))

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isPreloading: false,
    })
  })

  describe('initial state', () => {
    it('starts with no user', () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
    })

    it('starts as not authenticated', () => {
      const state = useAuthStore.getState()
      expect(state.isAuthenticated).toBe(false)
    })

    it('starts in loading state', () => {
      const state = useAuthStore.getState()
      expect(state.isLoading).toBe(true)
    })

    it('starts not preloading', () => {
      const state = useAuthStore.getState()
      expect(state.isPreloading).toBe(false)
    })
  })

  describe('setUser', () => {
    it('sets user and marks as authenticated', () => {
      const mockUser = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin' as const,
        household_id: 1,
        household: { id: 1, name: 'Test Household' },
      }

      useAuthStore.getState().setUser(mockUser)

      const state = useAuthStore.getState()
      expect(state.user).toEqual(mockUser)
      expect(state.isAuthenticated).toBe(true)
    })

    it('clears user when passed null', () => {
      // First set a user
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
      })

      // Then clear it
      useAuthStore.getState().setUser(null)

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('logout', () => {
    it('clears user on logout', () => {
      // Set up authenticated state
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
        isLoading: false,
      })

      // Logout
      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })

    it('resets loading state on logout', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
        isLoading: false,
      })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setIsLoading', () => {
    it('sets loading state to true', () => {
      useAuthStore.setState({ isLoading: false })
      
      useAuthStore.getState().setIsLoading(true)

      expect(useAuthStore.getState().isLoading).toBe(true)
    })

    it('sets loading state to false', () => {
      useAuthStore.setState({ isLoading: true })
      
      useAuthStore.getState().setIsLoading(false)

      expect(useAuthStore.getState().isLoading).toBe(false)
    })
  })

  describe('state persistence', () => {
    it('maintains state across multiple updates', () => {
      const store = useAuthStore.getState()

      // Set user
      store.setUser({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'member',
        household_id: 1,
      })

      // Set loading
      store.setIsLoading(false)

      const finalState = useAuthStore.getState()
      expect(finalState.user?.name).toBe('Test User')
      expect(finalState.isLoading).toBe(false)
      expect(finalState.isAuthenticated).toBe(true)
    })
  })

  describe('role access', () => {
    it('correctly identifies admin user', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Admin', email: 'admin@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
      })

      const state = useAuthStore.getState()
      expect(state.user?.role).toBe('admin')
    })

    it('correctly identifies member user', () => {
      useAuthStore.setState({
        user: { id: 2, name: 'Member', email: 'member@example.com', role: 'member', household_id: 1 },
        isAuthenticated: true,
      })

      const state = useAuthStore.getState()
      expect(state.user?.role).toBe('member')
    })
  })
})
