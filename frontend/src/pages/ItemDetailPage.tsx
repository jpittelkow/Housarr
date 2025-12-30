import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { items, categories, locations, vendors, parts, maintenanceLogs, files } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { DocumentUpload, PartsMultiSelect } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  Icon,
  ArrowLeft,
  Calendar,
  MapPin,
  Wrench,
  Package,
  Bell,
  Trash2,
  Pencil,
  Plus,
  FileText,
  Sparkles,
  Download,
  Loader2,
  Check,
  X,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Users,
  Link,
  Star,
} from '@/components/ui'
import { toast } from 'sonner'
import { ItemChatPanel } from '@/components/Chat'
import type { Item, Part, MaintenanceLog, FileRecord } from '@/types'

// Calculate smart stats based on install date and item properties
function useItemStats(item: Item | undefined) {
  return useMemo(() => {
    if (!item) return null

    const now = new Date()
    const installDate = item.install_date ? new Date(item.install_date) : null

    // Calculate age in months
    const ageMonths = installDate
      ? Math.floor((now.getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
      : null
    const ageYears = ageMonths !== null ? ageMonths / 12 : null

    // Warranty status
    let warrantyStatus: { inWarranty: boolean; remaining: string | null; expireDate: Date | null } | null = null
    if (item.warranty_years && installDate) {
      const warrantyEndDate = new Date(installDate)
      warrantyEndDate.setFullYear(warrantyEndDate.getFullYear() + item.warranty_years)
      const inWarranty = now < warrantyEndDate

      if (inWarranty) {
        const remainingMonths = Math.floor((warrantyEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        const years = Math.floor(remainingMonths / 12)
        const months = remainingMonths % 12
        warrantyStatus = {
          inWarranty: true,
          remaining: years > 0 ? `${years}y ${months}mo left` : `${months}mo left`,
          expireDate: warrantyEndDate,
        }
      } else {
        const expiredMonths = Math.floor((now.getTime() - warrantyEndDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44))
        const years = Math.floor(expiredMonths / 12)
        const months = expiredMonths % 12
        warrantyStatus = {
          inWarranty: false,
          remaining: years > 0 ? `Expired ${years}y ${months}mo ago` : `Expired ${months}mo ago`,
          expireDate: warrantyEndDate,
        }
      }
    }

    // Lifespan status
    let lifespanStatus: { percentUsed: number; yearsRemaining: number | null; status: 'good' | 'warning' | 'critical'; expectedEndDate: Date | null } | null = null
    if (item.typical_lifespan_years && ageYears !== null && installDate) {
      const percentUsed = Math.min(100, Math.round((ageYears / item.typical_lifespan_years) * 100))
      const yearsRemaining = Math.max(0, item.typical_lifespan_years - ageYears)
      const expectedEndDate = new Date(installDate)
      expectedEndDate.setFullYear(expectedEndDate.getFullYear() + item.typical_lifespan_years)
      lifespanStatus = {
        percentUsed,
        yearsRemaining: Math.round(yearsRemaining * 10) / 10,
        status: percentUsed >= 90 ? 'critical' : percentUsed >= 70 ? 'warning' : 'good',
        expectedEndDate,
      }
    }

    // Next maintenance
    let maintenanceStatus: { dueIn: string; overdue: boolean; nextDate: Date | null } | null = null
    if (item.maintenance_interval_months && installDate) {
      // Find the last maintenance log
      const lastMaintenance = item.maintenanceLogs?.length
        ? new Date(Math.max(...item.maintenanceLogs.map(log => new Date(log.date).getTime())))
        : installDate

      const nextMaintenanceDate = new Date(lastMaintenance)
      nextMaintenanceDate.setMonth(nextMaintenanceDate.getMonth() + item.maintenance_interval_months)

      const overdue = now > nextMaintenanceDate
      const diffMs = Math.abs(nextMaintenanceDate.getTime() - now.getTime())
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      const diffMonths = Math.floor(diffDays / 30.44)

      maintenanceStatus = {
        dueIn: diffMonths > 0 ? `${diffMonths}mo` : `${diffDays}d`,
        overdue,
        nextDate: nextMaintenanceDate,
      }
    }

    return {
      ageMonths,
      ageYears,
      warrantyStatus,
      lifespanStatus,
      maintenanceStatus,
    }
  }, [item])
}

function DetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        <div className="space-y-2 flex-1">
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-32" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>

      {/* Stats skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-16 mb-2" />
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-24" />
          </div>
        ))}
      </div>

      {/* Content skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-64" />
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-48" />
        </div>
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 aspect-square" />
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 border border-gray-200 dark:border-gray-800 h-32" />
        </div>
      </div>
    </div>
  )
}

export default function ItemDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editData, setEditData] = useState<Partial<Item>>({})

  // Collapsible sections state
  const [showImageUpload, setShowImageUpload] = useState(false)
  const [showDocUpload, setShowDocUpload] = useState(false)

  // Document preview and delete state
  const [previewDoc, setPreviewDoc] = useState<FileRecord | null>(null)
  const [docToDelete, setDocToDelete] = useState<FileRecord | null>(null)
  const [showDocUrlInput, setShowDocUrlInput] = useState(false)
  const [docUrlInput, setDocUrlInput] = useState('')
  const [docUrlDisplayName, setDocUrlDisplayName] = useState('')
  const [editingDocName, setEditingDocName] = useState<FileRecord | null>(null)
  const [editingDocNameValue, setEditingDocNameValue] = useState('')

  // Image gallery modal state
  const [isGalleryOpen, setIsGalleryOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)

  // Parts state
  const [isPartModalOpen, setIsPartModalOpen] = useState(false)
  const [editingPart, setEditingPart] = useState<Part | null>(null)
  const [partFormData, setPartFormData] = useState({
    name: '',
    part_number: '',
    type: 'replacement' as 'replacement' | 'consumable',
    purchase_url: '',
    price: '',
    notes: '',
  })

  // Maintenance logs state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false)
  const [editingLog, setEditingLog] = useState<MaintenanceLog | null>(null)
  const [logFormData, setLogFormData] = useState({
    type: 'service' as 'service' | 'repair' | 'replacement' | 'inspection',
    date: new Date().toISOString().split('T')[0],
    vendor_id: '',
    cost: '',
    notes: '',
    part_ids: [] as number[],
  })

  // Smart Fill state
  const [isSmartFillOpen, setIsSmartFillOpen] = useState(false)
  const [smartFillStatus, setSmartFillStatus] = useState<{
    manual: 'idle' | 'searching' | 'downloading' | 'success' | 'error'
    suggestions: 'idle' | 'loading' | 'success' | 'error'
    parts: 'idle' | 'loading' | 'success' | 'error'
  }>({ manual: 'idle', suggestions: 'idle', parts: 'idle' })
  const [manualSearchStep, setManualSearchStep] = useState<string>('')
  const [manualSearchProgress, setManualSearchProgress] = useState<{
    repositories: { status: 'pending' | 'searching' | 'done'; count: number }
    ai: { status: 'pending' | 'searching' | 'done'; count: number }
    web: { status: 'pending' | 'searching' | 'done'; count: number }
    downloading: { status: 'pending' | 'trying' | 'done'; current: string }
  }>({
    repositories: { status: 'pending', count: 0 },
    ai: { status: 'pending', count: 0 },
    web: { status: 'pending', count: 0 },
    downloading: { status: 'pending', current: '' },
  })
  const [aiSuggestions, setAISuggestions] = useState<{
    warranty_years?: number
    maintenance_interval_months?: number
    typical_lifespan_years?: number
    notes?: string
  } | null>(null)
  const [aiSuggestionsStep, setAISuggestionsStep] = useState<string>('')
  const [aiSuggestionsProgress, setAISuggestionsProgress] = useState<{
    config: { status: 'pending' | 'checking' | 'done' | 'error'; provider?: string }
    query: { status: 'pending' | 'querying' | 'done' | 'error'; error?: string }
  }>({
    config: { status: 'pending' },
    query: { status: 'pending' },
  })

  // Multi-agent metadata for AI suggestions
  const [aiSuggestionsAgentMeta, setAISuggestionsAgentMeta] = useState<{
    agents_used: string[]
    agents_succeeded: number
    agent_details: Record<string, { success: boolean; duration_ms: number }>
    synthesis_agent: string | null
    total_duration_ms: number
  } | null>(null)

  // Multi-agent metadata for parts suggestions
  const [partsAgentMeta, setPartsAgentMeta] = useState<{
    agents_used: string[]
    agents_succeeded: number
    agent_details: Record<string, { success: boolean; duration_ms: number }>
    synthesis_agent: string | null
    total_duration_ms: number
    manuals_used: number
  } | null>(null)

  // Part images (lazy loaded)
  const [partImages, setPartImages] = useState<Record<number, string | null>>({})
  const [loadingPartImages, setLoadingPartImages] = useState<Set<number>>(new Set())

  // Agent display names
  const AGENT_DISPLAY_NAMES: Record<string, string> = {
    claude: 'Claude',
    openai: 'GPT-4',
    gemini: 'Gemini',
    local: 'Local',
  }

  // Parts suggestion state
  type SuggestedPart = {
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
  }
  const [suggestedParts, setSuggestedParts] = useState<SuggestedPart[]>([])
  const [selectedParts, setSelectedParts] = useState<Set<number>>(new Set())
  const [partsStep, setPartsStep] = useState<string>('')
  const [isAddingParts, setIsAddingParts] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['items', id],
    queryFn: () => items.get(Number(id)),
    enabled: !!id,
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const { data: vendorsData } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendors.list(),
  })

  const deleteMutation = useMutation({
    mutationFn: () => items.delete(Number(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Item deleted successfully')
      navigate('/items')
    },
    onError: () => {
      toast.error('Failed to delete item')
    },
  })

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Item>) => items.update(Number(id), data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsEditModalOpen(false)
      toast.success('Item updated successfully')
    },
    onError: () => {
      toast.error('Failed to update item')
    },
  })

  // Parts mutations
  const createPartMutation = useMutation({
    mutationFn: (data: Partial<Part> & { item_id: number }) => parts.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setIsPartModalOpen(false)
      resetPartForm()
      toast.success('Part added successfully')
    },
    onError: () => toast.error('Failed to add part'),
  })

  const updatePartMutation = useMutation({
    mutationFn: ({ partId, data }: { partId: number; data: Partial<Part> }) => parts.update(partId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setIsPartModalOpen(false)
      setEditingPart(null)
      resetPartForm()
      toast.success('Part updated successfully')
    },
    onError: () => toast.error('Failed to update part'),
  })

  const deletePartMutation = useMutation({
    mutationFn: (partId: number) => parts.delete(partId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success('Part deleted successfully')
    },
    onError: () => toast.error('Failed to delete part'),
  })

  // Maintenance log mutations
  const createLogMutation = useMutation({
    mutationFn: (data: Partial<MaintenanceLog> & { item_id: number }) => maintenanceLogs.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setIsLogModalOpen(false)
      resetLogForm()
      toast.success('Maintenance log added successfully')
    },
    onError: () => toast.error('Failed to add maintenance log'),
  })

  const updateLogMutation = useMutation({
    mutationFn: ({ logId, data }: { logId: number; data: Partial<MaintenanceLog> }) => maintenanceLogs.update(logId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setIsLogModalOpen(false)
      setEditingLog(null)
      resetLogForm()
      toast.success('Maintenance log updated successfully')
    },
    onError: () => toast.error('Failed to update maintenance log'),
  })

  const deleteLogMutation = useMutation({
    mutationFn: (logId: number) => maintenanceLogs.delete(logId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success('Maintenance log deleted successfully')
    },
    onError: () => toast.error('Failed to delete maintenance log'),
  })

  // Document delete mutation
  const deleteDocMutation = useMutation({
    mutationFn: (docId: number) => files.delete(docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setDocToDelete(null)
      toast.success('Document deleted successfully')
    },
    onError: () => toast.error('Failed to delete document'),
  })

  // Document download from URL mutation
  const downloadDocFromUrlMutation = useMutation({
    mutationFn: ({ url, displayName }: { url: string; displayName?: string }) => 
      files.uploadFromUrl(url, 'item', Number(id), false, displayName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setDocUrlInput('')
      setDocUrlDisplayName('')
      setShowDocUrlInput(false)
      toast.success('Document downloaded successfully')
    },
    onError: () => toast.error('Failed to download document from URL'),
  })

  // Document update display name mutation
  const updateDocNameMutation = useMutation({
    mutationFn: ({ docId, displayName }: { docId: number; displayName: string | null }) =>
      files.update(docId, { display_name: displayName || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      setEditingDocName(null)
      setEditingDocNameValue('')
      toast.success('Document name updated')
    },
    onError: () => toast.error('Failed to update document name'),
  })

  // Image management mutations
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: number) => files.delete(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success('Image deleted')
    },
    onError: () => toast.error('Failed to delete image'),
  })

  const setFeaturedImageMutation = useMutation({
    mutationFn: (imageId: number) => files.setFeatured(imageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success('Featured image updated')
    },
    onError: () => toast.error('Failed to set featured image'),
  })

  // Manual search links for when direct download fails (with labels)
  const [manualSearchLinks, setManualSearchLinks] = useState<Array<{ url: string; label: string }>>([])

  // Smart Fill - Step-by-step manual search
  const searchAndDownloadManual = async (make: string, model: string) => {
    const itemId = Number(id)
    const allUrls: string[] = []
    let labeledSearchLinks: Array<{ url: string; label: string }> = []

    setSmartFillStatus(prev => ({ ...prev, manual: 'searching' }))
    setManualSearchLinks([])
    setManualSearchProgress({
      repositories: { status: 'pending', count: 0 },
      ai: { status: 'pending', count: 0 },
      web: { status: 'pending', count: 0 },
      downloading: { status: 'pending', current: '' },
    })

    // Helper to create default search links if needed
    const getDefaultSearchLinks = () => [
      { url: `https://www.google.com/search?q=${encodeURIComponent(`${make} ${model} manual PDF filetype:pdf`)}`, label: `Google: ${make} ${model} manual PDF` },
      { url: `https://www.google.com/search?q=site:manualslib.com+${encodeURIComponent(`${make} ${model}`)}`, label: `ManualsLib: ${make} ${model}` },
    ]

    try {
      setManualSearchStep('Searching manual repositories...')
      setManualSearchProgress(prev => ({ ...prev, repositories: { status: 'searching', count: 0 } }))
      const repoResult = await items.searchManualUrls(itemId, make, model, 'repositories')
      allUrls.push(...repoResult.urls)
      setManualSearchProgress(prev => ({ ...prev, repositories: { status: 'done', count: repoResult.count } }))

      setManualSearchStep('Asking AI for suggestions...')
      setManualSearchProgress(prev => ({ ...prev, ai: { status: 'searching', count: 0 } }))
      const aiResult = await items.searchManualUrls(itemId, make, model, 'ai')
      allUrls.push(...aiResult.urls)
      setManualSearchProgress(prev => ({ ...prev, ai: { status: 'done', count: aiResult.count } }))

      setManualSearchStep('Searching the web...')
      setManualSearchProgress(prev => ({ ...prev, web: { status: 'searching', count: 0 } }))
      const webResult = await items.searchManualUrls(itemId, make, model, 'web')
      // Add direct URLs
      allUrls.push(...webResult.urls)
      // Capture labeled search links from the backend
      if (webResult.search_links && webResult.search_links.length > 0) {
        labeledSearchLinks = webResult.search_links
      }
      setManualSearchProgress(prev => ({ ...prev, web: { status: 'done', count: webResult.count } }))

      const uniqueUrls = [...new Set(allUrls)]

      // If no direct URLs found but we have search links, show them
      if (uniqueUrls.length === 0) {
        setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
        setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'done', current: 'No sources' } }))
        setManualSearchStep('No direct sources found - use search links below')
        setManualSearchLinks(labeledSearchLinks.length > 0 ? labeledSearchLinks : getDefaultSearchLinks())
        toast.info('No direct download sources found. Use the search links to find the manual.')
        return
      }

      setSmartFillStatus(prev => ({ ...prev, manual: 'downloading' }))
      setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'trying', current: '' } }))

      for (const url of uniqueUrls) {
        const domain = new URL(url).hostname.replace('www.', '')
        setManualSearchStep(`Trying ${domain}...`)
        setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'trying', current: domain } }))

        try {
          const downloadResult = await items.downloadManualFromUrl(itemId, url, make, model)
          if (downloadResult.success) {
            setSmartFillStatus(prev => ({ ...prev, manual: 'success' }))
            setManualSearchStep('Manual downloaded!')
            setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'done', current: domain } }))
            queryClient.invalidateQueries({ queryKey: ['items', id] })
            toast.success(downloadResult.message)
            return
          }
        } catch {
          // Continue to next URL
        }
      }

      // If all direct downloads failed, show search links as fallback
      setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
      setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'done', current: 'Failed' } }))
      setManualSearchStep('Auto-download failed - try these search links')
      setManualSearchLinks(labeledSearchLinks.length > 0 ? labeledSearchLinks : getDefaultSearchLinks())
      toast.info('Could not download automatically. Use the search links to find the manual.')

    } catch (error) {
      setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
      setManualSearchProgress(prev => ({ ...prev, downloading: { status: 'done', current: 'Error' } }))
      const isTimeout = error instanceof Error && (
        error.message?.includes('timeout') ||
        (error as { code?: string }).code === 'ECONNABORTED'
      )
      setManualSearchStep(isTimeout ? 'Request timed out' : 'Search failed')
      setManualSearchLinks(getDefaultSearchLinks())
      toast.error(isTimeout ? 'Request timed out. Try the search links.' : 'Search failed. Try the search links.')
    }
  }

  const getAISuggestionsWithProgress = async (make: string, model: string, category?: string) => {
    const itemId = Number(id)

    setSmartFillStatus(prev => ({ ...prev, suggestions: 'loading' }))
    setAISuggestions(null)
    setAISuggestionsAgentMeta(null)
    setAISuggestionsProgress({
      config: { status: 'done' },
      query: { status: 'pending' },
    })

    try {
      setAISuggestionsStep('Querying AI agents...')
      setAISuggestionsProgress(prev => ({ ...prev, query: { status: 'querying' } }))

      const result = await items.queryAISuggestions(itemId, make, model, category)

      // Store agent metadata
      if (result.agents_used) {
        setAISuggestionsAgentMeta({
          agents_used: result.agents_used,
          agents_succeeded: result.agents_succeeded || 0,
          agent_details: result.agent_details || {},
          synthesis_agent: result.synthesis_agent || null,
          total_duration_ms: result.total_duration_ms || 0,
        })

        // Update step with agent info
        const agentNames = result.agents_used.map(a => AGENT_DISPLAY_NAMES[a] || a).join(', ')
        setAISuggestionsStep(`Querying ${agentNames}...`)
      }

      if (result.success && result.suggestions) {
        setAISuggestionsProgress(prev => ({ ...prev, query: { status: 'done' } }))
        setSmartFillStatus(prev => ({ ...prev, suggestions: 'success' }))
        setAISuggestionsStep('Complete!')
        setAISuggestions(result.suggestions)
      } else {
        setAISuggestionsProgress(prev => ({
          ...prev,
          query: { status: 'error', error: result.error }
        }))
        setSmartFillStatus(prev => ({ ...prev, suggestions: 'error' }))
        setAISuggestionsStep(result.error || 'Failed to get suggestions')
        toast.error(result.error || 'Failed to get AI suggestions')
      }
    } catch (error) {
      setSmartFillStatus(prev => ({ ...prev, suggestions: 'error' }))
      const isTimeout = error instanceof Error && (
        error.message?.includes('timeout') ||
        (error as { code?: string }).code === 'ECONNABORTED'
      )
      const errorMsg = isTimeout ? 'Request timed out' : 'Request failed'
      setAISuggestionsStep(errorMsg)
      setAISuggestionsProgress(prev => ({
        ...prev,
        query: { status: 'error', error: errorMsg }
      }))
      toast.error(isTimeout ? 'AI request timed out. Try again.' : 'Failed to get AI suggestions')
    }
  }

  // Load part image lazily
  const loadPartImage = async (index: number, searchTerm: string) => {
    if (loadingPartImages.has(index) || partImages[index] !== undefined) return

    const itemId = Number(id)
    setLoadingPartImages(prev => new Set(prev).add(index))

    try {
      const result = await items.searchPartImage(itemId, searchTerm)
      setPartImages(prev => ({ ...prev, [index]: result.image_url }))
    } catch {
      setPartImages(prev => ({ ...prev, [index]: null }))
    } finally {
      setLoadingPartImages(prev => {
        const newSet = new Set(prev)
        newSet.delete(index)
        return newSet
      })
    }
  }

  const getPartsSuggestions = async (make: string, model: string, category?: string) => {
    const itemId = Number(id)

    setSmartFillStatus(prev => ({ ...prev, parts: 'loading' }))
    setSuggestedParts([])
    setSelectedParts(new Set())
    setPartsAgentMeta(null)
    setPartImages({})
    setPartsStep('Querying AI agents for parts...')

    try {
      const result = await items.suggestParts(itemId, make, model, category)

      // Store agent metadata
      if (result.agents_used) {
        setPartsAgentMeta({
          agents_used: result.agents_used,
          agents_succeeded: result.agents_succeeded || 0,
          agent_details: result.agent_details || {},
          synthesis_agent: result.synthesis_agent || null,
          total_duration_ms: result.total_duration_ms || 0,
          manuals_used: result.manuals_used || 0,
        })

        // Update step with agent info
        const agentNames = result.agents_used.map(a => AGENT_DISPLAY_NAMES[a] || a).join(', ')
        setPartsStep(`Queried ${agentNames}...`)
      }

      if (result.success && result.parts) {
        setSmartFillStatus(prev => ({ ...prev, parts: 'success' }))
        setPartsStep(`Found ${result.parts.length} parts`)
        setSuggestedParts(result.parts)
        setSelectedParts(new Set(result.parts.map((_, i) => i)))

        // Start loading images for each part (lazy, in background)
        result.parts.forEach((part, index) => {
          if (part.search_term) {
            loadPartImage(index, part.search_term)
          }
        })
      } else {
        setSmartFillStatus(prev => ({ ...prev, parts: 'error' }))
        setPartsStep(result.error || 'Failed to get parts suggestions')
        toast.error(result.error || 'Failed to get parts suggestions')
      }
    } catch (error) {
      setSmartFillStatus(prev => ({ ...prev, parts: 'error' }))
      const isTimeout = error instanceof Error && (
        error.message?.includes('timeout') ||
        (error as { code?: string }).code === 'ECONNABORTED'
      )
      setPartsStep(isTimeout ? 'Request timed out' : 'Request failed')
      toast.error(isTimeout ? 'Request timed out. Try again.' : 'Failed to get parts suggestions')
    }
  }

  const addSelectedParts = async () => {
    if (selectedParts.size === 0) {
      toast.error('No parts selected')
      return
    }

    setIsAddingParts(true)

    try {
      const partsToAdd = Array.from(selectedParts).map(index => {
        const part = suggestedParts[index]
        const primaryUrl = part.purchase_urls.repairclinic || part.purchase_urls.amazon || part.purchase_urls.home_depot
        return {
          name: part.name,
          type: part.type,
          part_number: part.part_number,
          purchase_url: primaryUrl,
          purchase_urls: part.purchase_urls,
          price: part.estimated_price,
          notes: part.replacement_interval ? `Replacement interval: ${part.replacement_interval}` : null,
        }
      })

      await parts.createBatch(Number(id), partsToAdd)
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success(`Added ${partsToAdd.length} parts to item`)
    } catch {
      toast.error('Failed to add parts')
    } finally {
      setIsAddingParts(false)
    }
  }

  const resetPartForm = () => {
    setPartFormData({
      name: '',
      part_number: '',
      type: 'replacement',
      purchase_url: '',
      price: '',
      notes: '',
    })
  }

  const resetLogForm = () => {
    setLogFormData({
      type: 'service',
      date: new Date().toISOString().split('T')[0],
      vendor_id: '',
      cost: '',
      notes: '',
      part_ids: [],
    })
  }

  const openPartModal = (type: 'replacement' | 'consumable', part?: Part) => {
    if (part) {
      setEditingPart(part)
      setPartFormData({
        name: part.name,
        part_number: part.part_number || '',
        type: part.type,
        purchase_url: part.purchase_url || '',
        price: part.price?.toString() || '',
        notes: part.notes || '',
      })
    } else {
      setEditingPart(null)
      resetPartForm()
      setPartFormData(prev => ({ ...prev, type }))
    }
    setIsPartModalOpen(true)
  }

  const openLogModal = (log?: MaintenanceLog) => {
    if (log) {
      setEditingLog(log)
      setLogFormData({
        type: log.type,
        date: log.date,
        vendor_id: log.vendor_id?.toString() || '',
        cost: log.cost?.toString() || '',
        notes: log.notes || '',
        part_ids: log.parts?.map((p) => p.id) || [],
      })
    } else {
      setEditingLog(null)
      resetLogForm()
    }
    setIsLogModalOpen(true)
  }

  const handlePartSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      name: partFormData.name,
      part_number: partFormData.part_number || null,
      type: partFormData.type,
      purchase_url: partFormData.purchase_url || null,
      price: partFormData.price ? parseFloat(partFormData.price) : null,
      notes: partFormData.notes || null,
    }

    if (editingPart) {
      updatePartMutation.mutate({ partId: editingPart.id, data })
    } else {
      createPartMutation.mutate({ ...data, item_id: Number(id) })
    }
  }

  const handleLogSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const data = {
      type: logFormData.type,
      date: logFormData.date,
      vendor_id: logFormData.vendor_id ? parseInt(logFormData.vendor_id) : null,
      cost: logFormData.cost ? parseFloat(logFormData.cost) : null,
      notes: logFormData.notes || null,
      part_ids: logFormData.part_ids,
    }

    if (editingLog) {
      updateLogMutation.mutate({ logId: editingLog.id, data })
    } else {
      createLogMutation.mutate({ ...data, item_id: Number(id) })
    }
  }

  const openEditModal = (item: Item) => {
    setEditData({
      name: item.name,
      category_id: item.category_id,
      vendor_id: item.vendor_id,
      location_id: item.location_id,
      make: item.make,
      model: item.model,
      serial_number: item.serial_number,
      install_date: item.install_date,
      notes: item.notes,
    })
    setIsEditModalOpen(true)
  }

  const allCategories = categoriesData?.categories || []
  const allLocations = locationsData?.locations || []
  const allVendors = vendorsData?.vendors || []

  const item = data?.item

  // Get calculated stats - must be called before any early returns to follow React hooks rules
  const stats = useItemStats(item)

  if (isLoading) {
    return <DetailSkeleton />
  }

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center mb-4 shadow-lg">
          <Icon icon={Package} size="lg" className="text-gray-400 dark:text-gray-500" />
        </div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-1">Item not found</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The item you're looking for doesn't exist.</p>
        <Button variant="secondary" onClick={() => navigate('/items')}>
          <Icon icon={ArrowLeft} size="xs" /> Back to Items
        </Button>
      </div>
    )
  }

  const replacementParts = item.parts?.filter((p) => p.type === 'replacement') || []
  const consumableParts = item.parts?.filter((p) => p.type === 'consumable') || []
  const allImages = item.images || []
  const allDocs = item.files || []

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={() => navigate('/items')}
          className="self-start p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <Icon icon={ArrowLeft} size="sm" className="text-gray-500 dark:text-gray-400" />
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-50 truncate">
              {item.name}
            </h1>
            {item.category && (
              <Badge
                size="sm"
                style={{
                  backgroundColor: item.category.color || '#6366f1',
                  color: '#fff',
                }}
              >
                {item.category.name}
              </Badge>
            )}
          </div>
          {(item.make || item.model) && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {[item.make, item.model].filter(Boolean).join(' ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {item.make && item.model && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSmartFillStatus({ manual: 'idle', suggestions: 'idle', parts: 'idle' })
                setAISuggestions(null)
                setManualSearchStep('')
                setManualSearchProgress({
                  repositories: { status: 'pending', count: 0 },
                  ai: { status: 'pending', count: 0 },
                  web: { status: 'pending', count: 0 },
                  downloading: { status: 'pending', current: '' },
                })
                setAISuggestionsStep('')
                setAISuggestionsProgress({
                  config: { status: 'pending' },
                  query: { status: 'pending' },
                })
                setSuggestedParts([])
                setSelectedParts(new Set())
                setPartsStep('')
                setIsSmartFillOpen(true)
              }}
              className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white border-0 shadow-md"
            >
              <Icon icon={Sparkles} size="xs" /> Smart Fill
            </Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => openEditModal(item)}>
            <Icon icon={Pencil} size="xs" /> Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this item?')) {
                deleteMutation.mutate()
              }
            }}
          >
            <Icon icon={Trash2} size="xs" />
          </Button>
        </div>
      </div>

      {/* Smart Stats Grid - Shows calculated status based on install date */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Location */}
        {(item.location_obj || item.location) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={MapPin} size="xs" className="text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Location</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-50 truncate">
              {item.location_obj?.name || item.location}
            </p>
          </div>
        )}

        {/* Install Date & Age */}
        {item.install_date && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-1">
              <Icon icon={Calendar} size="xs" className="text-gray-400" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Installed</span>
            </div>
            <p className="font-medium text-gray-900 dark:text-gray-50">
              {formatDate(item.install_date)}
            </p>
            {stats?.ageYears !== null && stats?.ageYears !== undefined && (
              <p className="text-xs text-gray-500 mt-0.5">
                {stats.ageYears >= 1
                  ? `${Math.floor(stats.ageYears)}y ${Math.round((stats.ageYears % 1) * 12)}mo old`
                  : `${stats.ageMonths ?? 0}mo old`}
              </p>
            )}
          </div>
        )}

        {/* Warranty Status - Color coded (only show calculated status if we have install date) */}
        {item.warranty_years && (
          stats?.warrantyStatus ? (
            <div className={`rounded-xl p-4 border ${
              stats.warrantyStatus.inWarranty
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  icon={stats.warrantyStatus.inWarranty ? CheckCircle : AlertTriangle}
                  size="xs"
                  className={stats.warrantyStatus.inWarranty ? 'text-green-500' : 'text-red-500'}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Warranty ({item.warranty_years}y)</span>
              </div>
              <p className={`font-medium ${
                stats.warrantyStatus.inWarranty
                  ? 'text-green-700 dark:text-green-400'
                  : 'text-red-700 dark:text-red-400'
              }`}>
                {stats.warrantyStatus.inWarranty ? 'Active' : 'Expired'}
              </p>
              {stats.warrantyStatus.remaining && (
                <p className={`text-xs mt-0.5 ${
                  stats.warrantyStatus.inWarranty
                    ? 'text-green-600 dark:text-green-500'
                    : 'text-red-600 dark:text-red-500'
                }`}>
                  {stats.warrantyStatus.remaining}
                </p>
              )}
              {stats.warrantyStatus.expireDate && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {stats.warrantyStatus.inWarranty ? 'Expires' : 'Expired'}: {formatDate(stats.warrantyStatus.expireDate.toISOString().split('T')[0])}
                </p>
              )}
            </div>
          ) : (
            // No install date - just show the warranty period without status
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon={CheckCircle} size="xs" className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Warranty</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                {item.warranty_years} years
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Add install date to track status
              </p>
            </div>
          )
        )}

        {/* Lifespan Status - With progress indicator (only show calculated status if we have install date) */}
        {item.typical_lifespan_years && (
          stats?.lifespanStatus ? (
            <div className={`rounded-xl p-4 border ${
              stats.lifespanStatus.status === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : stats.lifespanStatus.status === 'warning'
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon icon={Clock} size="xs" className={
                  stats.lifespanStatus.status === 'critical'
                    ? 'text-red-500'
                    : stats.lifespanStatus.status === 'warning'
                    ? 'text-amber-500'
                    : 'text-gray-400'
                } />
                <span className="text-xs text-gray-500 dark:text-gray-400">Lifespan ({item.typical_lifespan_years}y)</span>
              </div>
              <p className={`font-medium ${
                stats.lifespanStatus.status === 'critical'
                  ? 'text-red-700 dark:text-red-400'
                  : stats.lifespanStatus.status === 'warning'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-gray-900 dark:text-gray-50'
              }`}>
                ~{stats.lifespanStatus.yearsRemaining}y left
              </p>
              <div className="mt-2">
                <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      stats.lifespanStatus.status === 'critical'
                        ? 'bg-red-500'
                        : stats.lifespanStatus.status === 'warning'
                        ? 'bg-amber-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${stats.lifespanStatus.percentUsed}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-1">{stats.lifespanStatus.percentUsed}% used</p>
              </div>
              {stats.lifespanStatus.expectedEndDate && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Expected replacement: ~{stats.lifespanStatus.expectedEndDate.getFullYear()}
                </p>
              )}
            </div>
          ) : (
            // No install date - just show the lifespan without calculated status
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon={Clock} size="xs" className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Lifespan</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                ~{item.typical_lifespan_years} years
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Add install date to track status
              </p>
            </div>
          )
        )}

        {/* Maintenance Status - Color coded (only show calculated status if we have install date) */}
        {item.maintenance_interval_months && (
          stats?.maintenanceStatus ? (
            <div className={`rounded-xl p-4 border ${
              stats.maintenanceStatus.overdue
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon
                  icon={stats.maintenanceStatus.overdue ? AlertTriangle : Wrench}
                  size="xs"
                  className={stats.maintenanceStatus.overdue ? 'text-red-500' : 'text-gray-400'}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">Maintenance (every {item.maintenance_interval_months}mo)</span>
              </div>
              <p className={`font-medium ${
                stats.maintenanceStatus.overdue
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-50'
              }`}>
                {stats.maintenanceStatus.overdue ? 'Overdue' : 'On Track'}
              </p>
              <p className={`text-xs mt-0.5 ${
                stats.maintenanceStatus.overdue
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-gray-500'
              }`}>
                {stats.maintenanceStatus.overdue
                  ? `${stats.maintenanceStatus.dueIn} overdue`
                  : `Due in ${stats.maintenanceStatus.dueIn}`}
              </p>
              {stats.maintenanceStatus.nextDate && (
                <p className="text-[10px] text-gray-500 mt-1">
                  {stats.maintenanceStatus.overdue ? 'Was due' : 'Next'}: {formatDate(stats.maintenanceStatus.nextDate.toISOString().split('T')[0])}
                </p>
              )}
            </div>
          ) : (
            // No install date - just show the maintenance interval without calculated status
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-1">
                <Icon icon={Wrench} size="xs" className="text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Maintenance</span>
              </div>
              <p className="font-medium text-gray-900 dark:text-gray-50">
                Every {item.maintenance_interval_months} months
              </p>
              <p className="text-[10px] text-gray-500 mt-1">
                Add install date to track status
              </p>
            </div>
          )
        )}
      </div>

      {/* AI Chat Section */}
      <ItemChatPanel item={item} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details, Parts, Maintenance */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <Card>
            <CardHeader className="border-b border-gray-200 dark:border-gray-800">
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                {item.serial_number && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Serial Number</p>
                    <p className="font-mono text-sm text-gray-900 dark:text-gray-50">{item.serial_number}</p>
                  </div>
                )}
                {item.vendor && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Vendor</p>
                    <p className="text-sm text-gray-900 dark:text-gray-50">{item.vendor.name}</p>
                  </div>
                )}
                {item.warranty_years && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Warranty Period</p>
                    <p className="text-sm text-gray-900 dark:text-gray-50">{item.warranty_years} years</p>
                  </div>
                )}
                {item.typical_lifespan_years && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Expected Lifespan</p>
                    <p className="text-sm text-gray-900 dark:text-gray-50">~{item.typical_lifespan_years} years</p>
                  </div>
                )}
                {item.maintenance_interval_months && (
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Maintenance Interval</p>
                    <p className="text-sm text-gray-900 dark:text-gray-50">Every {item.maintenance_interval_months} months</p>
                  </div>
                )}
              </div>
              {item.notes && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Notes</p>
                  <p className="text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{item.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <CardTitle>Maintenance History</CardTitle>
              <Button variant="secondary" size="sm" onClick={() => openLogModal()}>
                <Icon icon={Plus} size="xs" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {item.maintenanceLogs && item.maintenanceLogs.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {item.maintenanceLogs.map((log) => (
                    <li key={log.id} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.type === 'repair'
                                ? 'error'
                                : log.type === 'replacement'
                                ? 'warning'
                                : 'gray'
                            }
                            size="sm"
                          >
                            {log.type}
                          </Badge>
                          <span className="text-sm text-gray-500">{formatDate(log.date)}</span>
                        </div>
                        {log.notes && <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">{log.notes}</p>}
                        {log.vendor && (
                          <p className="mt-1 text-sm text-gray-500">By: {log.vendor.name}</p>
                        )}
                        {log.parts && log.parts.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {log.parts.map((part) => (
                              <span
                                key={part.id}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              >
                                {part.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {log.cost && (
                          <span className="font-medium text-gray-900 dark:text-gray-50">{formatCurrency(log.cost)}</span>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openLogModal(log)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
                          >
                            <Icon icon={Pencil} size="xs" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this log?')) {
                                deleteLogMutation.mutate(log.id)
                              }
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                          >
                            <Icon icon={Trash2} size="xs" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No maintenance records yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Consumable Parts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <CardTitle className="flex items-center gap-2">
                <Icon icon={Package} size="sm" className="text-gray-400" /> Consumables
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => openPartModal('consumable')}>
                <Icon icon={Plus} size="xs" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {consumableParts.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {consumableParts.map((part) => (
                    <li key={part.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Part Image */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                          {part.featured_image ? (
                            <img src={part.featured_image.url} alt={part.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon icon={Package} size="xs" className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-50">{part.name}</p>
                          {part.part_number && (
                            <p className="text-xs text-gray-500 mt-0.5">#{part.part_number}</p>
                          )}
                          {(part.purchase_urls || part.purchase_url) && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {part.purchase_urls?.repairclinic && (
                                <a href={part.purchase_urls.repairclinic} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-600 hover:underline">RepairClinic</a>
                              )}
                              {part.purchase_urls?.amazon && (
                                <a href={part.purchase_urls.amazon} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 hover:underline">Amazon</a>
                              )}
                              {part.purchase_urls?.home_depot && (
                                <a href={part.purchase_urls.home_depot} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-700 hover:underline">Home Depot</a>
                              )}
                              {!part.purchase_urls && part.purchase_url && (
                                <a href={part.purchase_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary-600 hover:underline">Buy</a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {part.price && (
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-1">{formatCurrency(part.price)}</span>
                          )}
                          <button onClick={() => openPartModal('consumable', part)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <Icon icon={Pencil} size="xs" />
                          </button>
                          <button onClick={() => { if (confirm('Delete?')) deletePartMutation.mutate(part.id) }} className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Icon icon={Trash2} size="xs" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No consumable parts</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Replacement Parts - Second */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
              <CardTitle className="flex items-center gap-2">
                <Icon icon={Wrench} size="sm" className="text-gray-400" /> Replacement Parts
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => openPartModal('replacement')}>
                <Icon icon={Plus} size="xs" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {replacementParts.length > 0 ? (
                <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                  {replacementParts.map((part) => (
                    <li key={part.id} className="px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <div className="flex items-start gap-3">
                        {/* Part Image */}
                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 overflow-hidden">
                          {part.featured_image ? (
                            <img src={part.featured_image.url} alt={part.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icon icon={Package} size="xs" className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm text-gray-900 dark:text-gray-50">{part.name}</p>
                          {part.part_number && (
                            <p className="text-xs text-gray-500 mt-0.5">#{part.part_number}</p>
                          )}
                          {(part.purchase_urls || part.purchase_url) && (
                            <div className="flex items-center gap-2 mt-1.5">
                              {part.purchase_urls?.repairclinic && (
                                <a href={part.purchase_urls.repairclinic} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-600 hover:underline">RepairClinic</a>
                              )}
                              {part.purchase_urls?.amazon && (
                                <a href={part.purchase_urls.amazon} target="_blank" rel="noopener noreferrer" className="text-[10px] text-amber-600 hover:underline">Amazon</a>
                              )}
                              {part.purchase_urls?.home_depot && (
                                <a href={part.purchase_urls.home_depot} target="_blank" rel="noopener noreferrer" className="text-[10px] text-orange-700 hover:underline">Home Depot</a>
                              )}
                              {!part.purchase_urls && part.purchase_url && (
                                <a href={part.purchase_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary-600 hover:underline">Buy</a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {part.price && (
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mr-1">{formatCurrency(part.price)}</span>
                          )}
                          <button onClick={() => openPartModal('replacement', part)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                            <Icon icon={Pencil} size="xs" />
                          </button>
                          <button onClick={() => { if (confirm('Delete?')) deletePartMutation.mutate(part.id) }} className="p-1 text-gray-400 hover:text-red-600 rounded">
                            <Icon icon={Trash2} size="xs" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500 dark:text-gray-400">No replacement parts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Photo, Gallery, Documents, Reminders */}
        <div className="space-y-6">
          {/* Featured Photo */}
          <Card className="overflow-hidden">
            {item.featured_image ? (
              <button
                onClick={() => {
                  setGalleryIndex(0)
                  setIsGalleryOpen(true)
                }}
                className="relative w-full cursor-pointer group"
              >
                <img
                  src={item.featured_image.url}
                  alt={item.name}
                  className="w-full aspect-square object-cover group-hover:opacity-95 transition-opacity"
                />
                {allImages.length > 1 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                    +{allImages.length - 1} more
                  </div>
                )}
              </button>
            ) : (
              <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center">
                <Icon icon={Package} size="xl" className="text-gray-300 dark:text-gray-600" />
              </div>
            )}
          </Card>

          {/* Image Gallery Thumbnails */}
          {allImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Photos ({allImages.length})</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                >
                  <Icon icon={Plus} size="xs" />
                </Button>
              </div>
              {showImageUpload && (
                <div className="mb-3">
                  <ImageUpload
                    fileableType="item"
                    fileableId={item.id}
                    existingImages={[]}
                    featuredImage={item.featured_image}
                    invalidateQueries={[['items', id!]]}
                    label="Drop images here"
                    showGallery={false}
                  />
                </div>
              )}
              <div className="grid grid-cols-4 gap-2">
                {allImages.slice(0, 8).map((image, index) => (
                  <div
                    key={image.id}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 group ${
                      image.is_featured ? 'border-primary-500' : 'border-transparent'
                    }`}
                  >
                    <button
                      onClick={() => {
                        setGalleryIndex(index)
                        setIsGalleryOpen(true)
                      }}
                      className="w-full h-full"
                    >
                      <img
                        src={image.url}
                        alt={image.original_name}
                        className="w-full h-full object-cover"
                      />
                    </button>
                    {/* Hover controls */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors pointer-events-none">
                      <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                        {!image.is_featured && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setFeaturedImageMutation.mutate(image.id)
                            }}
                            disabled={setFeaturedImageMutation.isPending}
                            className="p-1.5 bg-white dark:bg-gray-800 rounded-md text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            title="Set as featured"
                          >
                            <Star className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (confirm('Delete this image?')) {
                              deleteImageMutation.mutate(image.id)
                            }
                          }}
                          disabled={deleteImageMutation.isPending}
                          className="p-1.5 bg-white dark:bg-gray-800 rounded-md text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30"
                          title="Delete image"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {image.is_featured && (
                      <div className="absolute top-1 left-1 bg-primary-500 text-white text-[10px] px-1 py-0.5 rounded">
                        ★
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {allImages.length > 8 && (
                <button
                  onClick={() => {
                    setGalleryIndex(0)
                    setIsGalleryOpen(true)
                  }}
                  className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  View all {allImages.length} photos
                </button>
              )}
            </div>
          )}

          {/* No images - show upload prompt */}
          {allImages.length === 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Photos</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowImageUpload(!showImageUpload)}
                >
                  <Icon icon={Plus} size="xs" />
                </Button>
              </div>
              {showImageUpload && (
                <ImageUpload
                  fileableType="item"
                  fileableId={item.id}
                  existingImages={[]}
                  featuredImage={item.featured_image}
                  invalidateQueries={[['items', id!]]}
                  label="Drop images here"
                  showGallery={false}
                />
              )}
            </div>
          )}

          {/* Documents */}
          <Card>
            <CardHeader className="border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon icon={FileText} size="sm" className="text-gray-400" />
                  Documents
                  {allDocs.length > 0 && (
                    <span className="text-xs font-normal text-gray-500">({allDocs.length})</span>
                  )}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowDocUpload(!showDocUpload)
                    if (!showDocUpload) setShowDocUrlInput(false)
                  }}
                >
                  <Icon icon={showDocUpload ? ChevronUp : Plus} size="xs" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              {showDocUpload && (
                <div className="mb-4 pb-4 border-b border-gray-200 dark:border-gray-800 space-y-4">
                  {/* Tab switcher */}
                  <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <button
                      onClick={() => setShowDocUrlInput(false)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        !showDocUrlInput
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon icon={Plus} size="xs" /> Upload File
                    </button>
                    <button
                      onClick={() => setShowDocUrlInput(true)}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        showDocUrlInput
                          ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <Icon icon={Link} size="xs" /> From URL
                    </button>
                  </div>

                  {/* Content based on selected tab */}
                  {showDocUrlInput ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Document URL
                        </label>
                        <Input
                          type="url"
                          placeholder="https://example.com/document.pdf"
                          value={docUrlInput}
                          onChange={(e) => setDocUrlInput(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Display Name <span className="text-gray-400">(optional)</span>
                        </label>
                        <Input
                          type="text"
                          placeholder="e.g., Owner's Manual, Installation Guide"
                          value={docUrlDisplayName}
                          onChange={(e) => setDocUrlDisplayName(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => {
                          if (docUrlInput.trim()) {
                            downloadDocFromUrlMutation.mutate({ 
                              url: docUrlInput.trim(), 
                              displayName: docUrlDisplayName.trim() || undefined 
                            })
                          }
                        }}
                        disabled={!docUrlInput.trim() || downloadDocFromUrlMutation.isPending}
                        className="w-full"
                      >
                        {downloadDocFromUrlMutation.isPending ? (
                          <>
                            <Icon icon={Loader2} size="xs" className="animate-spin" /> Downloading...
                          </>
                        ) : (
                          <>
                            <Icon icon={Download} size="xs" /> Download Document
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <DocumentUpload
                      fileableType="item"
                      fileableId={item.id}
                      existingDocuments={[]}
                      invalidateQueries={[['items', id!]]}
                      label="Drop documents here"
                    />
                  )}
                </div>
              )}
              {allDocs.length > 0 ? (
                <ul className="space-y-2">
                  {allDocs.map((doc) => (
                    <li key={doc.id} className="group flex items-center gap-2 p-2 -mx-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      {editingDocName?.id === doc.id ? (
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                            <Icon icon={FileText} size="xs" className="text-gray-500" />
                          </div>
                          <Input
                            type="text"
                            value={editingDocNameValue}
                            onChange={(e) => setEditingDocNameValue(e.target.value)}
                            placeholder={doc.original_name}
                            className="flex-1 h-7 text-sm"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                updateDocNameMutation.mutate({ docId: doc.id, displayName: editingDocNameValue.trim() || null })
                              } else if (e.key === 'Escape') {
                                setEditingDocName(null)
                                setEditingDocNameValue('')
                              }
                            }}
                          />
                          <button
                            onClick={() => updateDocNameMutation.mutate({ docId: doc.id, displayName: editingDocNameValue.trim() || null })}
                            className="p-1.5 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
                            title="Save"
                          >
                            <Icon icon={Check} size="xs" />
                          </button>
                          <button
                            onClick={() => { setEditingDocName(null); setEditingDocNameValue('') }}
                            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                            title="Cancel"
                          >
                            <Icon icon={X} size="xs" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setPreviewDoc(doc)}
                            className="flex items-center gap-2 flex-1 min-w-0 text-left"
                          >
                            <div className="w-7 h-7 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                              <Icon icon={FileText} size="xs" className="text-gray-500" />
                            </div>
                            <div className="flex flex-col min-w-0">
                              <span className="text-sm text-gray-900 dark:text-gray-50 truncate">
                                {doc.display_name || doc.original_name}
                              </span>
                              {doc.display_name && (
                                <span className="text-xs text-gray-500 truncate">{doc.original_name}</span>
                              )}
                            </div>
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                            <button
                              onClick={() => { setEditingDocName(doc); setEditingDocNameValue(doc.display_name || '') }}
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              title="Rename"
                            >
                              <Icon icon={Pencil} size="xs" />
                            </button>
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                              title="Open in new tab"
                            >
                              <Icon icon={ExternalLink} size="xs" />
                            </a>
                            <button
                              onClick={() => setDocToDelete(doc)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              title="Delete document"
                            >
                              <Icon icon={Trash2} size="xs" />
                            </button>
                          </div>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : !showDocUpload ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No documents</p>
              ) : null}
            </CardContent>
          </Card>

          {/* Reminders */}
          <Card>
            <CardHeader className="border-b border-gray-200 dark:border-gray-800">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon icon={Bell} size="sm" className="text-gray-400" /> Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {item.reminders && item.reminders.length > 0 ? (
                <div className="space-y-2">
                  {item.reminders.map((reminder) => (
                    <div key={reminder.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-50">{reminder.title}</span>
                      <Badge variant="warning" size="sm">{formatDate(reminder.due_date)}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">No active reminders</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Image Gallery Modal */}
      <Modal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        title=""
      >
        <div className="relative bg-black">
          {/* Close button */}
          <button
            onClick={() => setIsGalleryOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          >
            <Icon icon={X} size="sm" />
          </button>

          {/* Main image */}
          {allImages[galleryIndex] && (
            <div className="flex items-center justify-center min-h-[60vh] max-h-[80vh]">
              <img
                src={allImages[galleryIndex].url}
                alt={allImages[galleryIndex].original_name}
                className="max-w-full max-h-[80vh] object-contain"
              />
            </div>
          )}

          {/* Navigation arrows */}
          {allImages.length > 1 && (
            <>
              <button
                onClick={() => setGalleryIndex((prev) => (prev - 1 + allImages.length) % allImages.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Icon icon={ChevronLeft} size="md" />
              </button>
              <button
                onClick={() => setGalleryIndex((prev) => (prev + 1) % allImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
              >
                <Icon icon={ChevronRight} size="md" />
              </button>
            </>
          )}

          {/* Image counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
            {galleryIndex + 1} / {allImages.length}
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Item">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            updateMutation.mutate(editData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editData.name || ''}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            required
          />

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select a category' },
              ...allCategories.map((c) => ({ value: c.id.toString(), label: c.name })),
            ]}
            value={editData.category_id?.toString() || ''}
            onChange={(e) => setEditData({ ...editData, category_id: Number(e.target.value) || undefined })}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Make"
              value={editData.make || ''}
              onChange={(e) => setEditData({ ...editData, make: e.target.value })}
            />
            <Input
              label="Model"
              value={editData.model || ''}
              onChange={(e) => setEditData({ ...editData, model: e.target.value })}
            />
          </div>

          <Input
            label="Serial Number"
            value={editData.serial_number || ''}
            onChange={(e) => setEditData({ ...editData, serial_number: e.target.value })}
          />

          <Select
            label="Location"
            options={[
              { value: '', label: 'Select a location' },
              ...allLocations.map((l) => ({ value: l.id.toString(), label: l.name })),
            ]}
            value={editData.location_id?.toString() || ''}
            onChange={(e) => setEditData({ ...editData, location_id: Number(e.target.value) || undefined })}
          />

          <Select
            label="Vendor"
            options={[
              { value: '', label: 'Select a vendor' },
              ...allVendors.map((v) => ({ value: v.id.toString(), label: v.name })),
            ]}
            value={editData.vendor_id?.toString() || ''}
            onChange={(e) => setEditData({ ...editData, vendor_id: Number(e.target.value) || undefined })}
          />

          <Input
            label="Install Date"
            type="date"
            value={editData.install_date || ''}
            onChange={(e) => setEditData({ ...editData, install_date: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={editData.notes || ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Part Modal */}
      <Modal
        isOpen={isPartModalOpen}
        onClose={() => {
          setIsPartModalOpen(false)
          setEditingPart(null)
          resetPartForm()
        }}
        title={editingPart ? 'Edit Part' : 'Add Part'}
        size="lg"
      >
        <form onSubmit={handlePartSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Part Image */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Part Image
              </label>
              {editingPart ? (
                <ImageUpload
                  fileableType="part"
                  fileableId={editingPart.id}
                  featuredImage={editingPart.featured_image}
                  existingImages={editingPart.images || []}
                  invalidateQueries={[['items', id!]]}
                  multiple={false}
                  showGallery={false}
                  label="Upload Part Image"
                  className="w-full"
                />
              ) : (
                <div className="aspect-square rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <Icon icon={Package} size="lg" className="mx-auto mb-2" />
                    <p className="text-xs">Save part first to add image</p>
                  </div>
                </div>
              )}
            </div>

            {/* Part Details */}
            <div className="md:col-span-2 space-y-4">
              <Input
                label="Name"
                value={partFormData.name}
                onChange={(e) => setPartFormData({ ...partFormData, name: e.target.value })}
                required
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Part Number"
                  value={partFormData.part_number}
                  onChange={(e) => setPartFormData({ ...partFormData, part_number: e.target.value })}
                />

                <Select
                  label="Type"
                  options={[
                    { value: 'replacement', label: 'Replacement Part' },
                    { value: 'consumable', label: 'Consumable Part' },
                  ]}
                  value={partFormData.type}
                  onChange={(e) => setPartFormData({ ...partFormData, type: e.target.value as 'replacement' | 'consumable' })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Purchase URL"
                  type="url"
                  value={partFormData.purchase_url}
                  onChange={(e) => setPartFormData({ ...partFormData, purchase_url: e.target.value })}
                  placeholder="https://..."
                />

                <Input
                  label="Price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={partFormData.price}
                  onChange={(e) => setPartFormData({ ...partFormData, price: e.target.value })}
                />
              </div>

              <Textarea
                label="Notes"
                value={partFormData.notes}
                onChange={(e) => setPartFormData({ ...partFormData, notes: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsPartModalOpen(false)
                setEditingPart(null)
                resetPartForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createPartMutation.isPending || updatePartMutation.isPending}
            >
              {editingPart ? 'Save Changes' : 'Add Part'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Maintenance Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false)
          setEditingLog(null)
          resetLogForm()
        }}
        title={editingLog ? 'Edit Maintenance Log' : 'Add Maintenance Log'}
      >
        <form onSubmit={handleLogSubmit} className="p-6 space-y-4">
          <Select
            label="Type"
            options={[
              { value: 'service', label: 'Service' },
              { value: 'repair', label: 'Repair' },
              { value: 'replacement', label: 'Replacement' },
              { value: 'inspection', label: 'Inspection' },
            ]}
            value={logFormData.type}
            onChange={(e) => setLogFormData({ ...logFormData, type: e.target.value as 'service' | 'repair' | 'replacement' | 'inspection' })}
          />

          <Input
            label="Date"
            type="date"
            value={logFormData.date}
            onChange={(e) => setLogFormData({ ...logFormData, date: e.target.value })}
            required
          />

          <Select
            label="Vendor"
            options={[
              { value: '', label: 'Select a vendor (optional)' },
              ...allVendors.map((v) => ({ value: v.id.toString(), label: v.name })),
            ]}
            value={logFormData.vendor_id}
            onChange={(e) => setLogFormData({ ...logFormData, vendor_id: e.target.value })}
          />

          <Input
            label="Cost"
            type="number"
            step="0.01"
            min="0"
            value={logFormData.cost}
            onChange={(e) => setLogFormData({ ...logFormData, cost: e.target.value })}
          />

          <Textarea
            label="Notes"
            value={logFormData.notes}
            onChange={(e) => setLogFormData({ ...logFormData, notes: e.target.value })}
            rows={3}
          />

          {/* Parts used in this maintenance */}
          {item.parts && item.parts.length > 0 && (
            <div className="relative">
              <PartsMultiSelect
                label="Parts Used"
                parts={item.parts}
                selectedPartIds={logFormData.part_ids}
                onChange={(partIds) => setLogFormData({ ...logFormData, part_ids: partIds })}
                placeholder="Search and select parts used..."
                hint="Select any parts that were used or replaced during this maintenance"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsLogModalOpen(false)
                setEditingLog(null)
                resetLogForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createLogMutation.isPending || updateLogMutation.isPending}
            >
              {editingLog ? 'Save Changes' : 'Add Log'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Smart Fill Modal */}
      <Modal
        isOpen={isSmartFillOpen}
        onClose={() => setIsSmartFillOpen(false)}
        title="Smart Fill"
      >
        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200 dark:border-gray-800">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Icon icon={Sparkles} size="sm" className="text-white" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-50">{item?.make} {item?.model}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">AI-powered features for this item</p>
            </div>
          </div>

          {/* Find Manual */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <Icon icon={FileText} size="sm" className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">Find Product Manual</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Search and download PDF manual</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.manual === 'success' && (
                  <Icon icon={Check} size="sm" className="text-green-500" />
                )}
                {smartFillStatus.manual === 'error' && (
                  <Icon icon={X} size="sm" className="text-red-500" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={smartFillStatus.manual === 'searching' || smartFillStatus.manual === 'downloading' || !item?.make || !item?.model}
                  onClick={() => {
                    if (item?.make && item?.model) {
                      searchAndDownloadManual(item.make, item.model)
                    }
                  }}
                >
                  {smartFillStatus.manual === 'searching' || smartFillStatus.manual === 'downloading' ? (
                    <>
                      <Icon icon={Loader2} size="xs" className="animate-spin" /> {smartFillStatus.manual === 'searching' ? 'Searching...' : 'Downloading...'}
                    </>
                  ) : (
                    <>
                      <Icon icon={Download} size="xs" /> Find Manual
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(smartFillStatus.manual === 'searching' || smartFillStatus.manual === 'downloading' || smartFillStatus.manual === 'success' || smartFillStatus.manual === 'error') && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {manualSearchStep && (
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-3">{manualSearchStep}</p>
                )}

                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.repositories.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.repositories.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  <span className={manualSearchProgress.repositories.status === 'pending' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                    Manual repositories
                  </span>
                  {manualSearchProgress.repositories.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.repositories.count} found)</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.ai.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.ai.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  <span className={manualSearchProgress.ai.status === 'pending' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                    AI suggestions
                  </span>
                  {manualSearchProgress.ai.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.ai.count} found)</span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.web.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.web.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-green-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                  )}
                  <span className={manualSearchProgress.web.status === 'pending' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                    Web search
                  </span>
                  {manualSearchProgress.web.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.web.count} found)</span>
                  )}
                </div>

                {(smartFillStatus.manual === 'downloading' || manualSearchProgress.downloading.status !== 'pending') && (
                  <div className="flex items-center gap-2 text-sm">
                    {manualSearchProgress.downloading.status === 'trying' ? (
                      <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                    ) : manualSearchProgress.downloading.status === 'done' ? (
                      <Icon icon={Check} size="xs" className="text-green-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                    <span className={manualSearchProgress.downloading.status === 'pending' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                      Download
                    </span>
                    {manualSearchProgress.downloading.current && (
                      <span className="text-gray-500">({manualSearchProgress.downloading.current})</span>
                    )}
                  </div>
                )}

                {/* Show search links as fallback */}
                {manualSearchLinks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      Search for the manual manually:
                    </p>
                    <div className="flex flex-col gap-2">
                      {manualSearchLinks.map((link, idx) => {
                        const icon = link.url.includes('google.com') ? '🔍' : link.url.includes('manualslib') ? '📚' : link.url.includes('duckduckgo') ? '🦆' : '🌐'
                        return (
                          <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-primary-600 dark:text-primary-400 transition-colors"
                          >
                            <span>{icon}</span>
                            <span className="flex-1">{link.label}</span>
                            <Icon icon={ExternalLink} size="xs" />
                          </a>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Get AI Suggestions */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <Icon icon={Sparkles} size="sm" className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-50">AI Suggestions</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Warranty, maintenance, and lifespan info</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.suggestions === 'success' && (
                  <Icon icon={Check} size="sm" className="text-green-500" />
                )}
                {smartFillStatus.suggestions === 'error' && (
                  <Icon icon={X} size="sm" className="text-red-500" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={smartFillStatus.suggestions === 'loading' || !item?.make || !item?.model}
                  onClick={() => {
                    if (item?.make && item?.model) {
                      getAISuggestionsWithProgress(item.make, item.model, item.category?.name)
                    }
                  }}
                >
                  {smartFillStatus.suggestions === 'loading' ? (
                    <>
                      <Icon icon={Loader2} size="xs" className="animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Icon icon={Sparkles} size="xs" /> Get Suggestions
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(smartFillStatus.suggestions === 'loading' || smartFillStatus.suggestions === 'success' || smartFillStatus.suggestions === 'error') && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {smartFillStatus.suggestions === 'loading' && aiSuggestionsStep && (
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-3">{aiSuggestionsStep}</p>
                )}

                {/* Agent status indicator */}
                {aiSuggestionsAgentMeta && (
                  <div className="flex items-center gap-2 text-sm mb-3">
                    <Icon icon={Users} size="xs" className="text-primary-500" />
                    <span className="text-gray-700 dark:text-gray-200">
                      {aiSuggestionsAgentMeta.agents_succeeded}/{aiSuggestionsAgentMeta.agents_used.length} agents
                    </span>
                    {aiSuggestionsAgentMeta.synthesis_agent && (
                      <Badge size="sm" variant="primary">
                        Synthesized by {AGENT_DISPLAY_NAMES[aiSuggestionsAgentMeta.synthesis_agent] || aiSuggestionsAgentMeta.synthesis_agent}
                      </Badge>
                    )}
                    <span className="text-gray-400 text-xs">
                      {(aiSuggestionsAgentMeta.total_duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}

                {/* Individual agent status */}
                {aiSuggestionsAgentMeta && (
                  <div className="grid grid-cols-2 gap-2">
                    {aiSuggestionsAgentMeta.agents_used.map(agent => {
                      const details = aiSuggestionsAgentMeta.agent_details[agent]
                      const isLoading = smartFillStatus.suggestions === 'loading' && !details
                      return (
                        <div key={agent} className="flex items-center gap-2 text-xs">
                          {isLoading ? (
                            <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                          ) : details?.success ? (
                            <Icon icon={Check} size="xs" className="text-green-500" />
                          ) : (
                            <Icon icon={X} size="xs" className="text-red-500" />
                          )}
                          <span className={details?.success ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>
                            {AGENT_DISPLAY_NAMES[agent] || agent}
                          </span>
                          {details && (
                            <span className="text-gray-400">
                              {(details.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {!aiSuggestionsAgentMeta && (
                  <div className="flex items-center gap-2 text-sm">
                    {aiSuggestionsProgress.query.status === 'querying' ? (
                      <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                    ) : aiSuggestionsProgress.query.status === 'done' ? (
                      <Icon icon={Check} size="xs" className="text-green-500" />
                    ) : aiSuggestionsProgress.query.status === 'error' ? (
                      <Icon icon={X} size="xs" className="text-red-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 dark:border-gray-600" />
                    )}
                    <span className={aiSuggestionsProgress.query.status === 'pending' ? 'text-gray-400' : 'text-gray-700 dark:text-gray-200'}>
                      Query AI
                    </span>
                    {aiSuggestionsProgress.query.error && (
                      <span className="text-red-500 text-xs">({aiSuggestionsProgress.query.error})</span>
                    )}
                  </div>
                )}
              </div>
            )}

            {aiSuggestions && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
                {aiSuggestions.warranty_years !== undefined && aiSuggestions.warranty_years !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Typical Warranty</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{aiSuggestions.warranty_years} years</span>
                  </div>
                )}
                {aiSuggestions.maintenance_interval_months !== undefined && aiSuggestions.maintenance_interval_months !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Maintenance Interval</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">Every {aiSuggestions.maintenance_interval_months} months</span>
                  </div>
                )}
                {aiSuggestions.typical_lifespan_years !== undefined && aiSuggestions.typical_lifespan_years !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Typical Lifespan</span>
                    <span className="font-medium text-gray-900 dark:text-gray-50">{aiSuggestions.typical_lifespan_years} years</span>
                  </div>
                )}
                {aiSuggestions.notes && (
                  <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                    <p className="text-sm text-gray-600 dark:text-gray-300">{aiSuggestions.notes}</p>
                  </div>
                )}
                <div className="pt-3">
                  <Button
                    size="sm"
                    onClick={() => {
                      const updateData: Partial<Item> = {}
                      if (aiSuggestions.warranty_years !== undefined && aiSuggestions.warranty_years !== null) {
                        updateData.warranty_years = aiSuggestions.warranty_years
                      }
                      if (aiSuggestions.maintenance_interval_months !== undefined && aiSuggestions.maintenance_interval_months !== null) {
                        updateData.maintenance_interval_months = aiSuggestions.maintenance_interval_months
                      }
                      if (aiSuggestions.typical_lifespan_years !== undefined && aiSuggestions.typical_lifespan_years !== null) {
                        updateData.typical_lifespan_years = aiSuggestions.typical_lifespan_years
                      }
                      if (aiSuggestions.notes && !item?.notes) {
                        updateData.notes = aiSuggestions.notes
                      }
                      updateMutation.mutate(updateData, {
                        onSuccess: () => {
                          toast.success('AI suggestions applied to item')
                        }
                      })
                    }}
                    disabled={updateMutation.isPending}
                    className="w-full"
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Icon icon={Loader2} size="xs" className="animate-spin" /> Applying...
                      </>
                    ) : (
                      <>
                        <Icon icon={Check} size="xs" /> Apply to Item
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Suggest Parts */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 flex items-center justify-center">
                  <Icon icon={Wrench} size="sm" className="text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-gray-50">Suggest Parts</p>
                    {partsAgentMeta?.manuals_used && partsAgentMeta.manuals_used > 0 && (
                      <Badge size="sm" variant="primary">
                        <Icon icon={FileText} size="xs" className="mr-1" />
                        {partsAgentMeta.manuals_used} manual{partsAgentMeta.manuals_used > 1 ? 's' : ''} used
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {item?.files?.some(f => f.mime_type === 'application/pdf') 
                      ? 'AI will use uploaded manuals for accurate parts' 
                      : 'Find replacement & consumable parts'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.parts === 'success' && (
                  <Icon icon={Check} size="sm" className="text-green-500" />
                )}
                {smartFillStatus.parts === 'error' && (
                  <Icon icon={X} size="sm" className="text-red-500" />
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={smartFillStatus.parts === 'loading' || !item?.make || !item?.model}
                  onClick={() => {
                    if (item?.make && item?.model) {
                      getPartsSuggestions(item.make, item.model, item.category?.name)
                    }
                  }}
                >
                  {smartFillStatus.parts === 'loading' ? (
                    <>
                      <Icon icon={Loader2} size="xs" className="animate-spin" /> Searching...
                    </>
                  ) : (
                    <>
                      <Icon icon={Wrench} size="xs" /> Find Parts
                    </>
                  )}
                </Button>
              </div>
            </div>

            {(smartFillStatus.parts === 'loading' || partsAgentMeta) && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
                {smartFillStatus.parts === 'loading' && partsStep && (
                  <p className="text-sm font-medium text-primary-600 dark:text-primary-400 mb-2">{partsStep}</p>
                )}

                {/* Agent status indicator */}
                {partsAgentMeta && (
                  <div className="flex items-center gap-2 text-sm">
                    <Icon icon={Users} size="xs" className="text-primary-500" />
                    <span className="text-gray-700 dark:text-gray-200">
                      {partsAgentMeta.agents_succeeded}/{partsAgentMeta.agents_used.length} agents
                    </span>
                    {partsAgentMeta.synthesis_agent && (
                      <Badge size="sm" variant="primary">
                        Synthesized by {AGENT_DISPLAY_NAMES[partsAgentMeta.synthesis_agent] || partsAgentMeta.synthesis_agent}
                      </Badge>
                    )}
                    <span className="text-gray-400 text-xs">
                      {(partsAgentMeta.total_duration_ms / 1000).toFixed(1)}s
                    </span>
                  </div>
                )}

                {/* Individual agent status when loading */}
                {smartFillStatus.parts === 'loading' && partsAgentMeta && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {partsAgentMeta.agents_used.map(agent => {
                      const details = partsAgentMeta.agent_details[agent]
                      const isLoading = !details
                      return (
                        <div key={agent} className="flex items-center gap-2 text-xs">
                          {isLoading ? (
                            <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                          ) : details?.success ? (
                            <Icon icon={Check} size="xs" className="text-green-500" />
                          ) : (
                            <Icon icon={X} size="xs" className="text-red-500" />
                          )}
                          <span className={details?.success ? 'text-gray-700 dark:text-gray-200' : 'text-gray-400'}>
                            {AGENT_DISPLAY_NAMES[agent] || agent}
                          </span>
                          {details && (
                            <span className="text-gray-400">
                              {(details.duration_ms / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {suggestedParts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {selectedParts.size} of {suggestedParts.length} selected
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                      onClick={() => setSelectedParts(new Set(suggestedParts.map((_, i) => i)))}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
                      onClick={() => setSelectedParts(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {suggestedParts.map((part, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedParts.has(index)
                          ? 'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                        checked={selectedParts.has(index)}
                        onChange={(e) => {
                          const newSet = new Set(selectedParts)
                          if (e.target.checked) {
                            newSet.add(index)
                          } else {
                            newSet.delete(index)
                          }
                          setSelectedParts(newSet)
                        }}
                      />
                      {/* Part Image */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center overflow-hidden">
                        {loadingPartImages.has(index) ? (
                          <Icon icon={Loader2} size="sm" className="text-gray-400 animate-spin" />
                        ) : partImages[index] ? (
                          <img 
                            src={partImages[index]!} 
                            alt={part.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image fails to load, show placeholder
                              e.currentTarget.style.display = 'none'
                              e.currentTarget.parentElement!.innerHTML = `<span class="text-gray-400 text-xs font-medium">${part.name.substring(0, 2).toUpperCase()}</span>`
                            }}
                          />
                        ) : (
                          <span className="text-gray-400 text-xs font-medium">
                            {part.name.substring(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-gray-50 text-sm">{part.name}</span>
                          <Badge size="sm" variant={part.type === 'consumable' ? 'warning' : 'gray'}>
                            {part.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {part.estimated_price && (
                            <span>~${part.estimated_price}</span>
                          )}
                          {part.replacement_interval && (
                            <span>{part.replacement_interval}</span>
                          )}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <a
                            href={part.purchase_urls.repairclinic}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            RepairClinic
                          </a>
                          <a
                            href={part.purchase_urls.amazon}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Amazon
                          </a>
                          <a
                            href={part.purchase_urls.home_depot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Home Depot
                          </a>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    onClick={addSelectedParts}
                    disabled={selectedParts.size === 0 || isAddingParts}
                    className="w-full"
                  >
                    {isAddingParts ? (
                      <>
                        <Icon icon={Loader2} size="xs" className="animate-spin" /> Adding...
                      </>
                    ) : (
                      <>
                        <Icon icon={Plus} size="xs" /> Add {selectedParts.size} Parts to Item
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="secondary" onClick={() => setIsSmartFillOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Document Preview Modal */}
      <Modal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.original_name || 'Document Preview'}
        size="full"
      >
        <div className="h-[calc(90vh-120px)]">
          {previewDoc && (
            previewDoc.mime_type?.includes('pdf') ? (
              <iframe
                src={previewDoc.url}
                className="w-full h-full border-0"
                title={previewDoc.original_name}
              />
            ) : previewDoc.mime_type?.startsWith('image/') ? (
              <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-800">
                <img
                  src={previewDoc.url}
                  alt={previewDoc.original_name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
                <Icon icon={FileText} size="lg" />
                <p className="text-sm">Preview not available for this file type</p>
                <a
                  href={previewDoc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 hover:text-primary-700 text-sm flex items-center gap-1"
                >
                  <Icon icon={ExternalLink} size="xs" /> Open in new tab
                </a>
              </div>
            )
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a
              href={previewDoc?.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
            >
              <Icon icon={ExternalLink} size="xs" /> Open in new tab
            </a>
            <a
              href={previewDoc?.url}
              download={previewDoc?.original_name}
              className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 flex items-center gap-1"
            >
              <Icon icon={Download} size="xs" /> Download
            </a>
          </div>
          <Button variant="secondary" onClick={() => setPreviewDoc(null)}>
            Close
          </Button>
        </div>
      </Modal>

      {/* Delete Document Confirmation Modal */}
      <Modal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        title="Delete Document"
        size="sm"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Icon icon={AlertTriangle} size="sm" className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-gray-50">Are you sure?</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
            </div>
          </div>
          {docToDelete && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Icon icon={FileText} size="sm" className="text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{docToDelete.original_name}</span>
              </div>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" onClick={() => setDocToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => docToDelete && deleteDocMutation.mutate(docToDelete.id)}
              disabled={deleteDocMutation.isPending}
            >
              {deleteDocMutation.isPending ? (
                <>
                  <Icon icon={Loader2} size="xs" className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Icon icon={Trash2} size="xs" /> Delete
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
