import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { vendors, categories } from '@/services/api'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { ImageUpload } from '@/components/ui/ImageUpload'
import { Icon, Plus, Users, Phone, Mail, Globe, MapPin, Pencil, Trash2, HelpTooltip, AddressInput, Search } from '@/components/ui'
import { VendorSearchModal } from '@/components/vendors'
import { toast } from 'sonner'
import type { Vendor } from '@/types'

function VendorSkeleton() {
  return (
    <Card>
      <CardContent className="py-5">
        <div className="animate-pulse">
          <div className="flex items-start justify-between mb-3">
            <div className="space-y-2">
              <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-32" />
              <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-40" />
            </div>
            <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded-full w-16" />
          </div>
          <div className="space-y-2 mt-4">
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-28" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-36" />
            <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded w-20" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function VendorsPage() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false)
  const [formData, setFormData] = useState<Partial<Vendor>>({})
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const queryClient = useQueryClient()

  const { data: vendorsData, isLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendors.list(),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const createMutation = useMutation({
    mutationFn: (data: Partial<Vendor>) => vendors.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setIsModalOpen(false)
      setFormData({})
      toast.success('Vendor added successfully')
    },
    onError: () => {
      toast.error('Failed to add vendor')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Vendor> }) => vendors.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setEditingVendor(null)
      toast.success('Vendor updated')
    },
    onError: () => {
      toast.error('Failed to update vendor')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendors.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.success('Vendor deleted')
    },
    onError: () => {
      toast.error('Failed to delete vendor')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(formData)
  }

  const allVendors = vendorsData?.vendors || []
  const allCategories = categoriesData?.categories || []

  return (
    <div className="space-y-6">
      {/* Page Header - Untitled UI style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50 flex items-center gap-2">
            Vendors
            <HelpTooltip position="right">
              Keep track of contractors, repair services, and suppliers. Store contact info, specialties, and link vendors to items.
            </HelpTooltip>
          </h1>
          <p className="text-text-md text-gray-500 dark:text-gray-400 mt-1">Your address book for service providers</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setIsSearchModalOpen(true)}>
            <Icon icon={Search} size="xs" /> Find Nearby
          </Button>
          <Button onClick={() => setIsModalOpen(true)}>
            <Icon icon={Plus} size="xs" /> Add Vendor
          </Button>
        </div>
      </div>

      {/* Vendors Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <VendorSkeleton key={i} />
          ))}
        </div>
      ) : allVendors.length === 0 ? (
        <EmptyState
          icon={<Icon icon={Users} size="xl" />}
          title="No vendors yet"
          description="Add your preferred service providers to keep their info handy."
          action={
            <Button onClick={() => setIsModalOpen(true)}>
              <Icon icon={Plus} size="xs" /> Add Vendor
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allVendors.map((vendor) => (
            <Card key={vendor.id} hover>
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {vendor.logo ? (
                      <img
                        src={vendor.logo.url}
                        alt={vendor.name}
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <Icon icon={Users} size="sm" className="text-gray-400 dark:text-gray-500" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-50">{vendor.name}</h3>
                      {vendor.company && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">{vendor.company}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.category && (
                      <Badge style={{ backgroundColor: `${vendor.category.color}20`, color: vendor.category.color ?? undefined }}>
                        {vendor.category.name}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingVendor(vendor)}
                    >
                      <Icon icon={Pencil} size="xs" className="text-gray-400 dark:text-gray-500" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this vendor?')) {
                          deleteMutation.mutate(vendor.id)
                        }
                      }}
                    >
                      <Icon icon={Trash2} size="xs" className="text-gray-400 dark:text-gray-500" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      <Icon icon={Phone} size="xs" className="text-gray-400 dark:text-gray-500" />
                      {vendor.phone}
                    </a>
                  )}
                  {vendor.email && (
                    <a href={`mailto:${vendor.email}`} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      <Icon icon={Mail} size="xs" className="text-gray-400 dark:text-gray-500" />
                      {vendor.email}
                    </a>
                  )}
                  {vendor.website && (
                    <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors">
                      <Icon icon={Globe} size="xs" className="text-gray-400 dark:text-gray-500" />
                      Website
                    </a>
                  )}
                  {vendor.address && (
                    <div className="flex items-start gap-2 text-gray-500 dark:text-gray-400">
                      <Icon icon={MapPin} size="xs" className="mt-0.5 text-gray-400 dark:text-gray-500" />
                      <span>{vendor.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Vendor"
        description="Add a service provider to your address book"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Input
            label="Name"
            value={formData.name || ''}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g., John Smith"
            required
          />

          <Input
            label="Company"
            value={formData.company || ''}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            placeholder="e.g., Smith HVAC Services"
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
              label="Phone"
              type="tel"
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="john@example.com"
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={formData.website || ''}
            onChange={(e) => setFormData({ ...formData, website: e.target.value })}
            placeholder="https://example.com"
          />

          <AddressInput
            label="Address"
            value={formData.address || ''}
            onChange={(value) => setFormData({ ...formData, address: value })}
            placeholder="Start typing an address..."
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Add Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editingVendor}
        onClose={() => setEditingVendor(null)}
        title="Edit Vendor"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingVendor) {
              updateMutation.mutate({
                id: editingVendor.id,
                data: {
                  name: editingVendor.name,
                  company: editingVendor.company,
                  category_id: editingVendor.category_id,
                  phone: editingVendor.phone,
                  email: editingVendor.email,
                  website: editingVendor.website,
                  address: editingVendor.address,
                  notes: editingVendor.notes,
                },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editingVendor?.name || ''}
            onChange={(e) => setEditingVendor(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />

          <Input
            label="Company"
            value={editingVendor?.company || ''}
            onChange={(e) => setEditingVendor(prev => prev ? { ...prev, company: e.target.value } : null)}
          />

          <Select
            label="Category"
            options={[
              { value: '', label: 'Select a category' },
              ...allCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={editingVendor?.category_id || ''}
            onChange={(e) => setEditingVendor(prev => prev ? { ...prev, category_id: Number(e.target.value) || null } : null)}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              type="tel"
              value={editingVendor?.phone || ''}
              onChange={(e) => setEditingVendor(prev => prev ? { ...prev, phone: e.target.value } : null)}
            />
            <Input
              label="Email"
              type="email"
              value={editingVendor?.email || ''}
              onChange={(e) => setEditingVendor(prev => prev ? { ...prev, email: e.target.value } : null)}
            />
          </div>

          <Input
            label="Website"
            type="url"
            value={editingVendor?.website || ''}
            onChange={(e) => setEditingVendor(prev => prev ? { ...prev, website: e.target.value } : null)}
          />

          <AddressInput
            label="Address"
            value={editingVendor?.address || ''}
            onChange={(value) => setEditingVendor(prev => prev ? { ...prev, address: value } : null)}
            placeholder="Start typing an address..."
          />

          {editingVendor && (
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo & Images</label>
              <ImageUpload
                fileableType="vendor"
                fileableId={editingVendor.id}
                existingImages={editingVendor.images || []}
                featuredImage={editingVendor.logo}
                invalidateQueries={[['vendors']]}
                label="Upload vendor logo or images"
              />
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditingVendor(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Vendor Search Modal */}
      <VendorSearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
      />
    </div>
  )
}
