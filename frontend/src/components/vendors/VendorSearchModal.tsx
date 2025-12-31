import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendors, categories, type VendorSearchResult } from '@/services/api'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Icon, Search, Plus, Phone, Mail, Globe, MapPin, Loader2, AlertCircle, CheckCircle, Sparkles } from '@/components/ui'
import { toast } from 'sonner'

interface VendorSearchModalProps {
  isOpen: boolean
  onClose: () => void
}

export function VendorSearchModal({ isOpen, onClose }: VendorSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>()
  const [addedVendors, setAddedVendors] = useState<Set<string>>(new Set())
  const queryClient = useQueryClient()

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const searchMutation = useMutation({
    mutationFn: () => vendors.searchNearby(searchQuery, selectedCategory),
    onError: (error: Error & { response?: { data?: { error?: string } } }) => {
      const message = error.response?.data?.error || 'Failed to search for vendors'
      toast.error(message)
    },
  })

  const addVendorMutation = useMutation({
    mutationFn: (vendor: VendorSearchResult) => vendors.create({
      name: vendor.name,
      company: vendor.company,
      phone: vendor.phone,
      email: vendor.email,
      website: vendor.website,
      address: vendor.address,
      notes: vendor.notes,
      category_id: selectedCategory,
    }),
    onSuccess: (_, vendor) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setAddedVendors(prev => new Set([...prev, vendor.name]))
      toast.success(`${vendor.name} added to your vendors`)
    },
    onError: () => {
      toast.error('Failed to add vendor')
    },
  })

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim().length < 2) {
      toast.error('Please enter at least 2 characters to search')
      return
    }
    searchMutation.mutate()
  }

  const handleClose = () => {
    setSearchQuery('')
    setSelectedCategory(undefined)
    setAddedVendors(new Set())
    searchMutation.reset()
    onClose()
  }

  const allCategories = categoriesData?.categories || []
  const results = searchMutation.data?.vendors || []

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Find Local Vendors"
      description="Search for service providers near your household using AI"
      size="lg"
    >
      <div className="p-6 space-y-6">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4">
          <Input
            label="What are you looking for?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="e.g., HVAC repair, plumber, electrician, lawn care..."
            icon={<Icon icon={Search} size="xs" />}
          />

          <Select
            label="Category (optional)"
            options={[
              { value: '', label: 'All categories' },
              ...allCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : undefined)}
          />

          <Button 
            type="submit" 
            isLoading={searchMutation.isPending}
            disabled={searchQuery.trim().length < 2}
            className="w-full"
          >
            <Icon icon={Sparkles} size="xs" /> Search with AI
          </Button>
        </form>

        {/* Loading State */}
        {searchMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <Icon icon={Loader2} size="lg" className="animate-spin mb-3" />
            <p className="text-sm">Searching for vendors near you...</p>
            <p className="text-xs mt-1">This may take a few seconds</p>
          </div>
        )}

        {/* Error State */}
        {searchMutation.isError && (
          <div className="flex items-center gap-3 p-4 bg-error-50 dark:bg-error-900/20 rounded-lg border border-error-200 dark:border-error-800">
            <Icon icon={AlertCircle} size="sm" className="text-error-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-error-700 dark:text-error-400">Search failed</p>
              <p className="text-xs text-error-600 dark:text-error-500">
                {(searchMutation.error as Error & { response?: { data?: { error?: string } } })?.response?.data?.error || 'Please try again'}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {searchMutation.isSuccess && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {results.length === 0 
                  ? 'No vendors found' 
                  : `Found ${results.length} vendor${results.length === 1 ? '' : 's'}`}
              </h3>
              {searchMutation.data?.agents_used && (
                <Badge variant="gray" size="sm">
                  AI: {searchMutation.data.agents_used.join(', ')}
                </Badge>
              )}
            </div>

            {results.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">Try a different search term or category</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {results.map((vendor, index) => {
                  const isAdded = addedVendors.has(vendor.name)
                  return (
                    <Card key={index} className={isAdded ? 'opacity-60' : ''}>
                      <CardContent className="py-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {vendor.name}
                            </h4>
                            {vendor.company && vendor.company !== vendor.name && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {vendor.company}
                              </p>
                            )}

                            <div className="mt-2 space-y-1 text-sm">
                              {vendor.phone && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon icon={Phone} size="xs" className="text-gray-400" />
                                  {vendor.phone}
                                </div>
                              )}
                              {vendor.email && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon icon={Mail} size="xs" className="text-gray-400" />
                                  <span className="truncate">{vendor.email}</span>
                                </div>
                              )}
                              {vendor.website && (
                                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon icon={Globe} size="xs" className="text-gray-400" />
                                  <a
                                    href={vendor.website}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="truncate hover:text-primary-600 dark:hover:text-primary-400"
                                  >
                                    {vendor.website.replace(/^https?:\/\//, '')}
                                  </a>
                                </div>
                              )}
                              {vendor.address && (
                                <div className="flex items-start gap-2 text-gray-600 dark:text-gray-300">
                                  <Icon icon={MapPin} size="xs" className="text-gray-400 mt-0.5 flex-shrink-0" />
                                  <span className="line-clamp-2">{vendor.address}</span>
                                </div>
                              )}
                            </div>

                            {vendor.notes && (
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                {vendor.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex-shrink-0">
                            {isAdded ? (
                              <div className="flex items-center gap-1 text-success-600 dark:text-success-400">
                                <Icon icon={CheckCircle} size="xs" />
                                <span className="text-xs">Added</span>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => addVendorMutation.mutate(vendor)}
                                isLoading={addVendorMutation.isPending && addVendorMutation.variables?.name === vendor.name}
                              >
                                <Icon icon={Plus} size="xs" /> Add
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}

            {searchMutation.data?.total_duration_ms && (
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
                Search completed in {(searchMutation.data.total_duration_ms / 1000).toFixed(1)}s
              </p>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
