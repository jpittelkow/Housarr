import { useState, useCallback } from 'react'
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
} from '@/components/ui'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Item, Category } from '@/types'

// Type for AI analysis results
interface AnalysisResult {
  make: string
  model: string
  type: string
  confidence: number
}

type AnalysisState = 'idle' | 'uploading' | 'analyzing' | 'results' | 'error'

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

  // Queries
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
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

  // Analyze image mutation
  const analyzeMutation = useMutation({
    mutationFn: ({ file, query }: { file?: File; query?: string }) =>
      items.analyzeImage(file, query, allCategories.map(c => c.name)),
    onSuccess: (data) => {
      if (data.results && data.results.length > 0) {
        setResults(data.results)
        setAnalysisState('results')
      } else {
        setErrorMessage('Could not identify the product. Try a different search or clearer photo.')
        setAnalysisState('error')
      }
    },
    onError: (error: Error) => {
      setErrorMessage(error.message)
      setAnalysisState('error')
    },
  })

  // Create item mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<Item>) => items.create(data),
    onSuccess: async (data) => {
      const newItem = data.item

      // Upload photo if checkbox is checked
      if (attachPhoto && uploadedImage && newItem?.id) {
        try {
          await files.upload(uploadedImage, 'item', newItem.id, true)
        } catch {
          toast.error('Item created but failed to attach photo')
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
      toast.success('Item created successfully!')
      navigate(`/items/${newItem.id}`)
    },
    onError: () => {
      toast.error('Failed to create item')
    },
  })

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

      // Start analysis immediately if image is dropped/selected
      setAnalysisState('analyzing')
      analyzeMutation.mutate({ file, query: searchQuery })
    },
    [analyzeMutation, searchQuery]
  )

  // Handle manual search trigger
  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!searchQuery && !uploadedImage) {
      toast.error('Please enter a search term or upload a photo')
      return
    }

    setResults([])
    setSelectedIndex(null)
    setFormData({})
    setErrorMessage(null)
    setShowAllResults(false)
    setAnalysisState('analyzing')
    analyzeMutation.mutate({ file: uploadedImage || undefined, query: searchQuery })
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

  // Handle result selection
  const handleSelectResult = (index: number) => {
    setSelectedIndex(index)
    const result = results[index]

    // Find matching category
    const matchedCategory = findMatchingCategory(result.type)

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
    setResults([])
    setSelectedIndex(null)
    setFormData({})
    setErrorMessage(null)
    setShowAllResults(false)
  }

  // Retry analysis
  const handleRetry = () => {
    setErrorMessage(null)
    setAnalysisState('analyzing')
    analyzeMutation.mutate({ file: uploadedImage || undefined, query: searchQuery })
  }

  const displayedResults = showAllResults ? results : results.slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
          <Icon icon={Sparkles} size="lg" className="text-primary-600 dark:text-primary-400" />
          Smart Add
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
                  <Button type="submit" isLoading={analyzeMutation.isPending}>
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
              <CardContent className="p-12">
                <div
                  className={cn(
                    'border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer',
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
                        Drop photo here or click to upload
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
              </CardContent>
            </Card>
          </div>
        )}

        {/* Analyzing State */}
        {analysisState === 'analyzing' && (
          <Card>
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4">
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
                <div className="flex items-center gap-3">
                  <Icon icon={Sparkles} size="md" className="text-primary-600 dark:text-primary-400 animate-pulse" />
                  <span className="text-lg font-medium text-gray-900 dark:text-gray-50">
                    {uploadedImage ? 'Analyzing image...' : 'Searching for product...'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {searchQuery ? `Searching for "${searchQuery}"` : 'AI is identifying the product'}
                </p>
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
                <p className="text-sm text-gray-500 text-center">{errorMessage}</p>
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
                              {result.make} {result.model}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge size="sm" variant="gray">
                                {result.type}
                              </Badge>
                              {result.confidence && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {Math.round(result.confidence * 100)}% match
                                </span>
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
                      <Checkbox
                        id="attach-photo"
                        checked={attachPhoto}
                        onChange={(e) => setAttachPhoto(e.target.checked)}
                        label="Attach uploaded photo as featured image"
                      />
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
