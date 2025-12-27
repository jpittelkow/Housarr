import { create } from 'zustand'
import { auth } from '@/services/api'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
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

  login: async (email: string, password: string) => {
    const response = await auth.login({ email, password })
    localStorage.setItem('token', response.token)
    set({ user: response.user, isAuthenticated: true })
  },

  register: async (data) => {
    const response = await auth.register(data)
    localStorage.setItem('token', response.token)
    set({ user: response.user, isAuthenticated: true })
  },

  logout: async () => {
    try {
      await auth.logout()
    } finally {
      localStorage.removeItem('token')
      set({ user: null, isAuthenticated: false })
    }
  },

  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const response = await auth.getUser()
      set({ user: response.user, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ user: null, isAuthenticated: false, isLoading: false })
    }
  },
}))
