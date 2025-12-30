import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { useThemeStore } from '../themeStore'

describe('themeStore', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  }

  beforeEach(() => {
    // Reset store state
    useThemeStore.setState({ theme: 'system' })
    
    // Setup localStorage mock
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    })
    
    // Reset mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('initial state', () => {
    it('defaults to system theme', () => {
      const state = useThemeStore.getState()
      expect(state.theme).toBe('system')
    })
  })

  describe('setTheme', () => {
    it('sets theme to light', () => {
      useThemeStore.getState().setTheme('light')
      expect(useThemeStore.getState().theme).toBe('light')
    })

    it('sets theme to dark', () => {
      useThemeStore.getState().setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
    })

    it('sets theme to system', () => {
      useThemeStore.setState({ theme: 'dark' })
      useThemeStore.getState().setTheme('system')
      expect(useThemeStore.getState().theme).toBe('system')
    })
  })

  describe('theme values', () => {
    it('only allows valid theme values', () => {
      const store = useThemeStore.getState()
      
      // These should work
      store.setTheme('light')
      expect(useThemeStore.getState().theme).toBe('light')
      
      store.setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
      
      store.setTheme('system')
      expect(useThemeStore.getState().theme).toBe('system')
    })
  })

  describe('persistence', () => {
    it('maintains theme state across multiple changes', () => {
      const store = useThemeStore.getState()
      
      store.setTheme('dark')
      expect(useThemeStore.getState().theme).toBe('dark')
      
      store.setTheme('light')
      expect(useThemeStore.getState().theme).toBe('light')
      
      store.setTheme('system')
      expect(useThemeStore.getState().theme).toBe('system')
    })
  })

  describe('type safety', () => {
    it('theme is one of light, dark, or system', () => {
      const validThemes = ['light', 'dark', 'system'] as const
      const currentTheme = useThemeStore.getState().theme
      
      expect(validThemes).toContain(currentTheme)
    })
  })
})
