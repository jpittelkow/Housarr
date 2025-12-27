import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { items, categories, locations, vendors } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Textarea } from '@/components/ui/Textarea'
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
} from '@/components/ui'
import toast from 'react-hot-toast'
import type { Item } from '@/types'

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between pb-5 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-100 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-7 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-5 bg-gray-100 rounded w-32 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="py-6">
            <div className="grid grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="h-10 w-10 bg-gray-100 rounded-lg" />
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-16" />
                    <div className="h-5 bg-gray-200 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-6">
            <div className="space-y-3 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-24" />
              <div className="h-4 bg-gray-100 rounded w-full" />
              <div className="h-4 bg-gray-100 rounded w-3/4" />
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
        <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <Icon icon={Package} size="md" className="text-gray-400" />
        </div>
        <p className="text-sm font-medium text-gray-900">Item not found</p>
        <p className="text-sm text-gray-500 mt-1">The item you're looking for doesn't exist.</p>
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
      <div className="flex items-start justify-between pb-5 border-b border-gray-200">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/items')}>
            <Icon icon={ArrowLeft} size="xs" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-display-sm font-semibold text-gray-900">{item.name}</h1>
              {item.category && (
                <Badge style={{ backgroundColor: `${item.category.color}20`, color: item.category.color ?? undefined }}>
                  {item.category.name}
                </Badge>
              )}
            </div>
            {(item.make || item.model) && (
              <p className="text-text-md text-gray-500 mt-1">
                {[item.make, item.model].filter(Boolean).join(' ')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
          <CardHeader className="border-b border-gray-200">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-6">
              {(item.location_obj || item.location) && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                    <Icon icon={MapPin} size="sm" className="text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Location</p>
                    <p className="font-medium text-gray-900">{item.location_obj?.name || item.location}</p>
                  </div>
                </div>
              )}
              {item.install_date && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                    <Icon icon={Calendar} size="sm" className="text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Install Date</p>
                    <p className="font-medium text-gray-900">{formatDate(item.install_date)}</p>
                  </div>
                </div>
              )}
              {item.serial_number && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                    <Icon icon={Package} size="sm" className="text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Serial Number</p>
                    <p className="font-medium text-gray-900">{item.serial_number}</p>
                  </div>
                </div>
              )}
              {item.vendor && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                    <Icon icon={User} size="sm" className="text-gray-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Vendor</p>
                    <p className="font-medium text-gray-900">{item.vendor.name}</p>
                  </div>
                </div>
              )}
            </div>
            {item.notes && (
              <div className="pt-6 mt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-500 mb-2">Notes</p>
                <p className="text-gray-700">{item.notes}</p>
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

      {/* Parts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Wrench} size="sm" className="text-gray-400" /> Replacement Parts
            </CardTitle>
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
                    <div className="text-right">
                      {part.price && (
                        <p className="font-medium text-gray-900">{formatCurrency(part.price)}</p>
                      )}
                      {part.purchase_url && (
                        <a
                          href={part.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Buy
                        </a>
                      )}
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
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Package} size="sm" className="text-gray-400" /> Consumable Parts
            </CardTitle>
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
                    <div className="text-right">
                      {part.price && (
                        <p className="font-medium text-gray-900">{formatCurrency(part.price)}</p>
                      )}
                      {part.purchase_url && (
                        <a
                          href={part.purchase_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                        >
                          Buy
                        </a>
                      )}
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
        <CardHeader className="border-b border-gray-200">
          <CardTitle>Maintenance History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {item.maintenanceLogs && item.maintenanceLogs.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {item.maintenanceLogs.map((log) => (
                <li key={log.id} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div>
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
                  {log.cost && (
                    <span className="font-medium text-gray-900">{formatCurrency(log.cost)}</span>
                  )}
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
              ...allCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            value={editData.category_id || ''}
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
              ...allLocations.map((l) => ({ value: l.id, label: l.name })),
            ]}
            value={editData.location_id || ''}
            onChange={(e) => setEditData({ ...editData, location_id: Number(e.target.value) || undefined })}
          />

          <Select
            label="Vendor"
            options={[
              { value: '', label: 'Select a vendor' },
              ...allVendors.map((v) => ({ value: v.id, label: v.name })),
            ]}
            value={editData.vendor_id || ''}
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
    </div>
  )
}
