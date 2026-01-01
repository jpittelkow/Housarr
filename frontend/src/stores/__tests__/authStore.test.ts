import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAuthStore } from '../authStore'

// Mock the api module
vi.mock('@/services/api', () => ({
  auth: {
    login: vi.fn(),
    logout: vi.fn(),
    getUser: vi.fn(),
    csrf: vi.fn(),
    register: vi.fn(),
  },
}))

// Mock preload
vi.mock('@/lib/preload', () => ({
  preloadProtectedPages: vi.fn().mockResolvedValue(undefined),
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
    it('sets user data', () => {
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
    })
  })

  describe('state management', () => {
    it('can update state directly via setState', () => {
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
        isLoading: false,
      })

      const state = useAuthStore.getState()
      expect(state.user?.name).toBe('Test')
      expect(state.isAuthenticated).toBe(true)
      expect(state.isLoading).toBe(false)
    })

    it('can clear user via setState', () => {
      // First set a user
      useAuthStore.setState({
        user: { id: 1, name: 'Test', email: 'test@example.com', role: 'admin', household_id: 1 },
        isAuthenticated: true,
      })

      // Then clear it
      useAuthStore.setState({
        user: null,
        isAuthenticated: false,
      })

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.isAuthenticated).toBe(false)
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
