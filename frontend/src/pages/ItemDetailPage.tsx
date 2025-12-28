import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { items, categories, locations, vendors, parts, maintenanceLogs } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { DocumentUpload } from '@/components/ui'
import { formatDate, formatCurrency } from '@/lib/utils'
import {
  Icon,
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Wrench,
  Package,
  Bell,
  Trash2,
  Pencil,
  Plus,
  Image,
  FileText,
  Sparkles,
  Download,
  Loader2,
  Check,
  X,
} from '@/components/ui'
import toast from 'react-hot-toast'
import type { Item, Part, MaintenanceLog } from '@/types'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-48 animate-pulse" />
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 bg-gray-100 dark:bg-gray-800 rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-16" />
                    <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3 animate-pulse">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-24" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-full" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-3/4" />
            </div>
          </CardContent>
        </Card>
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

  // Parts suggestion state
  type SuggestedPart = {
    name: string
    type: 'replacement' | 'consumable'
    part_number: string | null
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

  // Smart Fill - Step-by-step manual search
  const searchAndDownloadManual = async (make: string, model: string) => {
    const itemId = Number(id)
    const allUrls: string[] = []

    // Reset progress
    setSmartFillStatus(prev => ({ ...prev, manual: 'searching' }))
    setManualSearchProgress({
      repositories: { status: 'pending', count: 0 },
      ai: { status: 'pending', count: 0 },
      web: { status: 'pending', count: 0 },
      downloading: { status: 'pending', current: '' },
    })

    try {
      // Step 1: Search repositories
      setManualSearchStep('Searching manual repositories...')
      setManualSearchProgress(prev => ({ ...prev, repositories: { status: 'searching', count: 0 } }))
      const repoResult = await items.searchManualUrls(itemId, make, model, 'repositories')
      allUrls.push(...repoResult.urls)
      setManualSearchProgress(prev => ({ ...prev, repositories: { status: 'done', count: repoResult.count } }))

      // Step 2: AI suggestions
      setManualSearchStep('Asking AI for suggestions...')
      setManualSearchProgress(prev => ({ ...prev, ai: { status: 'searching', count: 0 } }))
      const aiResult = await items.searchManualUrls(itemId, make, model, 'ai')
      allUrls.push(...aiResult.urls)
      setManualSearchProgress(prev => ({ ...prev, ai: { status: 'done', count: aiResult.count } }))

      // Step 3: Web search
      setManualSearchStep('Searching the web...')
      setManualSearchProgress(prev => ({ ...prev, web: { status: 'searching', count: 0 } }))
      const webResult = await items.searchManualUrls(itemId, make, model, 'web')
      allUrls.push(...webResult.urls)
      setManualSearchProgress(prev => ({ ...prev, web: { status: 'done', count: webResult.count } }))

      // Remove duplicates
      const uniqueUrls = [...new Set(allUrls)]

      if (uniqueUrls.length === 0) {
        setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
        setManualSearchStep('No sources found')
        toast.error('No manual sources found for this product')
        return
      }

      // Step 4: Try downloading from each URL
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

      // If we get here, no URL worked
      setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
      setManualSearchStep('Could not download from any source')
      toast.error('Found sources but could not download a valid PDF')

    } catch (error) {
      setSmartFillStatus(prev => ({ ...prev, manual: 'error' }))
      // Check if it's a timeout error
      const isTimeout = error instanceof Error && (
        error.message?.includes('timeout') ||
        (error as { code?: string }).code === 'ECONNABORTED'
      )
      setManualSearchStep(isTimeout ? 'Request timed out' : 'Search failed')
      toast.error(isTimeout ? 'Request timed out. Try again or check your connection.' : 'Failed to search for manual')
    }
  }

  // AI Suggestions - single request, no separate config check
  // The backend returns provider info along with suggestions
  const getAISuggestionsWithProgress = async (make: string, model: string, category?: string) => {
    const itemId = Number(id)

    // Reset state
    setSmartFillStatus(prev => ({ ...prev, suggestions: 'loading' }))
    setAISuggestions(null)
    setAISuggestionsProgress({
      config: { status: 'done' }, // Skip config check - backend returns provider info
      query: { status: 'pending' },
    })

    try {
      // Single request to query AI - returns provider info alongside results
      setAISuggestionsStep('Querying AI...')
      setAISuggestionsProgress(prev => ({ ...prev, query: { status: 'querying' } }))

      const result = await items.queryAISuggestions(itemId, make, model, category)

      // Update provider info from response
      if (result.provider) {
        setAISuggestionsProgress(prev => ({
          ...prev,
          config: { status: 'done', provider: result.provider || undefined }
        }))
        setAISuggestionsStep(`Querying ${result.provider}...`)
      }

      if (result.success && result.suggestions) {
        setAISuggestionsProgress(prev => ({ ...prev, query: { status: 'done' } }))
        setSmartFillStatus(prev => ({ ...prev, suggestions: 'success' }))
        setAISuggestionsStep('Complete!')
        setAISuggestions(result.suggestions)
      } else {
        setAISuggestionsProgress(prev => ({
          ...prev,
          config: result.provider ? { status: 'done', provider: result.provider } : { status: 'error' },
          query: { status: 'error', error: result.error }
        }))
        setSmartFillStatus(prev => ({ ...prev, suggestions: 'error' }))
        setAISuggestionsStep(result.error || 'Failed to get suggestions')
        toast.error(result.error || 'Failed to get AI suggestions')
      }
    } catch (error) {
      setSmartFillStatus(prev => ({ ...prev, suggestions: 'error' }))
      // Check if it's a timeout error
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

  // Parts Suggestions
  const getPartsSuggestions = async (make: string, model: string, category?: string) => {
    const itemId = Number(id)

    setSmartFillStatus(prev => ({ ...prev, parts: 'loading' }))
    setSuggestedParts([])
    setSelectedParts(new Set())
    setPartsStep('Analyzing product for common parts...')

    try {
      const result = await items.suggestParts(itemId, make, model, category)

      if (result.success && result.parts) {
        setSmartFillStatus(prev => ({ ...prev, parts: 'success' }))
        setPartsStep(`Found ${result.parts.length} parts`)
        setSuggestedParts(result.parts)
        // Select all by default
        setSelectedParts(new Set(result.parts.map((_, i) => i)))
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
        // Use RepairClinic as primary URL for backwards compatibility
        const primaryUrl = part.purchase_urls.repairclinic || part.purchase_urls.amazon || part.purchase_urls.home_depot
        return {
          name: part.name,
          type: part.type,
          part_number: part.part_number,
          purchase_url: primaryUrl, // Keep for backward compatibility
          purchase_urls: part.purchase_urls, // Store all URLs
          price: part.estimated_price,
          notes: part.replacement_interval ? `Replacement interval: ${part.replacement_interval}` : null,
        }
      })

      await parts.createBatch(Number(id), partsToAdd)
      queryClient.invalidateQueries({ queryKey: ['items', id] })
      toast.success(`Added ${partsToAdd.length} parts to item`)
      // Don't auto-close modal - let user close manually
    } catch {
      toast.error('Failed to add parts')
    } finally {
      setIsAddingParts(false)
    }
  }

  // Helper functions
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

  if (isLoading) {
    return <DetailSkeleton />
  }

  const item = data?.item

  if (!item) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <Icon icon={Package} size="md" className="text-gray-400 dark:text-gray-500" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Item not found</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">The item you're looking for doesn't exist.</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate('/items')}>
          <Icon icon={ArrowLeft} size="xs" /> Back to Items
        </Button>
      </div>
    )
  }

  const replacementParts = item.parts?.filter((p) => p.type === 'replacement') || []
  const consumableParts = item.parts?.filter((p) => p.type === 'consumable') || []

  return (
    <div className="space-y-6">
      {/* Page Header - Untitled UI style */}
      <div className="flex items-start justify-between pb-5 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/items')}>
            <Icon icon={ArrowLeft} size="xs" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">{item.name}</h1>
              {item.category && (
                <Badge style={{ backgroundColor: `${item.category.color}20`, color: item.category.color ?? undefined }}>
                  {item.category.name}
                </Badge>
              )}
            </div>
            {(item.make || item.model) && (
              <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">
                {[item.make, item.model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
            <Icon icon={Trash2} size="xs" /> Delete
          </Button>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <Card className="lg:col-span-2">
          <CardHeader className="border-b border-gray-200 dark:border-gray-800">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              {(item.location_obj || item.location) && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={MapPin} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{item.location_obj?.name || item.location}</p>
                  </div>
                </div>
              )}
              {item.install_date && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Calendar} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Install Date</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{formatDate(item.install_date)}</p>
                  </div>
                </div>
              )}
              {item.serial_number && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Package} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Serial Number</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{item.serial_number}</p>
                  </div>
                </div>
              )}
              {item.vendor && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={User} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Vendor</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{item.vendor.name}</p>
                  </div>
                </div>
              )}
              {item.warranty_years && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Bell} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Warranty</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">{item.warranty_years} years</p>
                  </div>
                </div>
              )}
              {item.maintenance_interval_months && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Wrench} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Maintenance</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">Every {item.maintenance_interval_months} months</p>
                  </div>
                </div>
              )}
              {item.typical_lifespan_years && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Calendar} size="sm" className="text-gray-700 dark:text-gray-300" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Lifespan</p>
                    <p className="font-medium text-gray-900 dark:text-gray-50">~{item.typical_lifespan_years} years</p>
                  </div>
                </div>
              )}
            </div>
            {item.notes && (
              <div className="pt-6 mt-6 border-t border-gray-200 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Notes</p>
                <p className="text-gray-700 dark:text-gray-200">{item.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Reminders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Bell} size="sm" className="text-gray-400" /> Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {item.reminders && item.reminders.length > 0 ? (
              <div className="space-y-3">
                {item.reminders.map((reminder) => (
                  <div key={reminder.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <span className="text-sm font-medium text-gray-900">{reminder.title}</span>
                    <Badge variant="warning" size="sm">{formatDate(reminder.due_date)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">No active reminders</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Images */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Icon icon={Image} size="sm" className="text-gray-400" /> Images
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ImageUpload
            fileableType="item"
            fileableId={item.id}
            existingImages={item.images || []}
            featuredImage={item.featured_image}
            invalidateQueries={[['items', id!]]}
            label="Upload item images"
          />
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <CardTitle className="flex items-center gap-2">
            <Icon icon={FileText} size="sm" className="text-gray-400" /> Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <DocumentUpload
            fileableType="item"
            fileableId={item.id}
            existingDocuments={item.files || []}
            invalidateQueries={[['items', id!]]}
            label="Upload manuals, warranties, receipts"
          />
        </CardContent>
      </Card>

      {/* Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Wrench} size="sm" className="text-gray-400" /> Replacement Parts
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => openPartModal('replacement')}>
              <Icon icon={Plus} size="xs" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {replacementParts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {replacementParts.map((part) => (
                  <li key={part.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{part.name}</p>
                      {part.part_number && (
                        <p className="text-sm text-gray-500">#{part.part_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {part.price && (
                          <p className="font-medium text-gray-900">{formatCurrency(part.price)}</p>
                        )}
                        {(part.purchase_urls || part.purchase_url) && (
                          <div className="flex items-center gap-2">
                            {part.purchase_urls?.repairclinic && (
                              <a
                                href={part.purchase_urls.repairclinic}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                              >
                                RepairClinic
                              </a>
                            )}
                            {part.purchase_urls?.amazon && (
                              <a
                                href={part.purchase_urls.amazon}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                              >
                                Amazon
                              </a>
                            )}
                            {part.purchase_urls?.home_depot && (
                              <a
                                href={part.purchase_urls.home_depot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-700 hover:text-orange-800 font-medium"
                              >
                                Home Depot
                              </a>
                            )}
                            {!part.purchase_urls && part.purchase_url && (
                              <a
                                href={part.purchase_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Buy
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPartModal('replacement', part)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit part"
                        >
                          <Icon icon={Pencil} size="xs" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this part?')) {
                              deletePartMutation.mutate(part.id)
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete part"
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
                <p className="text-sm text-gray-500">No replacement parts added</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Package} size="sm" className="text-gray-400" /> Consumable Parts
            </CardTitle>
            <Button variant="secondary" size="sm" onClick={() => openPartModal('consumable')}>
              <Icon icon={Plus} size="xs" /> Add
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {consumableParts.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {consumableParts.map((part) => (
                  <li key={part.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{part.name}</p>
                      {part.part_number && (
                        <p className="text-sm text-gray-500">#{part.part_number}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {part.price && (
                          <p className="font-medium text-gray-900">{formatCurrency(part.price)}</p>
                        )}
                        {(part.purchase_urls || part.purchase_url) && (
                          <div className="flex items-center gap-2">
                            {part.purchase_urls?.repairclinic && (
                              <a
                                href={part.purchase_urls.repairclinic}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-600 hover:text-orange-700 font-medium"
                              >
                                RepairClinic
                              </a>
                            )}
                            {part.purchase_urls?.amazon && (
                              <a
                                href={part.purchase_urls.amazon}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium"
                              >
                                Amazon
                              </a>
                            )}
                            {part.purchase_urls?.home_depot && (
                              <a
                                href={part.purchase_urls.home_depot}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-orange-700 hover:text-orange-800 font-medium"
                              >
                                Home Depot
                              </a>
                            )}
                            {!part.purchase_urls && part.purchase_url && (
                              <a
                                href={part.purchase_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Buy
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openPartModal('consumable', part)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                          title="Edit part"
                        >
                          <Icon icon={Pencil} size="xs" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this part?')) {
                              deletePartMutation.mutate(part.id)
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete part"
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
                <p className="text-sm text-gray-500">No consumable parts added</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Maintenance History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
          <CardTitle>Maintenance History</CardTitle>
          <Button variant="secondary" size="sm" onClick={() => openLogModal()}>
            <Icon icon={Plus} size="xs" /> Add Log
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {item.maintenanceLogs && item.maintenanceLogs.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {item.maintenanceLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
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
                    {log.notes && <p className="mt-1 text-sm text-gray-700">{log.notes}</p>}
                    {log.vendor && (
                      <p className="mt-1 text-sm text-gray-500">By: {log.vendor.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 ml-4">
                    {log.cost && (
                      <span className="font-medium text-gray-900">{formatCurrency(log.cost)}</span>
                    )}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openLogModal(log)}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        title="Edit log"
                      >
                        <Icon icon={Pencil} size="xs" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this maintenance log?')) {
                            deleteLogMutation.mutate(log.id)
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete log"
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
              <p className="text-sm text-gray-500">No maintenance records yet</p>
            </div>
          )}
        </CardContent>
      </Card>

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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
      >
        <form onSubmit={handlePartSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={partFormData.name}
            onChange={(e) => setPartFormData({ ...partFormData, name: e.target.value })}
            required
          />

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

          <Textarea
            label="Notes"
            value={partFormData.notes}
            onChange={(e) => setPartFormData({ ...partFormData, notes: e.target.value })}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
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
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            <div className="h-10 w-10 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon icon={Sparkles} size="sm" className="text-primary-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{item?.make} {item?.model}</p>
              <p className="text-sm text-gray-500">AI-powered features for this item</p>
            </div>
          </div>

          {/* Find Manual */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Icon icon={FileText} size="sm" className="text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Find Product Manual</p>
                  <p className="text-sm text-gray-500">Search and download PDF manual</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.manual === 'success' && (
                  <Icon icon={Check} size="sm" className="text-success-500" />
                )}
                {smartFillStatus.manual === 'error' && (
                  <Icon icon={X} size="sm" className="text-error-500" />
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

            {/* Progress Steps */}
            {(smartFillStatus.manual === 'searching' || smartFillStatus.manual === 'downloading' || smartFillStatus.manual === 'success' || smartFillStatus.manual === 'error') && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                {/* Current Step */}
                {manualSearchStep && (
                  <p className="text-sm font-medium text-primary-600 mb-3">{manualSearchStep}</p>
                )}

                {/* Repository Search */}
                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.repositories.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.repositories.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-success-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={manualSearchProgress.repositories.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                    Manual repositories
                  </span>
                  {manualSearchProgress.repositories.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.repositories.count} found)</span>
                  )}
                </div>

                {/* AI Search */}
                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.ai.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.ai.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-success-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={manualSearchProgress.ai.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                    AI suggestions
                  </span>
                  {manualSearchProgress.ai.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.ai.count} found)</span>
                  )}
                </div>

                {/* Web Search */}
                <div className="flex items-center gap-2 text-sm">
                  {manualSearchProgress.web.status === 'searching' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : manualSearchProgress.web.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-success-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={manualSearchProgress.web.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                    Web search
                  </span>
                  {manualSearchProgress.web.status === 'done' && (
                    <span className="text-gray-500">({manualSearchProgress.web.count} found)</span>
                  )}
                </div>

                {/* Download Progress */}
                {(smartFillStatus.manual === 'downloading' || manualSearchProgress.downloading.status !== 'pending') && (
                  <div className="flex items-center gap-2 text-sm">
                    {manualSearchProgress.downloading.status === 'trying' ? (
                      <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                    ) : manualSearchProgress.downloading.status === 'done' ? (
                      <Icon icon={Check} size="xs" className="text-success-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={manualSearchProgress.downloading.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                      Download
                    </span>
                    {manualSearchProgress.downloading.current && (
                      <span className="text-gray-500">({manualSearchProgress.downloading.current})</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Get AI Suggestions */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Icon icon={Sparkles} size="sm" className="text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">AI Suggestions</p>
                  <p className="text-sm text-gray-500">Warranty, maintenance, and lifespan info</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.suggestions === 'success' && (
                  <Icon icon={Check} size="sm" className="text-success-500" />
                )}
                {smartFillStatus.suggestions === 'error' && (
                  <Icon icon={X} size="sm" className="text-error-500" />
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

            {/* Progress Steps */}
            {(smartFillStatus.suggestions === 'loading' || smartFillStatus.suggestions === 'success' || smartFillStatus.suggestions === 'error') && aiSuggestionsProgress.config.status !== 'pending' && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                {/* Current Step */}
                {smartFillStatus.suggestions === 'loading' && aiSuggestionsStep && (
                  <p className="text-sm font-medium text-primary-600 mb-3">{aiSuggestionsStep}</p>
                )}

                {/* Check Config */}
                <div className="flex items-center gap-2 text-sm">
                  {aiSuggestionsProgress.config.status === 'checking' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : aiSuggestionsProgress.config.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-success-500" />
                  ) : aiSuggestionsProgress.config.status === 'error' ? (
                    <Icon icon={X} size="xs" className="text-error-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className="text-gray-700">
                    AI configuration
                  </span>
                  {aiSuggestionsProgress.config.provider && (
                    <span className="text-gray-500">({aiSuggestionsProgress.config.provider})</span>
                  )}
                </div>

                {/* Query AI */}
                <div className="flex items-center gap-2 text-sm">
                  {aiSuggestionsProgress.query.status === 'querying' ? (
                    <Icon icon={Loader2} size="xs" className="text-primary-500 animate-spin" />
                  ) : aiSuggestionsProgress.query.status === 'done' ? (
                    <Icon icon={Check} size="xs" className="text-success-500" />
                  ) : aiSuggestionsProgress.query.status === 'error' ? (
                    <Icon icon={X} size="xs" className="text-error-500" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
                  )}
                  <span className={aiSuggestionsProgress.query.status === 'pending' ? 'text-gray-400' : 'text-gray-700'}>
                    Query AI
                  </span>
                  {aiSuggestionsProgress.query.error && (
                    <span className="text-error-500 text-xs">({aiSuggestionsProgress.query.error})</span>
                  )}
                </div>
              </div>
            )}

            {/* AI Suggestions Results */}
            {aiSuggestions && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                {aiSuggestions.warranty_years !== undefined && aiSuggestions.warranty_years !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Typical Warranty</span>
                    <span className="font-medium text-gray-900">{aiSuggestions.warranty_years} years</span>
                  </div>
                )}
                {aiSuggestions.maintenance_interval_months !== undefined && aiSuggestions.maintenance_interval_months !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Maintenance Interval</span>
                    <span className="font-medium text-gray-900">Every {aiSuggestions.maintenance_interval_months} months</span>
                  </div>
                )}
                {aiSuggestions.typical_lifespan_years !== undefined && aiSuggestions.typical_lifespan_years !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Typical Lifespan</span>
                    <span className="font-medium text-gray-900">{aiSuggestions.typical_lifespan_years} years</span>
                  </div>
                )}
                {aiSuggestions.notes && (
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-sm text-gray-600">{aiSuggestions.notes}</p>
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
                          // Don't auto-close modal - let user close manually
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
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                  <Icon icon={Wrench} size="sm" className="text-gray-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Suggest Parts</p>
                  <p className="text-sm text-gray-500">Find replacement & consumable parts</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {smartFillStatus.parts === 'success' && (
                  <Icon icon={Check} size="sm" className="text-success-500" />
                )}
                {smartFillStatus.parts === 'error' && (
                  <Icon icon={X} size="sm" className="text-error-500" />
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

            {/* Progress */}
            {smartFillStatus.parts === 'loading' && partsStep && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-sm font-medium text-primary-600">{partsStep}</p>
              </div>
            )}

            {/* Suggested Parts List */}
            {suggestedParts.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-gray-700">
                    {selectedParts.size} of {suggestedParts.length} selected
                  </p>
                  <div className="flex gap-2">
                    <button
                      className="text-xs text-primary-600 hover:text-primary-700"
                      onClick={() => setSelectedParts(new Set(suggestedParts.map((_, i) => i)))}
                    >
                      Select all
                    </button>
                    <button
                      className="text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => setSelectedParts(new Set())}
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {suggestedParts.map((part, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedParts.has(index)
                          ? 'border-primary-300 bg-primary-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="mt-1 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
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
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 text-sm">{part.name}</span>
                          <Badge size="sm" variant={part.type === 'consumable' ? 'warning' : 'gray'}>
                            {part.type}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
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
                            className="text-xs text-primary-600 hover:text-primary-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            RepairClinic
                          </a>
                          <a
                            href={part.purchase_urls.amazon}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Amazon
                          </a>
                          <a
                            href={part.purchase_urls.home_depot}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 hover:text-primary-700"
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

          <div className="flex justify-end pt-4 border-t border-gray-200">
            <Button variant="secondary" onClick={() => setIsSmartFillOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
