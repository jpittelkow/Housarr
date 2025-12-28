import { create } from 'zustand'
import { auth } from '@/services/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
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

  setUser: (user: User) => set({ user }),

  login: async (email: string, password: string) => {
    await auth.csrf()
    const response = await auth.login({ email, password })
    set({ user: response.user, isAuthenticated: true })
  },

  register: async (data) => {
    await auth.csrf()
    const response = await auth.register(data)
    set({ user: response.user, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await auth.logout()
    } finally {
      set({ user: null, isAuthenticated: false })
    }
  },

  checkAuth: async () => {
    try {
      const response = await auth.getUser()
      set({ user: response.user, isAuthenticated: true, isLoading: false })
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
