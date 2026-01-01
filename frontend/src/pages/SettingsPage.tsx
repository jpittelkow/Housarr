import { useState, useRef, useEffect, useReducer, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { household, users, categories, auth, backup, settings, type StorageSettings, type EmailSettings, type AISettings } from '@/services/api'
import type { Category, User, Household } from '@/types'
import { AIAgentCard } from '@/components/settings/AIAgentCard'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Tabs, type Tab } from '@/components/ui/Tabs'
import { Icon, Plus, Users, Tag, Home, Trash2, MapPin, Pencil, Download, Upload, Database, HardDrive, Mail, Zap, Image, HelpTooltip, Star, ChevronDown, ChevronUp, FileText, AddressInput, Map } from '@/components/ui'
import { Textarea } from '@/components/ui/Textarea'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { toast } from 'sonner'
import { getApiErrorMessage } from '@/lib/utils'

// Default AI prompts (must match backend defaults)
const DEFAULT_SMART_ADD_PROMPT = `{context}

IMPORTANT INSTRUCTIONS:
1. Make/Manufacturer - Identify the BRAND NAME visible on the product or recognize it by distinctive design features. 
   - Look for logos, nameplates, badges, or text on the product
   - If the brand is partially visible, use your best judgment
   - Common appliance brands: GE, Samsung, LG, Whirlpool, Frigidaire, Bosch, KitchenAid, Maytag, Thermador, Viking, Wolf, Sub-Zero, Miele, Signature Kitchen Suite, etc.
   - NEVER use "Unknown" or "N/A" - make your best educated guess based on the design

2. Model number - Look for:
   - Model plates, labels, or stickers (often on edges, back, or inside door)
   - Model numbers in visible text
   - If no model visible, describe key features (e.g., "48-inch 6-burner" or "French door")

3. Product type/category

{categories}

Return up to 10 possible matches ranked by confidence.
You MUST return ONLY a valid JSON array with no additional text, markdown, or explanation.

RULES:
- Do NOT use "Unknown", "N/A", "Not visible", or similar placeholder text
- Make your BEST educated guess for the brand based on design style, features, and appearance
- If you're 50% sure it's a Thermador but could be Viking, include BOTH as separate results with different confidence scores
- Model can be a descriptive name if the actual model number isn't visible

Format:
[
  { "make": "Brand Name", "model": "Model Number or Description", "type": "Category Name", "confidence": 0.95 },
  { "make": "Alternative Brand", "model": "Model", "type": "Category Name", "confidence": 0.70 }
]

If you truly cannot identify ANY aspect of the product, return an empty array: []`

const DEFAULT_SYNTHESIS_PROMPT = `You are synthesizing product identification responses from multiple AI assistants.
Each assistant was asked to identify products from the same image or search query.

Your task:
1. Compare all responses and find consensus on make, model, and product type
2. If agents disagree, use your knowledge to determine the most likely correct answer
3. Combine confidence scores - if multiple agents agree, confidence should be higher
4. Return a single consolidated JSON array of the best product matches

IMPORTANT RULES:
- Do NOT use "Unknown", "N/A", "Not visible", or any placeholder text
- Always provide your best guess for the brand/make based on design characteristics
- If model number is not visible, describe key features instead (e.g., "48-inch 6-burner")
- Filter out any "Unknown" results from the source responses

Original analysis prompt: {original_prompt}

Responses from different AI assistants:
{responses}

Return ONLY a valid JSON array with the synthesized best matches, ranked by confidence.
Format:
[
  { "make": "Brand", "model": "Model", "type": "Category", "confidence": 0.95, "agents_agreed": 3 },
  { "make": "Brand", "model": "Alt Model", "type": "Category", "confidence": 0.70, "agents_agreed": 2 }
]`

// Settings state management with useReducer for better performance
type SettingsState = {
  storage: StorageSettings
  email: EmailSettings
  ai: AISettings
  aiKeyEditing: { anthropic: boolean; openai: boolean; gemini: boolean; local: boolean }
}

type SettingsAction =
  | { type: 'SET_STORAGE'; payload: Partial<StorageSettings> }
  | { type: 'SET_EMAIL'; payload: Partial<EmailSettings> }
  | { type: 'SET_AI'; payload: Partial<AISettings> }
  | { type: 'SET_AI_KEY_EDITING'; payload: Partial<SettingsState['aiKeyEditing']> }
  | { type: 'RESET_STORAGE'; payload: StorageSettings }
  | { type: 'RESET_EMAIL'; payload: EmailSettings }
  | { type: 'RESET_AI'; payload: AISettings }
  | { type: 'RESET_AI_KEY_EDITING' }

const initialSettingsState: SettingsState = {
  storage: {
    storage_driver: 'local',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_default_region: '',
    aws_bucket: '',
    aws_endpoint: '',
  },
  email: {
    mail_driver: 'log',
    mail_host: '',
    mail_port: 587,
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
    mail_from_address: '',
    mail_from_name: '',
    mailgun_domain: '',
    mailgun_secret: '',
    mailgun_endpoint: 'api.mailgun.net',
    sendgrid_api_key: '',
    ses_key: '',
    ses_secret: '',
    ses_region: 'us-east-1',
    cloudflare_api_token: '',
    cloudflare_account_id: '',
  },
  ai: {
    ai_provider: 'none',
    ai_model: '',
    anthropic_api_key: '',
    openai_api_key: '',
    openai_base_url: '',
    gemini_api_key: '',
    gemini_base_url: '',
    local_base_url: '',
    local_model: '',
    local_api_key: '',
    ai_prompt_smart_add: '',
    ai_prompt_synthesis: '',
  },
  aiKeyEditing: { anthropic: false, openai: false, gemini: false, local: false },
}

function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_STORAGE':
      return { ...state, storage: { ...state.storage, ...action.payload } }
    case 'SET_EMAIL':
      return { ...state, email: { ...state.email, ...action.payload } }
    case 'SET_AI':
      return { ...state, ai: { ...state.ai, ...action.payload } }
    case 'SET_AI_KEY_EDITING':
      return { ...state, aiKeyEditing: { ...state.aiKeyEditing, ...action.payload } }
    case 'RESET_STORAGE':
      return { ...state, storage: action.payload }
    case 'RESET_EMAIL':
      return { ...state, email: action.payload }
    case 'RESET_AI':
      return { ...state, ai: action.payload }
    case 'RESET_AI_KEY_EDITING':
      return { ...state, aiKeyEditing: { anthropic: false, openai: false, gemini: false, local: false } }
    default:
      return state
  }
}

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  // Tab state
  const [activeTab, setActiveTab] = useState('general')

  // Build tabs based on user role
  const tabs: Tab[] = [
    { id: 'general', label: 'General', icon: Home },
    { id: 'organization', label: 'Organization', icon: Tag },
    ...(isAdmin ? [
      { id: 'integrations', label: 'Integrations', icon: Database },
      { id: 'ai', label: 'AI', icon: Zap },
    ] : []),
  ]

  const [householdName, setHouseholdName] = useState('')
  const [householdAddress, setHouseholdAddress] = useState('')
  const [householdCoords, setHouseholdCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isItemCategoryModalOpen, setIsItemCategoryModalOpen] = useState(false)
  const [isVendorCategoryModalOpen, setIsVendorCategoryModalOpen] = useState(false)
  const [showAIPrompts, setShowAIPrompts] = useState(false)
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'member' as 'admin' | 'member',
  })
  const [itemCategoryData, setItemCategoryData] = useState({ name: '', icon: '', color: '#7F56D9' })
  const [vendorCategoryData, setVendorCategoryData] = useState({ name: '', icon: '', color: '#7F56D9' })
  const [editingUser, setEditingUser] = useState<{ id: number; name: string; email: string; role: 'admin' | 'member' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)

  // Use reducer for settings state - better performance than multiple useState
  const [settingsState, dispatchSettings] = useReducer(settingsReducer, initialSettingsState)
  const { storage: storageSettings, email: emailSettings } = settingsState

  // Memoized dispatch helpers to avoid creating new functions on each render
  const setStorageSettings = useCallback((updates: Partial<StorageSettings>) => {
    dispatchSettings({ type: 'SET_STORAGE', payload: updates })
  }, [])
  const setEmailSettings = useCallback((updates: Partial<EmailSettings>) => {
    dispatchSettings({ type: 'SET_EMAIL', payload: updates })
  }, [])

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => household.get(),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => users.list(),
  })

  const { data: itemCategoriesData } = useQuery({
    queryKey: ['categories', 'item'],
    queryFn: () => categories.list('item'),
  })

  const { data: vendorCategoriesData } = useQuery({
    queryKey: ['categories', 'vendor'],
    queryFn: () => categories.list('vendor'),
  })


  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
    enabled: isAdmin,
  })

  // AI Agents query
  const { data: agentsData, refetch: refetchAgents } = useQuery({
    queryKey: ['ai-agents'],
    queryFn: () => settings.getAgents(),
    enabled: isAdmin,
    refetchInterval: 60000, // Auto-refresh every 60 seconds
  })

  // Populate settings when data is loaded - use RESET for full state replacement
  useEffect(() => {
    if (settingsData?.settings) {
      // Storage settings
      dispatchSettings({
        type: 'RESET_STORAGE',
        payload: {
          storage_driver: (settingsData.settings.storage_driver as 'local' | 's3') || 'local',
          aws_access_key_id: '',
          aws_secret_access_key: '',
          aws_default_region: settingsData.settings.aws_default_region || '',
          aws_bucket: settingsData.settings.aws_bucket || '',
          aws_endpoint: settingsData.settings.aws_endpoint || '',
        },
      })
      // Email settings
      dispatchSettings({
        type: 'RESET_EMAIL',
        payload: {
          mail_driver: (settingsData.settings.mail_driver as EmailSettings['mail_driver']) || 'log',
          mail_host: settingsData.settings.mail_host || '',
          mail_port: settingsData.settings.mail_port ? parseInt(settingsData.settings.mail_port) : 587,
          mail_username: '',
          mail_password: '',
          mail_encryption: (settingsData.settings.mail_encryption as 'tls' | 'ssl' | 'null') || 'tls',
          mail_from_address: settingsData.settings.mail_from_address || '',
          mail_from_name: settingsData.settings.mail_from_name || '',
          mailgun_domain: settingsData.settings.mailgun_domain || '',
          mailgun_secret: '',
          mailgun_endpoint: settingsData.settings.mailgun_endpoint || 'api.mailgun.net',
          sendgrid_api_key: '',
          ses_key: '',
          ses_secret: '',
          ses_region: settingsData.settings.ses_region || 'us-east-1',
          cloudflare_api_token: '',
          cloudflare_account_id: settingsData.settings.cloudflare_account_id || '',
        },
      })
      // AI settings
      dispatchSettings({
        type: 'RESET_AI',
        payload: {
          ai_provider: (settingsData.settings.ai_provider as AISettings['ai_provider']) || 'none',
          ai_model: settingsData.settings.ai_model || '',
          anthropic_api_key: '',
          openai_api_key: '',
          openai_base_url: settingsData.settings.openai_base_url || '',
          gemini_api_key: '',
          gemini_base_url: settingsData.settings.gemini_base_url || '',
          local_base_url: settingsData.settings.local_base_url || '',
          local_model: settingsData.settings.local_model || '',
          local_api_key: '',
          ai_prompt_smart_add: settingsData.settings.ai_prompt_smart_add || '',
          ai_prompt_synthesis: settingsData.settings.ai_prompt_synthesis || '',
        },
      })
    }
  }, [settingsData])

  const updateHouseholdMutation = useMutation({
    mutationFn: (data: { name?: string; address?: string | null; latitude?: number | null; longitude?: number | null }) => household.update(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['household'] })
      const previousHousehold = queryClient.getQueryData(['household'])
      // Optimistically update
      queryClient.setQueryData(['household'], (old: { household: Household } | undefined) => ({
        household: old?.household ? { ...old.household, ...data } : data,
      }))
      return { previousHousehold }
    },
    onSuccess: () => {
      toast.success('Household updated')
    },
    onError: (error, _data, context) => {
      if (context?.previousHousehold) {
        queryClient.setQueryData(['household'], context.previousHousehold)
      }
      toast.error(getApiErrorMessage(error, 'Failed to update household'))
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: typeof inviteData) => auth.invite(data),
    onSuccess: (response) => {
      // Immediately add new user to cache
      queryClient.setQueryData(['users'], (old: { users: User[] } | undefined) => ({
        users: [...(old?.users || []), response.user],
      }))
      setIsInviteModalOpen(false)
      setInviteData({ name: '', email: '', password: '', password_confirmation: '', role: 'member' })
      toast.success('User invited successfully')
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to invite user'))
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => users.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previousUsers = queryClient.getQueryData(['users'])
      // Optimistically remove from cache
      queryClient.setQueryData(['users'], (old: { users: User[] } | undefined) => ({
        users: (old?.users || []).filter((u) => u.id !== id),
      }))
      return { previousUsers }
    },
    onSuccess: () => {
      toast.success('User removed')
    },
    onError: (error, _id, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers)
      }
      toast.error(getApiErrorMessage(error, 'Failed to remove user'))
    },
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; email?: string; role?: 'admin' | 'member' } }) =>
      users.update(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ['users'] })
      const previousUsers = queryClient.getQueryData(['users'])
      // Optimistically update
      queryClient.setQueryData(['users'], (old: { users: User[] } | undefined) => ({
        users: (old?.users || []).map((u) => (u.id === id ? { ...u, ...data } : u)),
      }))
      return { previousUsers }
    },
    onSuccess: () => {
      setEditingUser(null)
      toast.success('User updated')
    },
    onError: (error, _vars, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(['users'], context.previousUsers)
      }
      toast.error(getApiErrorMessage(error, 'Failed to update user'))
    },
  })

  const createItemCategoryMutation = useMutation({
    mutationFn: (data: typeof itemCategoryData) => categories.create({ ...data, type: 'item' }),
    onSuccess: (response) => {
      // Immediately update cache with new category
      queryClient.setQueryData(['categories', 'item'], (old: { categories: Category[] } | undefined) => ({
        categories: [...(old?.categories || []), response.category],
      }))
      setIsItemCategoryModalOpen(false)
      setItemCategoryData({ name: '', icon: '', color: '#7F56D9' })
      toast.success('Item category created')
    },
  })

  const createVendorCategoryMutation = useMutation({
    mutationFn: (data: typeof vendorCategoryData) => categories.create({ ...data, type: 'vendor' }),
    onSuccess: (response) => {
      // Immediately update cache with new category
      queryClient.setQueryData(['categories', 'vendor'], (old: { categories: Category[] } | undefined) => ({
        categories: [...(old?.categories || []), response.category],
      }))
      setIsVendorCategoryModalOpen(false)
      setVendorCategoryData({ name: '', icon: '', color: '#7F56D9' })
      toast.success('Vendor category created')
    },
  })

  const deleteItemCategoryMutation = useMutation({
    mutationFn: (id: number) => categories.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories', 'item'] })
      const previousCategories = queryClient.getQueryData(['categories', 'item'])
      // Optimistically remove from cache
      queryClient.setQueryData(['categories', 'item'], (old: { categories: Category[] } | undefined) => ({
        categories: (old?.categories || []).filter((cat) => cat.id !== id),
      }))
      return { previousCategories }
    },
    onSuccess: () => {
      toast.success('Item category deleted')
    },
    onError: (_err, _id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories', 'item'], context.previousCategories)
      }
      toast.error('Cannot delete system categories')
    },
  })

  const deleteVendorCategoryMutation = useMutation({
    mutationFn: (id: number) => categories.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['categories', 'vendor'] })
      const previousCategories = queryClient.getQueryData(['categories', 'vendor'])
      // Optimistically remove from cache
      queryClient.setQueryData(['categories', 'vendor'], (old: { categories: Category[] } | undefined) => ({
        categories: (old?.categories || []).filter((cat) => cat.id !== id),
      }))
      return { previousCategories }
    },
    onSuccess: () => {
      toast.success('Vendor category deleted')
    },
    onError: (_err, _id, context) => {
      if (context?.previousCategories) {
        queryClient.setQueryData(['categories', 'vendor'], context.previousCategories)
      }
      toast.error('Cannot delete system categories')
    },
  })


  const importBackupMutation = useMutation({
    mutationFn: (file: File) => backup.import(file),
    onSuccess: (data) => {
      // Clear all cached queries
      queryClient.clear()
      // Show success message
      toast.success(data.message + ' - Reloading app...')
      // Full page reload to ensure all data is fresh
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Failed to import backup'))
    },
  })

  const updateStorageSettingsMutation = useMutation({
    mutationFn: (data: StorageSettings) => settings.update(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] })
      const previousSettings = queryClient.getQueryData(['settings'])
      // Optimistically update
      queryClient.setQueryData(['settings'], (old: { settings: Record<string, unknown> } | undefined) => ({
        settings: { ...(old?.settings || {}), ...data },
      }))
      return { previousSettings }
    },
    onSuccess: () => {
      toast.success('Storage settings updated')
    },
    onError: (error, _data, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
      }
      toast.error(getApiErrorMessage(error, 'Failed to update storage settings'))
    },
  })

  const updateEmailSettingsMutation = useMutation({
    mutationFn: (data: EmailSettings) => settings.update(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] })
      const previousSettings = queryClient.getQueryData(['settings'])
      // Optimistically update
      queryClient.setQueryData(['settings'], (old: { settings: Record<string, unknown> } | undefined) => ({
        settings: { ...(old?.settings || {}), ...data },
      }))
      return { previousSettings }
    },
    onSuccess: () => {
      toast.success('Email settings updated')
    },
    onError: (error, _data, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
      }
      toast.error(getApiErrorMessage(error, 'Failed to update email settings'))
    },
  })

  const updateAIPromptsMutation = useMutation({
    mutationFn: (data: { ai_prompt_smart_add?: string; ai_prompt_synthesis?: string }) => settings.update(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] })
      const previousSettings = queryClient.getQueryData(['settings'])
      // Optimistically update cache
      queryClient.setQueryData(['settings'], (old: { settings: Record<string, unknown> } | undefined) => ({
        settings: { ...(old?.settings || {}), ...data },
      }))
      // Also update local reducer state immediately
      dispatchSettings({ type: 'SET_AI', payload: data })
      return { previousSettings }
    },
    onSuccess: () => {
      toast.success('AI prompts updated')
    },
    onError: (error, _data, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings)
      }
      toast.error(getApiErrorMessage(error, 'Failed to update AI prompts'))
    },
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await backup.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `housarr-backup-${new Date().toISOString().slice(0, 10)}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded (includes all files)')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to export backup'))
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (confirm('This will replace all your current data. Are you sure you want to continue?')) {
        importBackupMutation.mutate(file)
      }
      e.target.value = ''
    }
  }

  const allUsers = usersData?.users || []
  const allItemCategories = itemCategoriesData?.categories || []
  const customItemCategories = allItemCategories.filter((c) => c.household_id !== null)
  const systemItemCategories = allItemCategories.filter((c) => c.household_id === null)

  const allVendorCategories = vendorCategoriesData?.categories || []
  const customVendorCategories = allVendorCategories.filter((c) => c.household_id !== null)
  const systemVendorCategories = allVendorCategories.filter((c) => c.household_id === null)


  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          Settings
          <HelpTooltip position="right">
            Configure your household, manage categories and locations, invite users, and set up backups.
          </HelpTooltip>
        </h1>
        <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Manage your household settings</p>
      </div>

      {/* Tabs Navigation */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      <div className="space-y-6">
        {/* ============ GENERAL TAB ============ */}
        {activeTab === 'general' && (
          <>
            {/* Household */}
            <Card>
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Home} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Household</CardTitle>
                    <CardDescription>Update your household name and images</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const coords = householdCoords || (householdData?.household?.latitude && householdData?.household?.longitude 
                      ? { lat: householdData.household.latitude, lon: householdData.household.longitude }
                      : null)
                    updateHouseholdMutation.mutate({
                      name: householdName || householdData?.household?.name || '',
                      address: householdAddress || householdData?.household?.address || null,
                      latitude: coords?.lat ?? null,
                      longitude: coords?.lon ?? null,
                    })
                  }}
                  className="space-y-4"
                >
                  <Input
                    label="Household Name"
                    value={householdName || householdData?.household?.name || ''}
                    onChange={(e) => setHouseholdName(e.target.value)}
                    placeholder="e.g., Smith Residence"
                  />
                  <AddressInput
                    label="Address"
                    value={householdAddress || householdData?.household?.address || ''}
                    onChange={(value, addressData) => {
                      setHouseholdAddress(value)
                      if (addressData?.lat && addressData?.lon) {
                        setHouseholdCoords({ lat: parseFloat(addressData.lat), lon: parseFloat(addressData.lon) })
                      }
                    }}
                    placeholder="Start typing your address..."
                    hint="Used for finding nearby vendors and service providers"
                  />
                  
                  {/* Show map if we have coordinates */}
                  {(householdCoords || (householdData?.household?.latitude && householdData?.household?.longitude)) && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        <Icon icon={MapPin} size="xs" className="inline mr-1.5" />
                        Location
                      </label>
                      <Map
                        lat={householdCoords?.lat ?? householdData?.household?.latitude ?? 0}
                        lon={householdCoords?.lon ?? householdData?.household?.longitude ?? 0}
                        markerLabel={householdData?.household?.name || 'Home'}
                        height="250px"
                        zoom={14}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button type="submit" isLoading={updateHouseholdMutation.isPending}>
                      Save
                    </Button>
                  </div>
                </form>

                {householdData?.household && (
                  <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      <Icon icon={Image} size="xs" className="inline mr-2 text-gray-400" />
                      Household Images
                    </label>
                    <ImageUpload
                      fileableType="household"
                      fileableId={householdData.household.id}
                      existingImages={householdData.household.images || []}
                      featuredImage={householdData.household.featured_image}
                      invalidateQueries={[['household']]}
                      label="Upload household images"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Users */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Users} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Household Members</CardTitle>
                    <CardDescription>Manage who has access to your household</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsInviteModalOpen(true)} size="sm">
                  <Icon icon={Plus} size="xs" /> Invite
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {allUsers.map((u) => (
                    <li key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                            {u.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{u.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={u.role === 'admin' ? 'primary' : 'gray'}>
                          {u.role}
                        </Badge>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser({ id: u.id, name: u.name, email: u.email, role: u.role })}
                          >
                            <Icon icon={Pencil} size="xs" />
                          </Button>
                          {u.id !== user?.id && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to remove this user?')) {
                                  deleteUserMutation.mutate(u.id)
                                }
                              }}
                            >
                              <Icon icon={Trash2} size="xs" className="text-red-500" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        {/* ============ ORGANIZATION TAB ============ */}
        {activeTab === 'organization' && (
          <>
            {/* Item Categories */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Tag} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Item Categories</CardTitle>
                    <CardDescription>Organize your household items</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsItemCategoryModalOpen(true)} size="sm">
                  <Icon icon={Plus} size="xs" /> Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {customItemCategories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {customItemCategories.map((c) => (
                          <Badge
                            key={c.id}
                            style={{ backgroundColor: `${c.color}15`, color: c.color ?? undefined, borderColor: `${c.color}30` }}
                            className="group cursor-pointer border"
                            onClick={() => {
                              if (confirm('Delete this category?')) {
                                deleteItemCategoryMutation.mutate(c.id)
                              }
                            }}
                          >
                            {c.name}
                            <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {systemItemCategories.map((c) => (
                        <Badge
                          key={c.id}
                          style={{ backgroundColor: `${c.color}15`, color: c.color ?? undefined, borderColor: `${c.color}30` }}
                          className="border"
                        >
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vendor Categories */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Tag} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Vendor Categories</CardTitle>
                    <CardDescription>Organize your vendors and service providers</CardDescription>
                  </div>
                </div>
                <Button onClick={() => setIsVendorCategoryModalOpen(true)} size="sm">
                  <Icon icon={Plus} size="xs" /> Add
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {customVendorCategories.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Custom Categories</h4>
                      <div className="flex flex-wrap gap-2">
                        {customVendorCategories.map((c) => (
                          <Badge
                            key={c.id}
                            style={{ backgroundColor: `${c.color}15`, color: c.color ?? undefined, borderColor: `${c.color}30` }}
                            className="group cursor-pointer border"
                            onClick={() => {
                              if (confirm('Delete this category?')) {
                                deleteVendorCategoryMutation.mutate(c.id)
                              }
                            }}
                          >
                            {c.name}
                            <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">×</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">System Categories</h4>
                    <div className="flex flex-wrap gap-2">
                      {systemVendorCategories.map((c) => (
                        <Badge
                          key={c.id}
                          style={{ backgroundColor: `${c.color}15`, color: c.color ?? undefined, borderColor: `${c.color}30` }}
                          className="border"
                        >
                          {c.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </>
        )}

        {/* ============ INTEGRATIONS TAB (Admin only) ============ */}
        {activeTab === 'integrations' && isAdmin && (
          <>
            {/* Data Management */}
            <Card>
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Database} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Export and import your household data</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Export Backup</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Download a ZIP backup with all your data and files</p>
                    </div>
                    <Button onClick={handleExport} isLoading={isExporting} variant="secondary">
                      <Icon icon={Download} size="xs" /> Export ZIP
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">Import Backup</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Restore data from a ZIP or JSON backup file</p>
                    </div>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".zip,.json"
                        onChange={handleImport}
                        className="hidden"
                      />
                      <Button
                        onClick={() => fileInputRef.current?.click()}
                        isLoading={importBackupMutation.isPending}
                        variant="secondary"
                      >
                        <Icon icon={Upload} size="xs" /> Import
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Note: Importing will replace all existing data and files. ZIP backups include files; JSON backups restore data only.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Storage Configuration */}
            <Card>
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={HardDrive} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>File Storage</CardTitle>
                    <CardDescription>Configure where files and attachments are stored</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateStorageSettingsMutation.mutate(storageSettings)
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Storage Driver</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="storage_driver"
                          value="local"
                          checked={storageSettings.storage_driver === 'local'}
                          onChange={(e) => setStorageSettings({ storage_driver: e.target.value as 'local' | 's3' })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">Local</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="storage_driver"
                          value="s3"
                          checked={storageSettings.storage_driver === 's3'}
                          onChange={(e) => setStorageSettings({ storage_driver: e.target.value as 'local' | 's3' })}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100">S3 / S3-Compatible</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Local stores files on the server. S3 works with AWS S3, MinIO, DigitalOcean Spaces, etc.
                    </p>
                  </div>

                  {storageSettings.storage_driver === 's3' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Input
                        label="Access Key ID"
                        type="password"
                        value={storageSettings.aws_access_key_id || ''}
                        onChange={(e) => setStorageSettings({ aws_access_key_id: e.target.value })}
                        placeholder="Enter access key (leave blank to keep current)"
                      />
                      <Input
                        label="Secret Access Key"
                        type="password"
                        value={storageSettings.aws_secret_access_key || ''}
                        onChange={(e) => setStorageSettings({ aws_secret_access_key: e.target.value })}
                        placeholder="Enter secret key (leave blank to keep current)"
                      />
                      <Input
                        label="Region"
                        value={storageSettings.aws_default_region || ''}
                        onChange={(e) => setStorageSettings({ aws_default_region: e.target.value })}
                        placeholder="e.g., us-east-1"
                      />
                      <Input
                        label="Bucket"
                        value={storageSettings.aws_bucket || ''}
                        onChange={(e) => setStorageSettings({ aws_bucket: e.target.value })}
                        placeholder="e.g., my-bucket"
                      />
                      <Input
                        label="Endpoint (for S3-compatible services)"
                        value={storageSettings.aws_endpoint || ''}
                        onChange={(e) => setStorageSettings({ aws_endpoint: e.target.value })}
                        placeholder="e.g., https://minio.example.com"
                        hint="Leave blank for AWS S3. Required for MinIO, DigitalOcean Spaces, etc."
                      />
                    </div>
                  )}

                  <Button type="submit" isLoading={updateStorageSettingsMutation.isPending}>
                    Save Storage Settings
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Email Configuration */}
            <Card>
              <CardHeader className="border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Mail} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <CardTitle>Email Configuration</CardTitle>
                    <CardDescription>Configure how the system sends emails</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    updateEmailSettingsMutation.mutate(emailSettings)
                  }}
                  className="space-y-6"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Provider</label>
                    <Select
                      options={[
                        { value: 'log', label: 'Log Only (Development)' },
                        { value: 'smtp', label: 'SMTP' },
                        { value: 'mailgun', label: 'Mailgun' },
                        { value: 'sendgrid', label: 'SendGrid' },
                        { value: 'ses', label: 'Amazon SES' },
                        { value: 'cloudflare', label: 'Cloudflare Email' },
                      ]}
                      value={emailSettings.mail_driver || 'log'}
                      onChange={(e) => setEmailSettings({ mail_driver: e.target.value as EmailSettings['mail_driver'] })}
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Select your email service provider. "Log Only" writes emails to logs instead of sending.
                    </p>
                  </div>

                  {/* Common From Address Settings */}
                  {emailSettings.mail_driver !== 'log' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Sender Information</h4>
                      <Input
                        label="From Email Address"
                        type="email"
                        value={emailSettings.mail_from_address || ''}
                        onChange={(e) => setEmailSettings({ mail_from_address: e.target.value })}
                        placeholder="noreply@example.com"
                      />
                      <Input
                        label="From Name"
                        value={emailSettings.mail_from_name || ''}
                        onChange={(e) => setEmailSettings({ mail_from_name: e.target.value })}
                        placeholder="Housarr"
                      />
                    </div>
                  )}

                  {/* SMTP Settings */}
                  {emailSettings.mail_driver === 'smtp' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">SMTP Settings</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="SMTP Host"
                          value={emailSettings.mail_host || ''}
                          onChange={(e) => setEmailSettings({ mail_host: e.target.value })}
                          placeholder="smtp.example.com"
                        />
                        <Input
                          label="Port"
                          type="number"
                          value={emailSettings.mail_port || 587}
                          onChange={(e) => setEmailSettings({ mail_port: parseInt(e.target.value) || 587 })}
                          placeholder="587"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="Username"
                          type="password"
                          value={emailSettings.mail_username || ''}
                          onChange={(e) => setEmailSettings({ mail_username: e.target.value })}
                          placeholder="Enter username (leave blank to keep current)"
                        />
                        <Input
                          label="Password"
                          type="password"
                          value={emailSettings.mail_password || ''}
                          onChange={(e) => setEmailSettings({ mail_password: e.target.value })}
                          placeholder="Enter password (leave blank to keep current)"
                        />
                      </div>
                      <Select
                        label="Encryption"
                        options={[
                          { value: 'tls', label: 'TLS' },
                          { value: 'ssl', label: 'SSL' },
                          { value: 'null', label: 'None' },
                        ]}
                        value={emailSettings.mail_encryption || 'tls'}
                        onChange={(e) => setEmailSettings({ mail_encryption: e.target.value as 'tls' | 'ssl' | 'null' })}
                      />
                    </div>
                  )}

                  {/* Mailgun Settings */}
                  {emailSettings.mail_driver === 'mailgun' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Mailgun Settings</h4>
                      <Input
                        label="Domain"
                        value={emailSettings.mailgun_domain || ''}
                        onChange={(e) => setEmailSettings({ mailgun_domain: e.target.value })}
                        placeholder="mg.example.com"
                      />
                      <Input
                        label="API Key"
                        type="password"
                        value={emailSettings.mailgun_secret || ''}
                        onChange={(e) => setEmailSettings({ mailgun_secret: e.target.value })}
                        placeholder="Enter API key (leave blank to keep current)"
                      />
                      <Input
                        label="Endpoint"
                        value={emailSettings.mailgun_endpoint || 'api.mailgun.net'}
                        onChange={(e) => setEmailSettings({ mailgun_endpoint: e.target.value })}
                        placeholder="api.mailgun.net"
                        hint="Use api.eu.mailgun.net for EU region"
                      />
                    </div>
                  )}

                  {/* SendGrid Settings */}
                  {emailSettings.mail_driver === 'sendgrid' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">SendGrid Settings</h4>
                      <Input
                        label="API Key"
                        type="password"
                        value={emailSettings.sendgrid_api_key || ''}
                        onChange={(e) => setEmailSettings({ sendgrid_api_key: e.target.value })}
                        placeholder="Enter API key (leave blank to keep current)"
                        hint="Your SendGrid API key starting with SG."
                      />
                    </div>
                  )}

                  {/* Amazon SES Settings */}
                  {emailSettings.mail_driver === 'ses' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Amazon SES Settings</h4>
                      <Input
                        label="Access Key ID"
                        type="password"
                        value={emailSettings.ses_key || ''}
                        onChange={(e) => setEmailSettings({ ses_key: e.target.value })}
                        placeholder="Enter access key (leave blank to keep current)"
                      />
                      <Input
                        label="Secret Access Key"
                        type="password"
                        value={emailSettings.ses_secret || ''}
                        onChange={(e) => setEmailSettings({ ses_secret: e.target.value })}
                        placeholder="Enter secret key (leave blank to keep current)"
                      />
                      <Input
                        label="Region"
                        value={emailSettings.ses_region || 'us-east-1'}
                        onChange={(e) => setEmailSettings({ ses_region: e.target.value })}
                        placeholder="us-east-1"
                      />
                    </div>
                  )}

                  {/* Cloudflare Email Settings */}
                  {emailSettings.mail_driver === 'cloudflare' && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Cloudflare Email Settings</h4>
                      <Input
                        label="Account ID"
                        value={emailSettings.cloudflare_account_id || ''}
                        onChange={(e) => setEmailSettings({ cloudflare_account_id: e.target.value })}
                        placeholder="Your Cloudflare Account ID"
                        hint="Found in your Cloudflare dashboard URL or account settings"
                      />
                      <Input
                        label="API Token"
                        type="password"
                        value={emailSettings.cloudflare_api_token || ''}
                        onChange={(e) => setEmailSettings({ cloudflare_api_token: e.target.value })}
                        placeholder="Enter API token (leave blank to keep current)"
                        hint="Create a token with Email Routing permissions"
                      />
                    </div>
                  )}

                  <Button type="submit" isLoading={updateEmailSettingsMutation.isPending}>
                    Save Email Settings
                  </Button>
                </form>
              </CardContent>
            </Card>
          </>
        )}

        {/* ============ AI TAB (Admin only) ============ */}
        {activeTab === 'ai' && isAdmin && (
          <Card>
            <CardHeader className="border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center">
                  <Icon icon={Zap} size="sm" className="text-gray-700 dark:text-gray-300" />
                </div>
                <div>
                  <CardTitle>AI Configuration</CardTitle>
                  <CardDescription>Configure AI providers for smart features. Enable multiple agents and set a primary for result summarization.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {agentsData?.agents ? (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Enable AI agents below. The <Badge variant="primary" size="sm"><Icon icon={Star} size="xs" className="mr-0.5" />Primary</Badge> agent is used for summarizing results when multiple agents are called.
                    </p>
                    <div className="grid gap-4">
                      {agentsData.agents.map((agent) => (
                        <AIAgentCard
                          key={agent.name}
                          agent={agent}
                          hasApiKey={agentsData.key_status[agent.name] ?? false}
                          onRefresh={() => refetchAgents()}
                        />
                      ))}
                    </div>
                  </div>

                  {/* AI Prompts Section */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowAIPrompts(!showAIPrompts)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <div className="flex items-center gap-2">
                        <Icon icon={FileText} size="sm" className="text-gray-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">AI Prompts</span>
                        <Badge variant="gray" size="sm">Advanced</Badge>
                      </div>
                      <Icon icon={showAIPrompts ? ChevronUp : ChevronDown} size="sm" className="text-gray-500" />
                    </button>
                    
                    {showAIPrompts && (
                      <div className="mt-4 space-y-6">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Customize the prompts used for AI analysis. Use placeholders: <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{'{context}'}</code> for analysis context, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{'{categories}'}</code> for available categories, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{'{original_prompt}'}</code> for synthesis original prompt, <code className="px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">{'{responses}'}</code> for agent responses.
                        </p>
                        
                        {/* Smart Add Prompt */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Smart Add Analysis Prompt
                          </label>
                          <Textarea
                            value={settingsState.ai.ai_prompt_smart_add || DEFAULT_SMART_ADD_PROMPT}
                            onChange={(e) => dispatchSettings({ type: 'SET_AI', payload: { ai_prompt_smart_add: e.target.value } })}
                            rows={12}
                            className="font-mono text-xs"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Used when analyzing images or text in Smart Add. Placeholders: {'{context}'}, {'{categories}'}
                          </p>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => dispatchSettings({ type: 'SET_AI', payload: { ai_prompt_smart_add: DEFAULT_SMART_ADD_PROMPT } })}
                            >
                              Reset to Default
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateAIPromptsMutation.mutate({
                                ai_prompt_smart_add: settingsState.ai.ai_prompt_smart_add === DEFAULT_SMART_ADD_PROMPT ? '' : settingsState.ai.ai_prompt_smart_add,
                              })}
                              isLoading={updateAIPromptsMutation.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        </div>

                        {/* Synthesis Prompt */}
                        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Multi-Agent Synthesis Prompt
                          </label>
                          <Textarea
                            value={settingsState.ai.ai_prompt_synthesis || DEFAULT_SYNTHESIS_PROMPT}
                            onChange={(e) => dispatchSettings({ type: 'SET_AI', payload: { ai_prompt_synthesis: e.target.value } })}
                            rows={12}
                            className="font-mono text-xs"
                          />
                          <p className="mt-1 text-xs text-gray-500">
                            Used to combine results from multiple AI agents. Placeholders: {'{original_prompt}'}, {'{responses}'}
                          </p>
                          <div className="flex justify-end gap-2 mt-3">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => dispatchSettings({ type: 'SET_AI', payload: { ai_prompt_synthesis: DEFAULT_SYNTHESIS_PROMPT } })}
                            >
                              Reset to Default
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => updateAIPromptsMutation.mutate({
                                ai_prompt_synthesis: settingsState.ai.ai_prompt_synthesis === DEFAULT_SYNTHESIS_PROMPT ? '' : settingsState.ai.ai_prompt_synthesis,
                              })}
                              isLoading={updateAIPromptsMutation.isPending}
                            >
                              Save
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  Loading AI configuration...
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ============ MODALS ============ */}

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Invite User">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            inviteMutation.mutate(inviteData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={inviteData.name}
            onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
            required
          />
          <Input
            label="Email"
            type="email"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            required
          />
          <Input
            label="Password"
            type="password"
            value={inviteData.password}
            onChange={(e) => setInviteData({ ...inviteData, password: e.target.value })}
            required
          />
          <Input
            label="Confirm Password"
            type="password"
            value={inviteData.password_confirmation}
            onChange={(e) => setInviteData({ ...inviteData, password_confirmation: e.target.value })}
            required
          />
          <Select
            label="Role"
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={inviteData.role}
            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as 'admin' | 'member' })}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending}>
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Item Category Modal */}
      <Modal isOpen={isItemCategoryModalOpen} onClose={() => setIsItemCategoryModalOpen(false)} title="Add Item Category">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createItemCategoryMutation.mutate(itemCategoryData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={itemCategoryData.name}
            onChange={(e) => setItemCategoryData({ ...itemCategoryData, name: e.target.value })}
            placeholder="e.g., Appliances"
            required
          />
          <Input
            label="Icon"
            value={itemCategoryData.icon}
            onChange={(e) => setItemCategoryData({ ...itemCategoryData, icon: e.target.value })}
            placeholder="e.g., home"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={itemCategoryData.color}
                onChange={(e) => setItemCategoryData({ ...itemCategoryData, color: e.target.value })}
                className="h-10 w-14 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <Input
                value={itemCategoryData.color}
                onChange={(e) => setItemCategoryData({ ...itemCategoryData, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setIsItemCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createItemCategoryMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vendor Category Modal */}
      <Modal isOpen={isVendorCategoryModalOpen} onClose={() => setIsVendorCategoryModalOpen(false)} title="Add Vendor Category">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createVendorCategoryMutation.mutate(vendorCategoryData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={vendorCategoryData.name}
            onChange={(e) => setVendorCategoryData({ ...vendorCategoryData, name: e.target.value })}
            placeholder="e.g., Plumber"
            required
          />
          <Input
            label="Icon"
            value={vendorCategoryData.icon}
            onChange={(e) => setVendorCategoryData({ ...vendorCategoryData, icon: e.target.value })}
            placeholder="e.g., wrench"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={vendorCategoryData.color}
                onChange={(e) => setVendorCategoryData({ ...vendorCategoryData, color: e.target.value })}
                className="h-10 w-14 rounded-lg border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <Input
                value={vendorCategoryData.color}
                onChange={(e) => setVendorCategoryData({ ...vendorCategoryData, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setIsVendorCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createVendorCategoryMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingUser) {
              updateUserMutation.mutate({
                id: editingUser.id,
                data: { name: editingUser.name, email: editingUser.email, role: editingUser.role },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editingUser?.name || ''}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editingUser?.email || ''}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
            required
          />
          <Select
            label="Role"
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={editingUser?.role || 'member'}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as 'admin' | 'member' } : null)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateUserMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
