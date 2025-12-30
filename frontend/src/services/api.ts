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
  timeout: 30000, // 30 second default timeout
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

  // Batched prefetch for cache warming - returns categories and locations in one request
  prefetch: async (): Promise<{
    categories: Category[]
    locations: Location[]
  }> => {
    const response = await api.get('/dashboard/prefetch')
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

// AI Analysis Result
export interface AnalysisResult {
  make: string
  model: string
  type: string
  confidence: number
  image_url?: string | null
  agents_agreed?: number
  source_agent?: string
}

// Agent detail info
export interface AgentDetail {
  success: boolean
  duration_ms: number
  error: string | null
  has_response: boolean
}

// Consensus info
export interface ConsensusInfo {
  level: 'none' | 'single' | 'low' | 'partial' | 'majority' | 'full'
  agents_agreeing: number
  total_agents: number
}

// Full analysis response
export interface AnalyzeImageResponse {
  results: AnalysisResult[]
  agents_used: string[]
  agents_succeeded: number
  agent_details: Record<string, AgentDetail>
  agent_errors: Record<string, string>
  primary_agent: string | null
  synthesis_agent: string | null
  synthesis_error: string | null
  consensus: ConsensusInfo | null
  total_duration_ms: number
  parse_source: string | null
  debug?: {
    had_synthesized: boolean
    synthesized_preview: string | null
  }
}

// Items
export const items = {
  list: async (params?: { category_id?: number; search?: string }): Promise<{ items: Item[] }> => {
    const response = await api.get('/items', { params })
    return response.data
  },

  // Lightweight endpoint for dropdowns - returns only id and name
  listMinimal: async (): Promise<{ items: { id: number; name: string }[] }> => {
    const response = await api.get('/items', { params: { minimal: true } })
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

  analyzeImage: async (file?: File, query?: string, categoryNames?: string[]): Promise<AnalyzeImageResponse> => {
    const formData = new FormData()
    if (file) formData.append('image', file)
    // Only send query if it's non-empty (avoid sending empty strings)
    if (query && query.trim()) formData.append('query', query.trim())
    if (categoryNames && categoryNames.length > 0) {
      formData.append('categories', JSON.stringify(categoryNames))
    }
    const response = await api.post('/items/analyze-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // Multi-agent analysis can take longer
    })
    return response.data
  },

  searchManual: async (make: string, model: string): Promise<{ found: boolean; message: string }> => {
    const response = await api.post('/items/search-manual', { make, model })
    return response.data
  },

  downloadManual: async (itemId: number, make: string, model: string): Promise<{ success: boolean; message: string }> => {
    // This can take a while as it searches and downloads
    const response = await api.post(`/items/${itemId}/download-manual`, { make, model }, { timeout: 180000 })
    return response.data
  },

  searchManualUrls: async (itemId: number, make: string, model: string, step: 'repositories' | 'ai' | 'web'): Promise<{
    step: string
    step_name: string
    urls: string[]
    count: number
    search_links?: Array<{ url: string; label: string }>
  }> => {
    // AI step can take longer since it calls the AI API
    const timeout = step === 'ai' ? 45000 : 30000
    const response = await api.post(`/items/${itemId}/search-manual-urls`, { make, model, step }, { timeout })
    return response.data
  },

  downloadManualFromUrl: async (itemId: number, url: string, make: string, model: string): Promise<{
    success: boolean
    message: string
    file?: unknown
    source_url?: string
  }> => {
    // PDF downloads can take up to 90 seconds on the backend
    const response = await api.post(`/items/${itemId}/download-manual-url`, { url, make, model }, { timeout: 120000 })
    return response.data
  },

  getAISuggestions: async (itemId: number, make: string, model: string, category?: string): Promise<{
    suggestions: {
      warranty_years?: number
      maintenance_interval_months?: number
      typical_lifespan_years?: number
      notes?: string
    } | null
  }> => {
    const response = await api.post(`/items/${itemId}/ai-suggestions`, { make, model, category })
    return response.data
  },

  // Combined AI suggestions endpoint using multi-agent orchestration
  // Returns agent metadata alongside suggestions for UI display
  queryAISuggestions: async (itemId: number, make: string, model: string, category?: string): Promise<{
    success: boolean
    suggestions?: {
      warranty_years?: number
      maintenance_interval_months?: number
      typical_lifespan_years?: number
      notes?: string
    }
    // Multi-agent metadata
    agents_used?: string[]
    agents_succeeded?: number
    agent_details?: Record<string, { success: boolean; duration_ms: number }>
    agent_errors?: Record<string, string>
    synthesis_agent?: string | null
    fallback_agent?: string | null
    total_duration_ms?: number
    error?: string
    raw_response?: string
  }> => {
    const response = await api.post(`/items/${itemId}/ai-query`, { make, model, category }, { timeout: 120000 })
    return response.data
  },

  suggestParts: async (itemId: number, make: string, model: string, category?: string): Promise<{
    success: boolean
    parts?: Array<{
      name: string
      type: 'replacement' | 'consumable'
      part_number: string | null
      search_term?: string
      estimated_price: number | null
      replacement_interval: string | null
      purchase_urls: {
        repairclinic: string
        amazon: string
        home_depot: string
      }
    }>
    // Multi-agent metadata
    agents_used?: string[]
    agents_succeeded?: number
    agent_details?: Record<string, { success: boolean; duration_ms: number }>
    agent_errors?: Record<string, string>
    synthesis_agent?: string | null
    fallback_agent?: string | null
    total_duration_ms?: number
    error?: string
    raw_response?: string
  }> => {
    const response = await api.post(`/items/${itemId}/suggest-parts`, { make, model, category }, { timeout: 120000 })
    return response.data
  },

  searchPartImage: async (itemId: number, searchTerm: string, partName?: string): Promise<{
    success: boolean
    image_url: string | null
    search_term: string
  }> => {
    const response = await api.post(`/items/${itemId}/search-part-image`, { search_term: searchTerm, part_name: partName }, { timeout: 10000 })
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

  createBatch: async (itemId: number, partsData: Array<{
    name: string
    type: 'replacement' | 'consumable'
    part_number?: string | null
    purchase_url?: string | null
    purchase_urls?: {
      repairclinic?: string
      amazon?: string
      home_depot?: string
    } | null
    price?: number | null
    notes?: string | null
  }>): Promise<{ parts: Part[]; count: number }> => {
    const response = await api.post('/parts/batch', { item_id: itemId, parts: partsData })
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
    isFeatured?: boolean,
    displayName?: string
  ): Promise<{ file: FileRecord }> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('fileable_type', fileableType)
    formData.append('fileable_id', fileableId.toString())
    if (isFeatured !== undefined) {
      formData.append('is_featured', isFeatured ? '1' : '0')
    }
    if (displayName) {
      formData.append('display_name', displayName)
    }
    const response = await api.post('/files', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response.data
  },

  uploadFromUrl: async (
    url: string,
    fileableType: FileableType,
    fileableId: number,
    isFeatured?: boolean,
    displayName?: string
  ): Promise<{ file: FileRecord }> => {
    const response = await api.post('/files/from-url', {
      url,
      fileable_type: fileableType,
      fileable_id: fileableId,
      is_featured: isFeatured,
      display_name: displayName,
    })
    return response.data
  },

  update: async (id: number, data: { display_name?: string | null }): Promise<{ file: FileRecord }> => {
    const response = await api.patch(`/files/${id}`, data)
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

// AI Agent Types
export type AIAgentName = 'claude' | 'openai' | 'gemini' | 'local'

export interface AIAgentTestResult {
  success: boolean
  tested_at: string
  error?: string | null
}

export interface AIAgent {
  name: AIAgentName
  display_name: string
  enabled: boolean
  configured: boolean
  available: boolean
  model: string | null
  default_model: string | null
  last_success_at: string | null
  last_test: AIAgentTestResult | null
  is_primary: boolean
}

export interface AIAgentsResponse {
  agents: AIAgent[]
  primary_agent: AIAgentName | null
  key_status: Record<AIAgentName, boolean>
}

export interface AIAgentUpdateData {
  enabled?: boolean
  model?: string | null
  api_key?: string
  base_url?: string | null
}

export type AllSettings = StorageSettings & EmailSettings & AISettings

export const settings = {
  get: async (): Promise<{
    settings: Record<string, string | null>
    key_status: {
      anthropic_api_key_set: boolean
      openai_api_key_set: boolean
      gemini_api_key_set: boolean
      local_api_key_set: boolean
    }
  }> => {
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

  testAI: async (settings?: AISettings): Promise<{ success: boolean; message: string; provider?: string; model?: string }> => {
    const response = await api.post('/settings/ai/test', settings ? { settings } : {})
    return response.data
  },

  // AI Agent Management
  getAgents: async (): Promise<AIAgentsResponse> => {
    const response = await api.get('/settings/ai/agents')
    return response.data
  },

  updateAgent: async (agent: AIAgentName, data: AIAgentUpdateData): Promise<{ message: string }> => {
    const response = await api.patch(`/settings/ai/agents/${agent}`, data)
    return response.data
  },

  testAgent: async (agent: AIAgentName, settings?: Record<string, string>): Promise<{
    success: boolean
    message: string
    model?: string
    response_time_ms?: number
  }> => {
    const response = await api.post(`/settings/ai/agents/${agent}/test`, settings ? { settings } : {})
    return response.data
  },

  setPrimaryAgent: async (agent: AIAgentName): Promise<{ message: string }> => {
    const response = await api.post('/settings/ai/primary', { agent })
    return response.data
  },
}

export default api
