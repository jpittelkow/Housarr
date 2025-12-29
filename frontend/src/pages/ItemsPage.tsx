import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Link } from 'react-router-dom'
import { items, categories, locations } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate } from '@/lib/utils'
import { Icon, Plus, Search, Package, MapPin, Calendar, HelpTooltip, LayoutGrid, List, Building } from '@/components/ui'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { Item } from '@/types'

function ItemCardSkeleton() {
  return (
    <Card>
      <div className="aspect-[4/3] bg-gray-100 dark:bg-gray-800 animate-pulse rounded-t-xl" />
      <CardContent className="py-4">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ItemListSkeleton() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-gray-800 animate-pulse">
      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-2" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-32" />
      </div>
      <div className="hidden sm:flex items-center gap-6">
        <div className="h-5 bg-gray-100 dark:bg-gray-800 rounded-full w-20" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
        <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-24" />
      </div>
    </div>
  )
}

// Virtualized list row component - memoized for performance
const VirtualizedItemRow = ({ item }: { item: Item }) => (
  <Link
    to={`/items/${item.id}`}
    className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-100 dark:border-gray-800"
  >
    {/* Thumbnail */}
    <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
      {item.featured_image ? (
        <img
          src={item.featured_image.url}
          alt={item.name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon icon={Package} size="sm" className="text-gray-300 dark:text-gray-600" />
        </div>
      )}
    </div>

    {/* Content */}
    <div className="flex-1 min-w-0">
      <h3 className="font-medium text-gray-900 dark:text-gray-50 truncate">{item.name}</h3>
      {(item.make || item.model) && (
        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
          {[item.make, item.model].filter(Boolean).join(' ')}
        </p>
      )}
    </div>

    {/* Category Badge */}
    {item.category && (
      <Badge
        size="sm"
        className="hidden sm:inline-flex flex-shrink-0"
        style={{
          backgroundColor: `${item.category.color}20`,
          color: item.category.color ?? undefined
        }}
      >
        {item.category.name}
      </Badge>
    )}

    {/* Vendor */}
    {item.vendor && (
      <span
        className="hidden md:flex items-center gap-1 text-sm text-primary-600 flex-shrink-0"
      >
        <Icon icon={Building} size="xs" />
        <span className="truncate max-w-[100px]">{item.vendor.name}</span>
      </span>
    )}

    {/* Location */}
    {(item.location_obj || item.location) && (
      <div className="hidden lg:flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
        <Icon icon={MapPin} size="xs" className="text-gray-400" />
        <span className="truncate max-w-[100px]">{item.location_obj?.name || item.location}</span>
      </div>
    )}

    {/* Install Date */}
    {item.install_date && (
      <div className="hidden sm:flex items-center gap-1 text-sm text-gray-500 flex-shrink-0">
        <Icon icon={Calendar} size="xs" className="text-gray-400" />
        <span>{formatDate(item.install_date)}</span>
      </div>
    )}
  </Link>
)

// Virtualized list component for large datasets
function VirtualizedItemList({ items: itemsList }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: itemsList.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60, // Estimated row height
    overscan: 5, // Render 5 extra rows above/below for smoother scrolling
  })

  return (
    <Card>
      <div
        ref={parentRef}
        className="max-h-[calc(100vh-300px)] overflow-auto"
        style={{ contain: 'strict' }}
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = itemsList[virtualRow.index]
            return (
              <div
                key={item.id}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <VirtualizedItemRow item={item} />
              </div>
            )
          })}
        </div>
      </div>
    </Card>
  )
}

// Custom hook for debounced value
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export default function ItemsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Item>>({})
  const queryClient = useQueryClient()

  // Debounce search to avoid API calls on every keystroke
  const debouncedSearch = useDebounce(search, 300)

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', { search: debouncedSearch, category_id: categoryFilter }],
    queryFn: () =>
      items.list({
        search: debouncedSearch || undefined,
        category_id: categoryFilter ? Number(categoryFilter) : undefined,
      }),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Item>) => items.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] })
      setIsModalOpen(false)
      setFormData({})
      toast.success('Item created successfully')
    },
    onError: () => {
      toast.error('Failed to create item')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const allItems = itemsData?.items || []
  const allCategories = categoriesData?.categories || []
  const allLocations = locationsData?.locations || []

  return (
    <div className="space-y-6">
      {/* Page Header - Untitled UI style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            Items
            <HelpTooltip position="right">
              Track everything in your home: appliances, furniture, electronics, and more. Add photos, receipts, and warranty info.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Manage your home appliances and systems</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Icon icon={Plus} size="xs" /> Add Item
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start">
        <div className="w-full sm:flex-1">
          <Input
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={<Icon icon={Search} size="xs" />}
          />
        </div>
        <div className="w-full sm:w-auto">
          <Select
            options={[
              { value: '', label: 'All Categories' },
              ...allCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="sm:w-48"
          />
        </div>
        {/* View Toggle */}
        <div className="flex rounded-lg border border-gray-300 dark:border-gray-700 p-1 bg-white dark:bg-gray-800">
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
            title="Grid view"
          >
            <Icon icon={LayoutGrid} size="xs" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-50'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            )}
            title="List view"
          >
            <Icon icon={List} size="xs" />
          </button>
        </div>
      </div>

      {/* Items */}
      {isLoading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <ItemCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Card>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ItemListSkeleton key={i} />
            ))}
          </Card>
        )
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={<Icon icon={Package} size="xl" />}
          title="No items yet"
          description="Add your first item to start tracking your home appliances and systems."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Icon icon={Plus} size="xs" /> Add Item
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allItems.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`}>
              <Card hover className="h-full overflow-hidden group">
                {/* Image Section */}
                <div className="aspect-[4/3] relative bg-gray-100 dark:bg-gray-800 overflow-hidden">
                  {item.featured_image ? (
                    <img
                      src={item.featured_image.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
                      <Icon icon={Package} size="xl" className="text-gray-300 dark:text-gray-600" />
                    </div>
                  )}
                  {/* Category Badge Overlay */}
                  {item.category && (
                    <div className="absolute top-3 left-3">
                      <Badge
                        size="sm"
                        style={{
                          backgroundColor: item.category.color ? `${item.category.color}` : undefined,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}
                      >
                        {item.category.name}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <CardContent className="py-4">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-50 mb-1 line-clamp-1">{item.name}</h3>
                  {(item.make || item.model) && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-1">
                      {[item.make, item.model].filter(Boolean).join(' ')}
                    </p>
                  )}

                  {/* Vendor */}
                  {item.vendor && (
                    <Link
                      to="/vendors"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline mb-2"
                    >
                      <Icon icon={Building} size="xs" />
                      <span className="truncate max-w-[120px]">{item.vendor.name}</span>
                    </Link>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    {(item.location_obj || item.location) && (
                      <div className="flex items-center gap-1">
                        <Icon icon={MapPin} size="xs" className="text-gray-400 dark:text-gray-500" />
                        <span className="truncate max-w-[100px]">{item.location_obj?.name || item.location}</span>
                      </div>
                    )}
                    {item.install_date && (
                      <div className="flex items-center gap-1">
                        <Icon icon={Calendar} size="xs" className="text-gray-400 dark:text-gray-500" />
                        <span>{formatDate(item.install_date)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        /* List View - Virtualized for large datasets */
        <VirtualizedItemList items={allItems} />
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Item"
        description="Add a new appliance or system to track"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., Central AC Unit"
            required
          />

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select a category' },
              ...allCategories.map((c) => ({ value: c.id.toString(), label: c.name })),
            ]}
            value={formData.category_id?.toString() || ''}
            onChange={(e) => setFormData({ ...formData, category_id: Number(e.target.value) || undefined })}
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

          <Select
            label="Location"
            options={[
              { value: '', label: 'Select a location' },
              ...allLocations.map((l) => ({ value: l.id.toString(), label: l.name })),
            ]}
            value={formData.location_id?.toString() || ''}
            onChange={(e) => setFormData({ ...formData, location_id: Number(e.target.value) || undefined })}
          />

          <Input
            label="Install Date"
            type="date"
            value={formData.install_date || ''}
            onChange={(e) => setFormData({ ...formData, install_date: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Item
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
