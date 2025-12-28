import axios from 'axios'
import type {
  User,
  Household,
  Category,
  Vendor,
  Location,
  Item,
  Part,
  MaintenanceLog,
  Reminder,
  Todo,
  Notification,
  AuthResponse,
  FileRecord,
  FileableType,
} from '@/types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if not already on login/register page
    // This prevents infinite redirect loops
    if (error.response?.status === 401) {
      const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/register'
      if (!isAuthPage) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Dashboard
export const dashboard = {
  get: async (): Promise<{
    items_count: number
    upcoming_reminders: Reminder[]
    upcoming_reminders_count: number
    overdue_reminders: Reminder[]
    overdue_reminders_count: number
    incomplete_todos: Todo[]
    incomplete_todos_count: number
  }> => {
    const response = await api.get('/dashboard')
    return response.data
  },
}

// Auth
export const auth = {
  csrf: async (): Promise<void> => {
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true })
  },

  register: async (data: {
    name: string
    email: string
    password: string
    password_confirmation: string
    household_name: string
  }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', data)
    return response.data
  },

  login: async (data: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', data)
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout')
  },

  getUser: async (): Promise<{ user: User }> => {
    const response = await api.get('/auth/user')
    return response.data
  },

  invite: async (data: {
    name: string
    email: string
    password: string
    password_confirmation: string
    role?: 'admin' | 'member'
  }): Promise<{ user: User }> => {
    const response = await api.post('/auth/invite', data)
    return response.data
  },
}

// Household
export const household = {
  get: async (): Promise<{ household: Household }> => {
    const response = await api.get('/household')
    return response.data
  },

  update: async (data: { name: string }): Promise<{ household: Household }> => {
    const response = await api.patch('/household', data)
    return response.data
  },
}

// Users
export const users = {
  list: async (): Promise<{ users: User[] }> => {
    const response = await api.get('/users')
    return response.data
  },

  update: async (id: number, data: Partial<User>): Promise<{ user: User }> => {
    const response = await api.patch(`/users/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/users/${id}`)
  },
}

// Categories
export const categories = {
  list: async (): Promise<{ categories: Category[] }> => {
    const response = await api.get('/categories')
    return response.data
  },

  create: async (data: Partial<Category>): Promise<{ category: Category }> => {
    const response = await api.post('/categories', data)
    return response.data
  },

  update: async (id: number, data: Partial<Category>): Promise<{ category: Category }> => {
    const response = await api.patch(`/categories/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/categories/${id}`)
  },
}

// Locations
export const locations = {
  list: async (): Promise<{ locations: Location[] }> => {
    const response = await api.get('/locations')
    return response.data
  },

  get: async (id: number): Promise<{ location: Location }> => {
    const response = await api.get(`/locations/${id}`)
    return response.data
  },

  create: async (data: Partial<Location>): Promise<{ location: Location }> => {
    const response = await api.post('/locations', data)
    return response.data
  },

  update: async (id: number, data: Partial<Location>): Promise<{ location: Location }> => {
    const response = await api.patch(`/locations/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/locations/${id}`)
  },
}

// Vendors
export const vendors = {
  list: async (): Promise<{ vendors: Vendor[] }> => {
    const response = await api.get('/vendors')
    return response.data
  },

  get: async (id: number): Promise<{ vendor: Vendor }> => {
    const response = await api.get(`/vendors/${id}`)
    return response.data
  },

  create: async (data: Partial<Vendor>): Promise<{ vendor: Vendor }> => {
    const response = await api.post('/vendors', data)
    return response.data
  },

  update: async (id: number, data: Partial<Vendor>): Promise<{ vendor: Vendor }> => {
    const response = await api.patch(`/vendors/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/vendors/${id}`)
  },
}

// Items
export const items = {
  list: async (params?: { category_id?: number; search?: string }): Promise<{ items: Item[] }> => {
    const response = await api.get('/items', { params })
    return response.data
  },

  get: async (id: number): Promise<{ item: Item }> => {
    const response = await api.get(`/items/${id}`)
    return response.data
  },

  create: async (data: Partial<Item>): Promise<{ item: Item }> => {
    const response = await api.post('/items', data)
    return response.data
  },

  update: async (id: number, data: Partial<Item>): Promise<{ item: Item }> => {
    const response = await api.patch(`/items/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/items/${id}`)
  },

  uploadManual: async (id: number, file: File): Promise<{ file: unknown }> => {
    const formData = new FormData()
    formData.append('manual', file)
    const response = await api.post(`/items/${id}/manual`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Parts
export const parts = {
  list: async (itemId: number): Promise<{ replacement_parts: Part[]; consumable_parts: Part[] }> => {
    const response = await api.get(`/items/${itemId}/parts`)
    return response.data
  },

  create: async (data: Partial<Part> & { item_id: number }): Promise<{ part: Part }> => {
    const response = await api.post('/parts', data)
    return response.data
  },

  update: async (id: number, data: Partial<Part>): Promise<{ part: Part }> => {
    const response = await api.patch(`/parts/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/parts/${id}`)
  },
}

// Maintenance Logs
export const maintenanceLogs = {
  list: async (itemId: number): Promise<{ logs: MaintenanceLog[] }> => {
    const response = await api.get(`/items/${itemId}/logs`)
    return response.data
  },

  create: async (data: Partial<MaintenanceLog> & { item_id: number }): Promise<{ log: MaintenanceLog }> => {
    const response = await api.post('/maintenance-logs', data)
    return response.data
  },

  update: async (id: number, data: Partial<MaintenanceLog>): Promise<{ log: MaintenanceLog }> => {
    const response = await api.patch(`/maintenance-logs/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/maintenance-logs/${id}`)
  },
}

// Reminders
export const reminders = {
  list: async (params?: {
    status?: string
    overdue?: boolean
    upcoming?: number
  }): Promise<{ reminders: Reminder[] }> => {
    const response = await api.get('/reminders', { params })
    return response.data
  },

  get: async (id: number): Promise<{ reminder: Reminder }> => {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  create: async (data: Partial<Reminder>): Promise<{ reminder: Reminder }> => {
    const response = await api.post('/reminders', data)
    return response.data
  },

  update: async (id: number, data: Partial<Reminder>): Promise<{ reminder: Reminder }> => {
    const response = await api.patch(`/reminders/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/reminders/${id}`)
  },

  snooze: async (id: number, days?: number): Promise<{ reminder: Reminder }> => {
    const response = await api.post(`/reminders/${id}/snooze`, { days })
    return response.data
  },

  complete: async (id: number): Promise<{ reminder: Reminder }> => {
    const response = await api.post(`/reminders/${id}/complete`)
    return response.data
  },
}

// Todos
export const todos = {
  list: async (params?: {
    completed?: boolean
    incomplete?: boolean
    priority?: string
    user_id?: number
  }): Promise<{ todos: Todo[] }> => {
    const response = await api.get('/todos', { params })
    return response.data
  },

  get: async (id: number): Promise<{ todo: Todo }> => {
    const response = await api.get(`/todos/${id}`)
    return response.data
  },

  create: async (data: Partial<Todo>): Promise<{ todo: Todo }> => {
    const response = await api.post('/todos', data)
    return response.data
  },

  update: async (id: number, data: Partial<Todo>): Promise<{ todo: Todo }> => {
    const response = await api.patch(`/todos/${id}`, data)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/todos/${id}`)
  },

  complete: async (id: number): Promise<{ todo: Todo }> => {
    const response = await api.post(`/todos/${id}/complete`)
    return response.data
  },
}

// Notifications
export const notifications = {
  list: async (params?: { unread?: boolean }): Promise<{ notifications: Notification[]; unread_count: number }> => {
    const response = await api.get('/notifications', { params })
    return response.data
  },

  markRead: async (ids?: number[]): Promise<void> => {
    await api.post('/notifications/mark-read', { ids })
  },
}

// Files
export const files = {
  upload: async (
    file: File,
    fileableType: FileableType,
    fileableId: number,
    isFeatured?: boolean
  ): Promise<{ file: FileRecord }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileable_type', fileableType)
    formData.append('fileable_id', fileableId.toString())
    if (isFeatured !== undefined) {
      formData.append('is_featured', isFeatured ? '1' : '0')
    }
    const response = await api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  setFeatured: async (id: number): Promise<{ file: FileRecord }> => {
    const response = await api.post(`/files/${id}/featured`)
    return response.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/files/${id}`)
  },
}

// Backup
export const backup = {
  export: async (): Promise<Blob> => {
    const response = await api.get('/backup/export', { responseType: 'blob' })
    return response.data
  },

  import: async (file: File): Promise<{ message: string; stats: Record<string, number> }> => {
    const formData = new FormData()
    formData.append('backup', file)
    const response = await api.post('/backup/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },
}

// Profile
export const profile = {
  get: async (): Promise<{ user: User }> => {
    const response = await api.get('/profile')
    return response.data
  },

  update: async (data: { name?: string; email?: string }): Promise<{ user: User }> => {
    const response = await api.patch('/profile', data)
    return response.data
  },

  updatePassword: async (data: {
    current_password: string
    password: string
    password_confirmation: string
  }): Promise<{ message: string }> => {
    const response = await api.put('/profile/password', data)
    return response.data
  },
}

// Settings
export interface StorageSettings {
  storage_driver?: 'local' | 's3'
  aws_access_key_id?: string
  aws_secret_access_key?: string
  aws_default_region?: string
  aws_bucket?: string
  aws_endpoint?: string
}

export interface EmailSettings {
  mail_driver?: 'smtp' | 'mailgun' | 'sendgrid' | 'ses' | 'cloudflare' | 'log'
  mail_host?: string
  mail_port?: number | string
  mail_username?: string
  mail_password?: string
  mail_encryption?: 'tls' | 'ssl' | 'null'
  mail_from_address?: string
  mail_from_name?: string
  // Mailgun
  mailgun_domain?: string
  mailgun_secret?: string
  mailgun_endpoint?: string
  // SendGrid
  sendgrid_api_key?: string
  // SES
  ses_key?: string
  ses_secret?: string
  ses_region?: string
  // Cloudflare
  cloudflare_api_token?: string
  cloudflare_account_id?: string
}

export interface AISettings {
  ai_provider?: 'none' | 'claude' | 'openai' | 'gemini' | 'local'
  ai_model?: string
  // Claude (Anthropic)
  anthropic_api_key?: string
  // OpenAI
  openai_api_key?: string
  openai_base_url?: string
  // Gemini (Google)
  gemini_api_key?: string
  gemini_base_url?: string
  // Local (Ollama, LM Studio, etc.)
  local_base_url?: string
  local_model?: string
  local_api_key?: string
}

export type AllSettings = StorageSettings & EmailSettings & AISettings

export const settings = {
  get: async (): Promise<{ settings: Record<string, string | null> }> => {
    const response = await api.get('/settings')
    return response.data
  },

  update: async (data: AllSettings): Promise<{ message: string }> => {
    const response = await api.patch('/settings', { settings: data })
    return response.data
  },

  checkStorage: async (): Promise<{ driver: string; configured: boolean }> => {
    const response = await api.get('/settings/storage')
    return response.data
  },

  checkEmail: async (): Promise<{ driver: string; configured: boolean }> => {
    const response = await api.get('/settings/email')
    return response.data
  },

  checkAI: async (): Promise<{ provider: string; configured: boolean }> => {
    const response = await api.get('/settings/ai')
    return response.data
  },
}

export default api
