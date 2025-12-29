import { create } from 'zustand'

type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeState {
  mode: ThemeMode
  resolvedTheme: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  initializeTheme: () => void
}

const STORAGE_KEY = 'housarr-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'auto'
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'auto') {
    return stored
  }
  return 'auto'
}

function resolveTheme(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'auto') {
    return getSystemTheme()
  }
  return mode
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: 'auto',
  resolvedTheme: 'light',

  setMode: (mode: ThemeMode) => {
    localStorage.setItem(STORAGE_KEY, mode)
    const resolvedTheme = resolveTheme(mode)
    applyTheme(resolvedTheme)
    set({ mode, resolvedTheme })
  },

  initializeTheme: () => {
    const mode = getStoredMode()
    const resolvedTheme = resolveTheme(mode)
    applyTheme(resolvedTheme)
    set({ mode, resolvedTheme })

    // Listen for system preference changes when in auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const currentMode = get().mode
      if (currentMode === 'auto') {
        const newResolved = getSystemTheme()
        applyTheme(newResolved)
        set({ resolvedTheme: newResolved })
      }
    }
    mediaQuery.addEventListener('change', handleChange)
  },
}))
