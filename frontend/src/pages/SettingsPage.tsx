import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { household, users, categories, locations, auth } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Icon, Plus, Users, Tag, Home, Trash2, MapPin, Pencil } from '@/components/ui'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [householdName, setHouseholdName] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string; icon: string } | null>(null)
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'member' as 'admin' | 'member',
  })
  const [categoryData, setCategoryData] = useState({ name: '', icon: '', color: '#7F56D9' })
  const [locationData, setLocationData] = useState({ name: '', icon: '' })

  const { data: householdData } = useQuery({
    queryKey: ['household'],
    queryFn: () => household.get(),
  })

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => users.list(),
  })

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.list(),
  })

  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locations.list(),
  })

  const updateHouseholdMutation = useMutation({
    mutationFn: (name: string) => household.update({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['household'] })
      toast.success('Household updated')
    },
  })

  const inviteMutation = useMutation({
    mutationFn: (data: typeof inviteData) => auth.invite(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsInviteModalOpen(false)
      setInviteData({ name: '', email: '', password: '', password_confirmation: '', role: 'member' })
      toast.success('User invited successfully')
    },
    onError: () => {
      toast.error('Failed to invite user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (id: number) => users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User removed')
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: typeof categoryData) => categories.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      setIsCategoryModalOpen(false)
      setCategoryData({ name: '', icon: '', color: '#7F56D9' })
      toast.success('Category created')
    },
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => categories.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Category deleted')
    },
    onError: () => {
      toast.error('Cannot delete system categories')
    },
  })

  const createLocationMutation = useMutation({
    mutationFn: (data: typeof locationData) => locations.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setIsLocationModalOpen(false)
      setLocationData({ name: '', icon: '' })
      toast.success('Location created')
    },
  })

  const updateLocationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: typeof locationData }) => locations.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      setEditingLocation(null)
      toast.success('Location updated')
    },
  })

  const deleteLocationMutation = useMutation({
    mutationFn: (id: number) => locations.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] })
      toast.success('Location deleted')
    },
    onError: () => {
      toast.error('Cannot delete location with items')
    },
  })

  const allUsers = usersData?.users || []
  const allCategories = categoriesData?.categories || []
  const customCategories = allCategories.filter((c) => c.household_id !== null)
  const systemCategories = allCategories.filter((c) => c.household_id === null)
  const allLocations = locationsData?.locations || []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header - Untitled UI style */}
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-display-sm font-semibold text-gray-900">Settings</h1>
        <p className="text-text-md text-gray-500 mt-1">Manage your household settings</p>
      </div>

      {/* Household */}
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
              <Icon icon={Home} size="sm" className="text-gray-700" />
            </div>
            <div>
              <CardTitle>Household</CardTitle>
              <CardDescription>Update your household name</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              updateHouseholdMutation.mutate(householdName || householdData?.household?.name || '')
            }}
            className="flex gap-4"
          >
            <Input
              value={householdName || householdData?.household?.name || ''}
              onChange={(e) => setHouseholdName(e.target.value)}
              placeholder="Household name"
              className="flex-1"
            />
            <Button type="submit" isLoading={updateHouseholdMutation.isPending}>
              Save
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
              <Icon icon={Users} size="sm" className="text-gray-700" />
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
          <ul className="divide-y divide-gray-200">
            {allUsers.map((u) => (
              <li key={u.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {u.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{u.name}</span>
                      <Badge variant={u.role === 'admin' ? 'primary' : 'gray'} size="sm">{u.role}</Badge>
                      {u.id === user?.id && <Badge variant="success" size="sm">You</Badge>}
                    </div>
                    <span className="text-sm text-gray-500">{u.email}</span>
                  </div>
                </div>
                {u.id !== user?.id && user?.role === 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Remove this user?')) {
                        deleteUserMutation.mutate(u.id)
                      }
                    }}
                  >
                    <Icon icon={Trash2} size="xs" className="text-gray-400" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Categories */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
              <Icon icon={Tag} size="sm" className="text-gray-700" />
            </div>
            <div>
              <CardTitle>Categories</CardTitle>
              <CardDescription>Organize your items and vendors</CardDescription>
            </div>
          </div>
          <Button onClick={() => setIsCategoryModalOpen(true)} size="sm">
            <Icon icon={Plus} size="xs" /> Add
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {customCategories.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Custom Categories</h4>
                <div className="flex flex-wrap gap-2">
                  {customCategories.map((c) => (
                    <Badge
                      key={c.id}
                      style={{ backgroundColor: `${c.color}15`, color: c.color ?? undefined, borderColor: `${c.color}30` }}
                      className="group cursor-pointer border"
                      onClick={() => {
                        if (confirm('Delete this category?')) {
                          deleteCategoryMutation.mutate(c.id)
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
              <h4 className="text-sm font-medium text-gray-700 mb-3">System Categories</h4>
              <div className="flex flex-wrap gap-2">
                {systemCategories.map((c) => (
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

      {/* Locations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
              <Icon icon={MapPin} size="sm" className="text-gray-700" />
            </div>
            <div>
              <CardTitle>Locations</CardTitle>
              <CardDescription>Define locations for your items</CardDescription>
            </div>
          </div>
          <Button onClick={() => setIsLocationModalOpen(true)} size="sm">
            <Icon icon={Plus} size="xs" /> Add
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {allLocations.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No locations yet. Add your first location.
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {allLocations.map((loc) => (
                <li key={loc.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon icon={MapPin} size="sm" className="text-gray-600" />
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">{loc.name}</span>
                      {loc.items_count !== undefined && loc.items_count > 0 && (
                        <span className="text-sm text-gray-500 ml-2">({loc.items_count} items)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingLocation({ id: loc.id, name: loc.name, icon: loc.icon || '' })}
                    >
                      <Icon icon={Pencil} size="xs" className="text-gray-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Delete this location?')) {
                          deleteLocationMutation.mutate(loc.id)
                        }
                      }}
                    >
                      <Icon icon={Trash2} size="xs" className="text-gray-400" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={inviteMutation.isPending}>
              Invite
            </Button>
          </div>
        </form>
      </Modal>

      {/* Category Modal */}
      <Modal isOpen={isCategoryModalOpen} onClose={() => setIsCategoryModalOpen(false)} title="Add Category">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createCategoryMutation.mutate(categoryData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={categoryData.name}
            onChange={(e) => setCategoryData({ ...categoryData, name: e.target.value })}
            placeholder="e.g., Outdoor"
            required
          />
          <Input
            label="Icon"
            value={categoryData.icon}
            onChange={(e) => setCategoryData({ ...categoryData, icon: e.target.value })}
            placeholder="e.g., sun"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={categoryData.color}
                onChange={(e) => setCategoryData({ ...categoryData, color: e.target.value })}
                className="h-10 w-14 rounded-lg border border-gray-300 cursor-pointer"
              />
              <Input
                value={categoryData.color}
                onChange={(e) => setCategoryData({ ...categoryData, color: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsCategoryModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createCategoryMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Location Modal - Create */}
      <Modal isOpen={isLocationModalOpen} onClose={() => setIsLocationModalOpen(false)} title="Add Location">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            createLocationMutation.mutate(locationData)
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={locationData.name}
            onChange={(e) => setLocationData({ ...locationData, name: e.target.value })}
            placeholder="e.g., Garage, Kitchen, Basement"
            required
          />
          <Input
            label="Icon (optional)"
            value={locationData.icon}
            onChange={(e) => setLocationData({ ...locationData, icon: e.target.value })}
            placeholder="e.g., home, building"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setIsLocationModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createLocationMutation.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      {/* Location Modal - Edit */}
      <Modal isOpen={!!editingLocation} onClose={() => setEditingLocation(null)} title="Edit Location">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingLocation) {
              updateLocationMutation.mutate({
                id: editingLocation.id,
                data: { name: editingLocation.name, icon: editingLocation.icon },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editingLocation?.name || ''}
            onChange={(e) => setEditingLocation(prev => prev ? { ...prev, name: e.target.value } : null)}
            placeholder="e.g., Garage, Kitchen, Basement"
            required
          />
          <Input
            label="Icon (optional)"
            value={editingLocation?.icon || ''}
            onChange={(e) => setEditingLocation(prev => prev ? { ...prev, icon: e.target.value } : null)}
            placeholder="e.g., home, building"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditingLocation(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateLocationMutation.isPending}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
