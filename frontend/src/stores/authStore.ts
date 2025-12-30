import { create } from 'zustand'
import { auth } from '@/services/api'
import type { User } from '@/types'
import { preloadProtectedPages } from '@/lib/preload'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isPreloading: boolean
  setUser: (user: User) => void
  login: (email: string, password: string) => Promise<void>
  register: (data: {
    name: string
    email: string
    password: string
    password_confirmation: string
    household_name: string
  }) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isPreloading: false,

  setUser: (user: User) => set({ user }),

  // Note: login/register are now handled by static HTML pages
  // These methods remain for API completeness
  login: async (email: string, password: string) => {
    await auth.csrf()
    const response = await auth.login({ email, password })
    set({ user: response.user, isAuthenticated: true, isPreloading: true })
    await preloadProtectedPages()
    set({ isPreloading: false })
  },

  register: async (data) => {
    await auth.csrf()
    const response = await auth.register(data)
    set({ user: response.user, isAuthenticated: true, isPreloading: true })
    await preloadProtectedPages()
    set({ isPreloading: false })
  },

  logout: async () => {
    try {
      await auth.logout()
    } finally {
      set({ user: null, isAuthenticated: false })
      // React Router's ProtectedRoute will redirect to /login
    }
  },

  checkAuth: async () => {
    try {
      // #region agent log
      const checkAuthStart = Date.now();
      const redirectStart = sessionStorage.getItem('login_redirect_start');
      if (redirectStart) {
        console.log('[DEBUG] Time from login redirect to checkAuth:', Date.now() - parseInt(redirectStart), 'ms');
        sessionStorage.removeItem('login_redirect_start');
      }
      console.log('[DEBUG] checkAuth started');
      // #endregion
      
      // #region agent log
      const getUserStart = Date.now();
      // #endregion
      const response = await auth.getUser()
      // #region agent log
      console.log('[DEBUG] auth.getUser completed in', Date.now() - getUserStart, 'ms');
      // #endregion
      
      // User is authenticated, start preloading
      set({ user: response.user, isAuthenticated: true, isLoading: false, isPreloading: true })
      
      // Wait for all pages to preload before showing app
      // #region agent log
      const preloadStart = Date.now();
      // #endregion
      await preloadProtectedPages()
      // #region agent log
      console.log('[DEBUG] preloadProtectedPages completed in', Date.now() - preloadStart, 'ms');
      // #endregion
      
      // FIX: Removed artificial 800ms minimum delay that was causing slow login transition
      // The preloading is already fast enough; no need to artificially slow down the UX
      
      // #region agent log
      console.log('[DEBUG] checkAuth total time:', Date.now() - checkAuthStart, 'ms');
      // #endregion
      set({ isPreloading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, isPreloading: false })
    }
  },
}))
