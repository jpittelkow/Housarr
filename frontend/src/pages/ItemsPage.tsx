import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Icon, Plus, Search, Package, MapPin, Calendar, HelpTooltip } from '@/components/ui'
import toast from 'react-hot-toast'
import type { Item } from '@/types'

function ItemSkeleton() {
  return (
    <Card>
      <div className="aspect-[4/3] bg-gray-100 animate-pulse rounded-t-xl" />
      <CardContent className="py-4">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-2">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="h-5 bg-gray-100 rounded-full w-16" />
            <div className="h-4 bg-gray-100 rounded w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function ItemsPage() {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Item>>({})
  const queryClient = useQueryClient()

  const { data: itemsData, isLoading } = useQuery({
    queryKey: ['items', { search, category_id: categoryFilter }],
    queryFn: () =>
      items.list({
        search: search || undefined,
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 flex items-center gap-2">
            Items
            <HelpTooltip position="right">
              Track everything in your home: appliances, furniture, electronics, and more. Add photos, receipts, and warranty info.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 mt-1">Manage your home appliances and systems</p>
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
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <ItemSkeleton key={i} />
          ))}
        </div>
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {allItems.map((item) => (
            <Link key={item.id} to={`/items/${item.id}`}>
              <Card hover className="h-full overflow-hidden group">
                {/* Image Section */}
                <div className="aspect-[4/3] relative bg-gray-100 overflow-hidden">
                  {item.featured_image ? (
                    <img
                      src={item.featured_image.url}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                      <Icon icon={Package} size="xl" className="text-gray-300" />
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
                  <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.name}</h3>
                  {(item.make || item.model) && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-1">
                      {[item.make, item.model].filter(Boolean).join(' ')}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {(item.location_obj || item.location) && (
                      <div className="flex items-center gap-1">
                        <Icon icon={MapPin} size="xs" className="text-gray-400" />
                        <span className="truncate max-w-[100px]">{item.location_obj?.name || item.location}</span>
                      </div>
                    )}
                    {item.install_date && (
                      <div className="flex items-center gap-1">
                        <Icon icon={Calendar} size="xs" className="text-gray-400" />
                        <span>{formatDate(item.install_date)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
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
              ...allCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={formData.category_id || ''}
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
              ...allLocations.map((l) => ({ value: l.id, label: l.name })),
            ]}
            value={formData.location_id || ''}
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
