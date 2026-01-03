import { useState, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { items, categories, locations, files } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
import { Checkbox } from '@/components/ui/Checkbox'
import { Badge } from '@/components/ui/Badge'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import {
  Icon,
  Sparkles,
  Upload,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Check,
  RefreshCw,
  Search,
  Users,
  Zap,
  CheckCircle,
  XCircle,
  HelpTooltip,
  Camera,
  ExternalLink,
  Loader2,
  Circle,
} from '@/components/ui'
import { toast } from 'sonner'
import { cn, isMobileDevice } from '@/lib/utils'
import type { Item, Category } from '@/types'

// Type for AI analysis results
interface AnalysisResult {
  make: string
  model: string
  type: string
  confidence: number
  image_url?: string | null
  agents_agreed?: number
  source_agent?: string
}

// Type for agent details
interface AgentDetail {
  success: boolean
  duration_ms: number
  error: string | null
  has_response: boolean
}

// Type for agent consensus info
interface ConsensusInfo {
  level: 'none' | 'single' | 'low' | 'partial' | 'majority' | 'full'
  agents_agreeing: number
  total_agents: number
}

// Type for agent metadata from API response
interface AgentMetadata {
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

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'results' | 'error'

// Type for tracking individual agent progress during streaming
interface AgentProgress {
  name: string
  displayName: string
  status: 'pending' | 'running' | 'complete' | 'error'
  duration_ms?: number
  error?: string | null
}

// Agent display names
const AGENT_DISPLAY_NAMES: Record<string, string> = {
  claude: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  local: 'Local',
}

export default function SmartAddPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  // State
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [uploadedImage, setUploadedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState<AnalysisResult[]>([])
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [showAllResults, setShowAllResults] = useState(false)
  const [attachPhoto, setAttachPhoto] = useState(true)
  const [searchManual, setSearchManual] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<Partial<Item>>({})
  const [isDragging, setIsDragging] = useState(false)
  const [isSearchingManual, setIsSearchingManual] = useState(false)
  const [agentMetadata, setAgentMetadata] = useState<AgentMetadata | null>(null)
  const [showAgentDetails, setShowAgentDetails] = useState(false)
  const [wasPhotoSearch, setWasPhotoSearch] = useState(false) // Track if original search used a photo
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null) // Selected result's image
  const [userPrompt, setUserPrompt] = useState('') // User-provided context/context for AI analysis
  const [showPhotoConfirmation, setShowPhotoConfirmation] = useState(false) // Show confirmation step after photo upload
  
  // Streaming progress state
  const [agentProgress, setAgentProgress] = useState<AgentProgress[]>([])
  const [overallProgress, setOverallProgress] = useState({ completed: 0, total: 0 })
  const [isSynthesizing, setIsSynthesizing] = useState(false)
  const [isStreamingAnalysis, setIsStreamingAnalysis] = useState(false)
  
  // Lazy-loaded product images for search results
  const [productImages, setProductImages] = useState<Record<number, string | null>>({})
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({})

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ['categories', 'item'],
    queryFn: () => categories.list('item'),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const allCategories = categoriesData?.categories || []
  const allLocations = locationsData?.locations || []

  // Find best matching category based on AI-suggested type
  const findMatchingCategory = (suggestedType: string): Category | undefined => {
    const typeLC = suggestedType.toLowerCase()
    return allCategories.find(
      (c) =>
        c.name.toLowerCase() === typeLC ||
        c.name.toLowerCase().includes(typeLC) ||
        typeLC.includes(c.name.toLowerCase())
    )
  }

  // Lazy-load product images when results change
  useEffect(() => {
    if (results.length === 0) {
      // Clear images when results are cleared
      setProductImages({})
      setImageLoadingStates({})
      return
    }

    // Only search for images for first 5 results to avoid rate limiting
    const resultsToSearch = results.slice(0, 5)
    
    // Initialize loading states
    const initialLoadingStates: Record<number, boolean> = {}
    resultsToSearch.forEach((_, index) => {
      // Don't search if result already has an image_url from backend
      if (!results[index].image_url) {
        initialLoadingStates[index] = true
      } else {
        // If backend already provided an image, set it immediately
        setProductImages(prev => ({ ...prev, [index]: results[index].image_url ?? null }))
      }
    })
    setImageLoadingStates(initialLoadingStates)

    // Search for images for each result in parallel
    resultsToSearch.forEach(async (result, index) => {
      // Skip if result already has an image from backend
      if (result.image_url) {
        // Already set above, just ensure loading state is cleared
        setImageLoadingStates(prev => ({ ...prev, [index]: false }))
        return
      }

      // Skip if no make or model to search with
      if (!result.make && !result.model) {
        setImageLoadingStates(prev => ({ ...prev, [index]: false }))
        setProductImages(prev => ({ ...prev, [index]: null }))
        return
      }

      try {
        const response = await items.searchProductImage(
          result.make,
          result.model,
          result.type
        )
        
        if (response.image_url) {
          setProductImages(prev => ({ ...prev, [index]: response.image_url }))
        } else {
          setProductImages(prev => ({ ...prev, [index]: null }))
        }
      } catch (error) {
        console.error('Failed to load product image:', error)
        setProductImages(prev => ({ ...prev, [index]: null }))
      } finally {
        setImageLoadingStates(prev => ({ ...prev, [index]: false }))
      }
    })
  }, [results])

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Item>) => items.create(data),
    onSuccess: async (data) => {
      const newItem = data.item

      // Upload photo if checkbox is checked
      if (attachPhoto && newItem?.id) {
        try {
          if (wasPhotoSearch && uploadedImage) {
            // User uploaded a photo - use that
            await files.upload(uploadedImage, 'item', newItem.id, true)
          } else if (!wasPhotoSearch && selectedImageUrl) {
            // Text search with product image URL - download and attach it
            await files.uploadFromUrl(selectedImageUrl, 'item', newItem.id, true)
          }
        } catch {
          toast.error('Item created but failed to attach photo')
        }
      }

      // Import product image to gallery (if different from uploaded photo)
      if (selectedImageUrl && newItem?.id) {
        try {
          // Import product image to gallery in these cases:
          // 1. User uploaded a photo (wasPhotoSearch) - import product image as additional gallery image
          // 2. Text search without attachPhoto - import product image to gallery (not featured)
          // 3. Text search with attachPhoto - already uploaded as featured above, so skip to avoid duplicate
          if (wasPhotoSearch || !attachPhoto) {
            // Upload product image to gallery (not as featured since we either have user's photo or didn't check the box)
            await files.uploadFromUrl(
              selectedImageUrl,
              'item',
              newItem.id,
              false, // Never featured - either user's photo is featured or user didn't want featured
              `${formData.make} ${formData.model}`.trim() || 'Product Image'
            )
          }
        } catch {
          // Silent fail - image gallery import is best effort
        }
      }

      // Search for manual if checkbox is checked
      if (searchManual && formData.make && formData.model && newItem?.id) {
        setIsSearchingManual(true)
        try {
          const manualResult = await items.downloadManual(newItem.id, formData.make, formData.model)
          if (manualResult.success) {
            toast.success('Manual found and attached!')
          } else {
            toast('No manual found online', { icon: '📄' })
          }
        } catch {
          // Silent fail - manual search is best effort
        } finally {
          setIsSearchingManual(false)
        }
      }

      queryClient.invalidateQueries({ queryKey: ['items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Item created successfully!')
      navigate(`/items/${newItem.id}`)
    },
    onError: () => {
      toast.error('Failed to create item')
    },
  })

  // Streaming analysis function using Server-Sent Events
  const startStreamingAnalysis = useCallback(async (file?: File, query?: string) => {
    // Reset state
    setResults([])
    setSelectedIndex(null)
    setFormData({})
    setErrorMessage(null)
    setShowAllResults(false)
    setAgentMetadata(null)
    setShowAgentDetails(false)
    setSelectedImageUrl(null)
    setProductImages({})
    setImageLoadingStates({})
    setAgentProgress([])
    setOverallProgress({ completed: 0, total: 0 })
    setIsSynthesizing(false)
    setIsStreamingAnalysis(true)
    setAnalysisState('analyzing')

    const formData = new FormData()
    if (file) formData.append('image', file)
    if (query?.trim()) formData.append('query', query.trim())
    if (allCategories.length > 0) {
      formData.append('categories', JSON.stringify(allCategories.map(c => c.name)))
    }

    try {
      const response = await fetch('/api/items/analyze-image-stream', {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'text/event-stream',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to start analysis')
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        let currentEvent = ''
        let currentData = ''

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim()
          } else if (line.startsWith('data: ')) {
            currentData = line.slice(6)
            
            try {
              const data = JSON.parse(currentData)
              
              switch (currentEvent) {
                case 'init':
                  // Initialize agent progress
                  setAgentProgress(
                    (data.agents as string[]).map((name: string) => ({
                      name,
                      displayName: AGENT_DISPLAY_NAMES[name] || name,
                      status: 'pending' as const,
                    }))
                  )
                  setOverallProgress({ completed: 0, total: data.total })
                  break

                case 'agent_start':
                  // Mark agent as running
                  setAgentProgress(prev => 
                    prev.map(a => 
                      a.name === data.agent 
                        ? { ...a, status: 'running' as const }
                        : a
                    )
                  )
                  break

                case 'agent_complete':
                  // Update agent status
                  setAgentProgress(prev => 
                    prev.map(a => 
                      a.name === data.agent 
                        ? { 
                            ...a, 
                            status: data.success ? 'complete' as const : 'error' as const,
                            duration_ms: data.duration_ms,
                            error: data.error,
                          }
                        : a
                    )
                  )
                  setOverallProgress({ completed: data.completed, total: data.total })
                  break

                case 'synthesis_start':
                  setIsSynthesizing(true)
                  break

                case 'complete':
                  // Final results
                  setIsSynthesizing(false)
                  setIsStreamingAnalysis(false)
                  setAgentMetadata({
                    agents_used: data.agents_used || [],
                    agents_succeeded: data.agents_succeeded || 0,
                    agent_details: data.agent_details || {},
                    agent_errors: data.agent_errors || {},
                    primary_agent: data.primary_agent || null,
                    synthesis_agent: data.synthesis_agent || null,
                    synthesis_error: data.synthesis_error || null,
                    consensus: data.consensus || null,
                    total_duration_ms: data.total_duration_ms || 0,
                    parse_source: data.parse_source || null,
                  })

                  if (data.results && data.results.length > 0) {
                    setResults(data.results)
                    setAnalysisState('results')
                  } else {
                    const errors = Object.entries(data.agent_errors || {})
                    let errorMsg = 'Could not identify the product.'
                    if (errors.length > 0) {
                      errorMsg += ' Agent errors: ' + errors.map(([agent, err]) => `${AGENT_DISPLAY_NAMES[agent] || agent}: ${err}`).join('; ')
                    } else if (data.agents_succeeded === 0) {
                      errorMsg += ' No AI agents responded successfully.'
                    } else {
                      errorMsg += ' Try a different search or clearer photo.'
                    }
                    setErrorMessage(errorMsg)
                    setAnalysisState('error')
                  }
                  break

                case 'error':
                  setIsStreamingAnalysis(false)
                  setErrorMessage(data.message || 'Analysis failed')
                  setAnalysisState('error')
                  break
              }
            } catch {
              // Ignore parse errors for incomplete data
            }
            currentEvent = ''
            currentData = ''
          }
        }
      }
    } catch (error) {
      console.error('Streaming analysis error:', error)
      setIsStreamingAnalysis(false)
      setErrorMessage(error instanceof Error ? error.message : 'Analysis failed')
      setAnalysisState('error')
    }
  }, [allCategories])

  // Handle file selection
  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file')
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB')
        return
      }

      setUploadedImage(file)
      setImagePreview(URL.createObjectURL(file))
      setResults([])
      setSelectedIndex(null)
      setFormData({})
      setErrorMessage(null)
      setShowAllResults(false)
      setAgentMetadata(null)
      setShowAgentDetails(false)
      setWasPhotoSearch(true) // This search was initiated with a photo
      setSelectedImageUrl(null)
      setUserPrompt('') // Reset user prompt for new photo

      // Show confirmation step instead of immediately starting analysis
      setShowPhotoConfirmation(true)
    },
    []
  )

  // Handle photo confirmation and start analysis
  const handleConfirmPhotoSearch = () => {
    if (!uploadedImage) {
      return
    }

    setShowPhotoConfirmation(false)
    setWasPhotoSearch(true)
    startStreamingAnalysis(uploadedImage, userPrompt.trim() || undefined)
  }

  // Handle manual search trigger
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    
    // Get the query from the form input directly (handles cases where React state wasn't synced)
    const formElement = e?.target as HTMLFormElement | undefined
    const inputElement = formElement?.querySelector('input') as HTMLInputElement | null
    const queryValue = inputElement?.value || searchQuery
    
    if (!queryValue && !uploadedImage) {
      toast.error('Please enter a search term or upload a photo')
      return
    }

    // Update searchQuery state if reading from DOM
    if (queryValue !== searchQuery) {
      setSearchQuery(queryValue)
    }

    // For text searches, also set userPrompt
    if (queryValue && !uploadedImage) {
      setUserPrompt(queryValue)
    }

    setWasPhotoSearch(!!uploadedImage) // Track if this search used an uploaded photo
    startStreamingAnalysis(uploadedImage || undefined, queryValue)
  }

  // Handle drag events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  // Build Google search URL for a product
  const buildGoogleSearchUrl = (make: string, model: string, type: string): string => {
    const searchTerms = [make, model, type].filter(Boolean).join(' ')
    return `https://www.google.com/search?q=${encodeURIComponent(searchTerms)}&tbm=shop`
  }

  // Handle result selection
  const handleSelectResult = (index: number) => {
    setSelectedIndex(index)
    const result = results[index]

    // Find matching category
    const matchedCategory = findMatchingCategory(result.type)

    // Track the selected result's image URL (use lazy-loaded image if available)
    const imageUrl = productImages[index] ?? result.image_url ?? null
    setSelectedImageUrl(imageUrl)

    // Pre-fill form
    setFormData({
      name: `${result.make} ${result.model}`.trim() || 'New Item',
      make: result.make || '',
      model: result.model || '',
      category_id: matchedCategory?.id,
    })
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      toast.error('Please enter a name for the item')
      return
    }
    createMutation.mutate(formData)
  }

  // Reset state
  const handleReset = () => {
    setAnalysisState('idle')
    setUploadedImage(null)
    setImagePreview(null)
    setSearchQuery('')
    setUserPrompt('')
    setShowPhotoConfirmation(false)
    setResults([])
    setSelectedIndex(null)
    setFormData({})
    setErrorMessage(null)
    setShowAllResults(false)
    setAgentMetadata(null)
    setShowAgentDetails(false)
    setProductImages({})
    setImageLoadingStates({})
  }

  // Retry analysis
  const handleRetry = () => {
    startStreamingAnalysis(uploadedImage || undefined, searchQuery)
  }

  // Try again with feedback that previous results were incorrect
  const handleTryAgainWithFeedback = () => {
    // Use userPrompt for photo searches, searchQuery for text searches
    const currentPrompt = wasPhotoSearch ? userPrompt : searchQuery
    const feedbackQuery = currentPrompt
      ? `${currentPrompt} - None of the previous results were correct. Please try again with different suggestions.`
      : 'None of the previous results were correct. Please try again with different suggestions.'
    
    startStreamingAnalysis(uploadedImage || undefined, feedbackQuery)
  }

  // Get consensus badge variant and label
  const getConsensusBadge = (consensus: ConsensusInfo | null) => {
    if (!consensus) return null
    
    const { level, agents_agreeing, total_agents } = consensus
    
    const variants: Record<string, { variant: 'success' | 'warning' | 'gray' | 'primary', label: string }> = {
      full: { variant: 'success', label: `${agents_agreeing}/${total_agents} agents agree` },
      majority: { variant: 'success', label: `${agents_agreeing}/${total_agents} agents agree` },
      partial: { variant: 'warning', label: `${agents_agreeing}/${total_agents} agents agree` },
      low: { variant: 'warning', label: `${agents_agreeing}/${total_agents} agents agree` },
      single: { variant: 'gray', label: '1 agent' },
      none: { variant: 'gray', label: 'No consensus' },
    }
    
    return variants[level] || variants.none
  }

  // Format agent names for display
  const formatAgentNames = (agents: string[]) => {
    return agents.map(a => AGENT_DISPLAY_NAMES[a] || a).join(', ')
  }

  const displayedResults = showAllResults ? results : results.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <Icon icon={Sparkles} size="lg" className="text-primary-600 dark:text-primary-400" />
          Smart Add
          <HelpTooltip position="right">
            Use AI to identify products from photos or text searches. Multiple AI agents work together for better accuracy. Select a result to create a new item.
          </HelpTooltip>
        </h1>
        <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">
          Search for a product or upload a photo and AI will identify it for you
        </p>
      </div>

      <div className="max-w-3xl">
        {/* Search and Upload Section */}
        {analysisState === 'idle' && (
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Icon icon={Search} size="sm" className="text-gray-400" />
                    </div>
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Enter make, model, or product name..."
                      className="pl-10"
                    />
                  </div>
                  <Button type="submit" isLoading={isStreamingAnalysis}>
                    Search
                  </Button>
                </form>
              </CardContent>
            </Card>

            <div className="relative">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-gray-200 dark:border-gray-800" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-gray-25 dark:bg-gray-900 text-sm text-gray-500">OR</span>
              </div>
            </div>

            <Card>
              <CardContent className="p-6 sm:p-12">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Camera button - shown on mobile devices, appears first (on top) */}
                  {isMobileDevice() && (
                    <button
                      type="button"
                      onClick={() => document.getElementById('camera-input')?.click()}
                      className={cn(
                        'flex flex-col items-center justify-center gap-3 py-8 sm:py-0 sm:px-8 border-2 border-dashed rounded-xl transition-colors',
                        'border-primary-300 dark:border-primary-700 bg-primary-50 dark:bg-primary-900/20 hover:border-primary-400 dark:hover:border-primary-600'
                      )}
                    >
                      <div className="w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <Icon icon={Camera} size="xl" className="text-primary-600 dark:text-primary-400" />
                      </div>
                      <span className="text-base font-medium text-primary-700 dark:text-primary-300">Take Photo</span>
                    </button>
                  )}
                  
                  {/* Upload area */}
                  <div
                    className={cn(
                      'flex-1 border-2 border-dashed rounded-xl p-8 sm:p-12 text-center transition-colors cursor-pointer',
                      isDragging
                        ? 'border-primary-400 dark:border-primary-600 bg-primary-50 dark:bg-primary-900/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                    )}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input')?.click()}
                  >
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Icon icon={Upload} size="xl" className="text-gray-400 dark:text-gray-500" />
                      </div>
                      <div>
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-50">
                          {isMobileDevice() ? 'Select from gallery' : 'Drop photo here or click to upload'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Supports JPG, PNG, WebP up to 10MB
                        </p>
                      </div>
                    </div>
                    <input
                      id="file-input"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleFileInputChange}
                    />
                  </div>
                </div>
                
                {/* Camera input - uses rear camera for object photos */}
                <input
                  id="camera-input"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Photo Confirmation Modal */}
        <Modal
          isOpen={showPhotoConfirmation && !!uploadedImage && !!imagePreview}
          onClose={() => {
            setShowPhotoConfirmation(false)
            setUploadedImage(null)
            setImagePreview(null)
            setUserPrompt('')
          }}
          title="Confirm Search"
          description="Add any additional context to help AI identify the product"
          size="md"
        >
          <div className="p-6 space-y-4">
            <div className="flex justify-center">
              <img
                src={imagePreview || ''}
                alt="Uploaded"
                className="w-64 h-64 object-contain rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
              />
            </div>

            <div>
              <Textarea
                label="Additional context (optional)"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="e.g., This is a refrigerator in my kitchen, model number might be on the back..."
                rows={3}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Provide any details that might help identify the product, such as location, visible features, or where to find the model number.
              </p>
            </div>
          </div>
          <ModalFooter>
            <Button
              variant="secondary"
              onClick={() => {
                setShowPhotoConfirmation(false)
                setUploadedImage(null)
                setImagePreview(null)
                setUserPrompt('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmPhotoSearch}>
              <Icon icon={Search} size="xs" />
              Search
            </Button>
          </ModalFooter>
        </Modal>

        {/* Analyzing State */}
        {analysisState === 'analyzing' && !showPhotoConfirmation && (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-6">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Uploaded"
                    className="w-48 h-48 object-cover rounded-lg shadow-lg"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Icon icon={Search} size="xl" className="text-gray-400" />
                  </div>
                )}
                
                {/* Progress header */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <Icon icon={Sparkles} size="md" className="text-primary-600 dark:text-primary-400 animate-pulse" />
                    <span className="text-lg font-medium text-gray-900 dark:text-gray-50">
                      {isSynthesizing ? 'Synthesizing results...' : uploadedImage ? 'Analyzing image...' : 'Searching for product...'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {searchQuery ? `Searching for "${searchQuery}"` : 'AI is identifying the product'}
                  </p>
                </div>

                {/* Overall progress bar */}
                {overallProgress.total > 0 && (
                  <div className="w-full max-w-xs">
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{overallProgress.completed}/{overallProgress.total} agents complete</span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary-500 transition-all duration-300 ease-out"
                        style={{ width: `${(overallProgress.completed / overallProgress.total) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Individual agent status */}
                {agentProgress.length > 0 ? (
                  <div className="w-full max-w-sm space-y-2">
                    {agentProgress.map((agent) => (
                      <div 
                        key={agent.name} 
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-colors',
                          agent.status === 'complete' && 'bg-success-50 dark:bg-success-900/20 border-success-200 dark:border-success-800',
                          agent.status === 'error' && 'bg-error-50 dark:bg-error-900/20 border-error-200 dark:border-error-800',
                          agent.status === 'running' && 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800',
                          agent.status === 'pending' && 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        )}
                      >
                        {/* Status icon */}
                        {agent.status === 'pending' && (
                          <Icon icon={Circle} size="sm" className="text-gray-400" />
                        )}
                        {agent.status === 'running' && (
                          <Icon icon={Loader2} size="sm" className="text-primary-500 animate-spin" />
                        )}
                        {agent.status === 'complete' && (
                          <Icon icon={CheckCircle} size="sm" className="text-success-500" />
                        )}
                        {agent.status === 'error' && (
                          <Icon icon={XCircle} size="sm" className="text-error-500" />
                        )}
                        
                        {/* Agent name */}
                        <span className={cn(
                          'flex-1 font-medium',
                          agent.status === 'complete' && 'text-success-700 dark:text-success-300',
                          agent.status === 'error' && 'text-error-700 dark:text-error-300',
                          agent.status === 'running' && 'text-primary-700 dark:text-primary-300',
                          agent.status === 'pending' && 'text-gray-500 dark:text-gray-400'
                        )}>
                          {agent.displayName}
                        </span>
                        
                        {/* Duration */}
                        {agent.duration_ms !== undefined && agent.status !== 'pending' && (
                          <span className="text-xs text-gray-400">
                            {(agent.duration_ms / 1000).toFixed(1)}s
                          </span>
                        )}
                        
                        {/* Status text for running/error */}
                        {agent.status === 'running' && (
                          <span className="text-xs text-primary-500 animate-pulse">Analyzing...</span>
                        )}
                        {agent.status === 'error' && agent.error && (
                          <span className="text-xs text-error-500 truncate max-w-[100px]" title={agent.error}>
                            Failed
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Fallback: show static agent placeholders if no progress yet */
                  <div className="flex flex-col items-center gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <Icon icon={Users} size="xs" />
                      <span>Querying AI agents...</span>
                    </div>
                    <div className="flex gap-2">
                      {['claude', 'openai', 'gemini'].map((agent) => (
                        <div
                          key={agent}
                          className="px-2 py-1 text-xs rounded bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 animate-pulse"
                        >
                          {AGENT_DISPLAY_NAMES[agent]}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synthesis indicator */}
                {isSynthesizing && (
                  <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400">
                    <Icon icon={Sparkles} size="sm" className="animate-pulse" />
                    <span>Combining results from all agents...</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {analysisState === 'error' && (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Uploaded"
                    className="w-48 h-48 object-cover rounded-lg opacity-75"
                  />
                ) : (
                  <div className="w-48 h-48 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center opacity-75">
                    <Icon icon={Search} size="xl" className="text-gray-400" />
                  </div>
                )}
                <div className="flex items-center gap-2 text-red-600">
                  <Icon icon={AlertCircle} size="md" />
                  <span className="font-medium">Analysis Failed</span>
                </div>
                <p className="text-sm text-gray-500 text-center max-w-md">{errorMessage}</p>
                
                {/* Agent status details on error */}
                {agentMetadata && agentMetadata.agents_used.length > 0 && (
                  <div className="w-full max-w-md mt-2">
                    <button
                      onClick={() => setShowAgentDetails(!showAgentDetails)}
                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1 mx-auto"
                    >
                      <Icon icon={showAgentDetails ? ChevronUp : ChevronDown} size="xs" />
                      {showAgentDetails ? 'Hide' : 'Show'} agent details
                    </button>
                    {showAgentDetails && (
                      <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-xs space-y-2">
                        {agentMetadata.agents_used.map((agent) => {
                          const detail = agentMetadata.agent_details[agent]
                          return (
                            <div key={agent} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {detail?.success ? (
                                  <Icon icon={CheckCircle} size="xs" className="text-success-500" />
                                ) : (
                                  <Icon icon={XCircle} size="xs" className="text-error-500" />
                                )}
                                <span className="font-medium">{AGENT_DISPLAY_NAMES[agent] || agent}</span>
                              </div>
                              <div className="text-gray-400">
                                {detail?.duration_ms ? `${(detail.duration_ms / 1000).toFixed(1)}s` : '-'}
                              </div>
                            </div>
                          )
                        })}
                        {agentMetadata.synthesis_error && (
                          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 text-error-500">
                            Synthesis error: {agentMetadata.synthesis_error}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={handleReset}>
                    Try Again
                  </Button>
                  <Button onClick={handleRetry}>
                    <Icon icon={RefreshCw} size="xs" /> Retry
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results State */}
        {analysisState === 'results' && (
          <div className="space-y-6">
            {/* Agent Info Banner */}
            {agentMetadata && agentMetadata.agents_used.length > 0 && (
              <div className="px-4 py-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Icon icon={Users} size="sm" className="text-primary-600 dark:text-primary-400" />
                      <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                        {formatAgentNames(agentMetadata.agents_used)}
                      </span>
                    </div>
                    {agentMetadata.consensus && (
                      <Badge 
                        size="sm" 
                        variant={getConsensusBadge(agentMetadata.consensus)?.variant || 'gray'}
                      >
                        {getConsensusBadge(agentMetadata.consensus)?.label}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {agentMetadata.total_duration_ms > 0 && (
                      <div className="flex items-center gap-1 text-xs text-primary-500 dark:text-primary-400">
                        <Icon icon={Zap} size="xs" />
                        <span>{(agentMetadata.total_duration_ms / 1000).toFixed(1)}s</span>
                      </div>
                    )}
                    <button
                      onClick={() => setShowAgentDetails(!showAgentDetails)}
                      className="text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-300"
                    >
                      {showAgentDetails ? 'Hide details' : 'Details'}
                    </button>
                  </div>
                </div>
                
                {/* Expandable agent details */}
                {showAgentDetails && (
                  <div className="mt-3 pt-3 border-t border-primary-200 dark:border-primary-800 space-y-2">
                    {agentMetadata.agents_used.map((agent) => {
                      const detail = agentMetadata.agent_details[agent]
                      const error = agentMetadata.agent_errors[agent]
                      return (
                        <div key={agent} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            {detail?.success ? (
                              <Icon icon={CheckCircle} size="xs" className="text-success-500" />
                            ) : (
                              <Icon icon={XCircle} size="xs" className="text-error-500" />
                            )}
                            <span className="font-medium text-primary-700 dark:text-primary-300">
                              {AGENT_DISPLAY_NAMES[agent] || agent}
                            </span>
                            {error && (
                              <span className="text-error-500 truncate max-w-[200px]" title={error}>
                                {error}
                              </span>
                            )}
                          </div>
                          <div className="text-primary-400">
                            {detail?.duration_ms ? `${(detail.duration_ms / 1000).toFixed(1)}s` : '-'}
                          </div>
                        </div>
                      )
                    })}
                    {agentMetadata.parse_source && (
                      <div className="text-xs text-primary-400 pt-1">
                        Results from: {agentMetadata.parse_source === 'synthesized' ? 'AI synthesis' : 'individual agents'}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Image/Query and Results Side by Side */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Context Card */}
              <Card>
                <CardContent className="p-4">
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      alt="Uploaded"
                      className="w-full h-64 object-contain rounded-lg bg-gray-50"
                    />
                  ) : (
                    <div className="w-full h-64 rounded-lg bg-gray-50 dark:bg-gray-800 flex flex-col items-center justify-center p-6 text-center">
                      <Icon icon={Search} size="xl" className="text-gray-300 dark:text-gray-600 mb-4" />
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-50">Search for</p>
                      <p className="text-lg font-semibold text-primary-600 dark:text-primary-400 break-words w-full">
                        "{searchQuery}"
                      </p>
                    </div>
                  )}
                  <Button
                    variant="secondary"
                    size="sm"
                    className="w-full mt-4"
                    onClick={handleReset}
                  >
                    New Search / Photo
                  </Button>
                </CardContent>
              </Card>

              {/* Results List */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-50">
                      Results ({results.length} found)
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {displayedResults.map((result, index) => (
                      <button
                        key={index}
                        onClick={() => handleSelectResult(index)}
                        className={cn(
                          'w-full text-left p-3 rounded-lg border-2 transition-colors',
                          selectedIndex === index
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/10'
                            : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          {/* Product Image with lazy loading */}
                          <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 relative">
                            {imageLoadingStates[index] ? (
                              <div className="w-full h-full animate-pulse bg-gray-200 dark:bg-gray-700" />
                            ) : (productImages[index] || result.image_url) ? (
                              <img
                                src={productImages[index] || result.image_url || ''}
                                alt={`${result.make} ${result.model}`}
                                className="w-full h-full object-cover"
                                onError={() => {
                                  // Remove failed image from state
                                  setProductImages(prev => ({ ...prev, [index]: null }))
                                }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex flex-col items-center justify-center group relative">
                                <span className="text-white font-bold text-xl mb-0.5">
                                  {(result.make || result.model || '?').substring(0, 2).toUpperCase()}
                                </span>
                                <a
                                  href={buildGoogleSearchUrl(result.make, result.model, result.type)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center bg-black/20 rounded-lg"
                                  title="Search on Google to verify product"
                                >
                                  <Icon icon={ExternalLink} size="sm" className="text-white" />
                                </a>
                              </div>
                            )}
                          </div>
                          {/* Radio button */}
                          <div
                            className={cn(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                              selectedIndex === index
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}
                          >
                            {selectedIndex === index && (
                              <Icon icon={Check} size="xs" className="text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 dark:text-gray-50">
                              {result.make}{result.model ? ` ${result.model}` : ''}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge size="sm" variant="gray">
                                {result.type}
                              </Badge>
                              {result.confidence && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(result.confidence * 100)}% match
                                </span>
                              )}
                              {result.agents_agreed && result.agents_agreed > 1 && (
                                <span className="text-xs text-success-600 dark:text-success-400 flex items-center gap-1">
                                  <Icon icon={Users} size="xs" />
                                  {result.agents_agreed} agree
                                </span>
                              )}
                              {result.source_agent && (
                                <span className="text-xs text-gray-400">
                                  via {AGENT_DISPLAY_NAMES[result.source_agent] || result.source_agent}
                                </span>
                              )}
                              {/* Google search link when no image available */}
                              {!productImages[index] && !result.image_url && !imageLoadingStates[index] && (
                                <a
                                  href={buildGoogleSearchUrl(result.make, result.model, result.type)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1 transition-colors"
                                  title="Search on Google to verify product"
                                >
                                  <Icon icon={ExternalLink} size="xs" />
                                  Verify on Google
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>

                  {results.length > 5 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => setShowAllResults(!showAllResults)}
                    >
                      <Icon icon={showAllResults ? ChevronUp : ChevronDown} size="xs" />
                      {showAllResults ? 'Show Less' : `See More (${results.length - 5} more)`}
                    </Button>
                  )}

                  {/* Context input and Try Again button - shown when no result is selected */}
                  {selectedIndex === null && results.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Textarea
                          label="Search context"
                          value={userPrompt || searchQuery || ''}
                          onChange={(e) => {
                            // Update the appropriate state based on search type
                            if (wasPhotoSearch) {
                              setUserPrompt(e.target.value)
                            } else {
                              setSearchQuery(e.target.value)
                              setUserPrompt(e.target.value)
                            }
                          }}
                          placeholder="Add or edit context to help AI find the product..."
                          rows={2}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Edit the search context to refine your search results
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        onClick={handleTryAgainWithFeedback}
                        disabled={isStreamingAnalysis}
                      >
                        <Icon icon={RefreshCw} size="xs" />
                        {isStreamingAnalysis ? 'Searching...' : 'Try Again'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Inline Form */}
            {selectedIndex !== null && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-medium text-gray-900 dark:text-gray-50 mb-4">Item Details</h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      label="Name"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Living Room AC Unit"
                      required
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Make"
                        value={formData.make || ''}
                        onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                        placeholder="e.g., Carrier"
                      />
                      <Input
                        label="Model"
                        value={formData.model || ''}
                        onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                        placeholder="e.g., 24ACC636A003"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <Select
                        label="Category"
                        options={[
                          { value: '', label: 'Select a category' },
                          ...allCategories.map((c) => ({ value: c.id, label: c.name })),
                        ]}
                        value={formData.category_id || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            category_id: Number(e.target.value) || undefined,
                          })
                        }
                      />
                      <Select
                        label="Location"
                        options={[
                          { value: '', label: 'Select a location' },
                          ...allLocations.map((l) => ({ value: l.id, label: l.name })),
                        ]}
                        value={formData.location_id || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            location_id: Number(e.target.value) || undefined,
                          })
                        }
                      />
                    </div>

                    <Input
                      label="Install Date"
                      type="date"
                      value={formData.install_date || ''}
                      onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
                    />

                    <Textarea
                      label="Notes"
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes..."
                      rows={3}
                    />

                    <div className="pt-4 border-t border-gray-200 space-y-3">
                      {(wasPhotoSearch || selectedImageUrl) && (
                        <Checkbox
                          id="attach-photo"
                          checked={attachPhoto}
                          onChange={(e) => setAttachPhoto(e.target.checked)}
                          label={
                            wasPhotoSearch
                              ? 'Attach uploaded photo as featured image'
                              : 'Download product image as featured image'
                          }
                        />
                      )}
                      <Checkbox
                        id="search-manual"
                        checked={searchManual}
                        onChange={(e) => setSearchManual(e.target.checked)}
                        label="Search for and download product manual (PDF)"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button type="button" variant="secondary" onClick={handleReset}>
                        Cancel
                      </Button>
                      <Button type="submit" isLoading={createMutation.isPending || isSearchingManual}>
                        <Icon icon={Sparkles} size="xs" />
                        {isSearchingManual ? 'Searching for manual...' : 'Create Item'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
