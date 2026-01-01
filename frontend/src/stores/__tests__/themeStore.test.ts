import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useThemeStore } from '../themeStore'

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

describe('themeStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useThemeStore.setState({
      mode: 'auto',
      resolvedTheme: 'light',
    })
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('starts with auto mode', () => {
      const state = useThemeStore.getState()
      expect(state.mode).toBe('auto')
    })

    it('starts with light resolved theme', () => {
      const state = useThemeStore.getState()
      expect(state.resolvedTheme).toBe('light')
    })
  })

  describe('setMode', () => {
    it('sets mode to light', () => {
      useThemeStore.getState().setMode('light')
      
      const state = useThemeStore.getState()
      expect(state.mode).toBe('light')
      expect(state.resolvedTheme).toBe('light')
    })

    it('sets mode to dark', () => {
      useThemeStore.getState().setMode('dark')
      
      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.resolvedTheme).toBe('dark')
    })

    it('sets mode to auto', () => {
      useThemeStore.getState().setMode('auto')
      
      const state = useThemeStore.getState()
      expect(state.mode).toBe('auto')
    })

    it('persists mode to localStorage', () => {
      useThemeStore.getState().setMode('dark')
      
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('housarr-theme', 'dark')
    })
  })

  describe('state management', () => {
    it('can update state directly via setState', () => {
      useThemeStore.setState({
        mode: 'dark',
        resolvedTheme: 'dark',
      })

      const state = useThemeStore.getState()
      expect(state.mode).toBe('dark')
      expect(state.resolvedTheme).toBe('dark')
    })

    it('maintains state across multiple changes', () => {
      useThemeStore.getState().setMode('light')
      useThemeStore.getState().setMode('dark')
      useThemeStore.getState().setMode('light')

      const state = useThemeStore.getState()
      expect(state.mode).toBe('light')
      expect(state.resolvedTheme).toBe('light')
    })
  })
})
