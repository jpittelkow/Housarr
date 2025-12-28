import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { household, users, categories, locations, auth, backup, settings, type StorageSettings, type EmailSettings, type AISettings } from '@/services/api'
import { useAuthStore } from '@/stores/authStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Icon, Plus, Users, Tag, Home, Trash2, MapPin, Pencil, Download, Upload, Database, HardDrive, Mail, Zap, Image, HelpTooltip } from '@/components/ui'
import { ImageUpload } from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()

  const [householdName, setHouseholdName] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<{ id: number; name: string; icon: string; images?: unknown[]; featured_image?: unknown } | null>(null)
  const [inviteData, setInviteData] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
    role: 'member' as 'admin' | 'member',
  })
  const [categoryData, setCategoryData] = useState({ name: '', icon: '', color: '#7F56D9' })
  const [locationData, setLocationData] = useState({ name: '', icon: '' })
  const [editingUser, setEditingUser] = useState<{ id: number; name: string; email: string; role: 'admin' | 'member' } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [storageSettings, setStorageSettings] = useState<StorageSettings>({
    storage_driver: 'local',
    aws_access_key_id: '',
    aws_secret_access_key: '',
    aws_default_region: '',
    aws_bucket: '',
    aws_endpoint: '',
  })
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    mail_driver: 'log',
    mail_host: '',
    mail_port: 587,
    mail_username: '',
    mail_password: '',
    mail_encryption: 'tls',
    mail_from_address: '',
    mail_from_name: '',
    mailgun_domain: '',
    mailgun_secret: '',
    mailgun_endpoint: 'api.mailgun.net',
    sendgrid_api_key: '',
    ses_key: '',
    ses_secret: '',
    ses_region: 'us-east-1',
    cloudflare_api_token: '',
    cloudflare_account_id: '',
  })
  const [aiSettings, setAISettings] = useState<AISettings>({
    ai_provider: 'none',
    ai_model: '',
    anthropic_api_key: '',
    openai_api_key: '',
    openai_base_url: '',
    gemini_api_key: '',
    gemini_base_url: '',
    local_base_url: '',
    local_model: '',
    local_api_key: '',
  })

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

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settings.get(),
    enabled: user?.role === 'admin',
  })

  // Populate settings when data is loaded
  useEffect(() => {
    if (settingsData?.settings) {
      // Storage settings
      setStorageSettings({
        storage_driver: (settingsData.settings.storage_driver as 'local' | 's3') || 'local',
        aws_access_key_id: '',
        aws_secret_access_key: '',
        aws_default_region: settingsData.settings.aws_default_region || '',
        aws_bucket: settingsData.settings.aws_bucket || '',
        aws_endpoint: settingsData.settings.aws_endpoint || '',
      })
      // Email settings
      setEmailSettings({
        mail_driver: (settingsData.settings.mail_driver as EmailSettings['mail_driver']) || 'log',
        mail_host: settingsData.settings.mail_host || '',
        mail_port: settingsData.settings.mail_port ? parseInt(settingsData.settings.mail_port) : 587,
        mail_username: '',
        mail_password: '',
        mail_encryption: (settingsData.settings.mail_encryption as 'tls' | 'ssl' | 'null') || 'tls',
        mail_from_address: settingsData.settings.mail_from_address || '',
        mail_from_name: settingsData.settings.mail_from_name || '',
        mailgun_domain: settingsData.settings.mailgun_domain || '',
        mailgun_secret: '',
        mailgun_endpoint: settingsData.settings.mailgun_endpoint || 'api.mailgun.net',
        sendgrid_api_key: '',
        ses_key: '',
        ses_secret: '',
        ses_region: settingsData.settings.ses_region || 'us-east-1',
        cloudflare_api_token: '',
        cloudflare_account_id: settingsData.settings.cloudflare_account_id || '',
      })
      // AI settings
      setAISettings({
        ai_provider: (settingsData.settings.ai_provider as AISettings['ai_provider']) || 'none',
        ai_model: settingsData.settings.ai_model || '',
        anthropic_api_key: '',
        openai_api_key: '',
        openai_base_url: settingsData.settings.openai_base_url || '',
        gemini_api_key: '',
        gemini_base_url: settingsData.settings.gemini_base_url || '',
        local_base_url: settingsData.settings.local_base_url || '',
        local_model: settingsData.settings.local_model || '',
        local_api_key: '',
      })
    }
  }, [settingsData])

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

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; email?: string; role?: 'admin' | 'member' } }) =>
      users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditingUser(null)
      toast.success('User updated')
    },
    onError: () => {
      toast.error('Failed to update user')
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

  const importBackupMutation = useMutation({
    mutationFn: (file: File) => backup.import(file),
    onSuccess: (data) => {
      queryClient.invalidateQueries()
      toast.success(data.message)
    },
    onError: () => {
      toast.error('Failed to import backup')
    },
  })

  const updateStorageSettingsMutation = useMutation({
    mutationFn: (data: StorageSettings) => settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Storage settings updated')
    },
    onError: () => {
      toast.error('Failed to update storage settings')
    },
  })

  const updateEmailSettingsMutation = useMutation({
    mutationFn: (data: EmailSettings) => settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Email settings updated')
    },
    onError: () => {
      toast.error('Failed to update email settings')
    },
  })

  const updateAISettingsMutation = useMutation({
    mutationFn: (data: AISettings) => settings.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('AI settings updated')
    },
    onError: () => {
      toast.error('Failed to update AI settings')
    },
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const blob = await backup.export()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `housarr-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Backup downloaded')
    } catch {
      toast.error('Failed to export backup')
    } finally {
      setIsExporting(false)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (confirm('This will replace all your current data. Are you sure you want to continue?')) {
        importBackupMutation.mutate(file)
      }
      e.target.value = ''
    }
  }

  const allUsers = usersData?.users || []
  const allCategories = categoriesData?.categories || []
  const customCategories = allCategories.filter((c) => c.household_id !== null)
  const systemCategories = allCategories.filter((c) => c.household_id === null)
  const allLocations = locationsData?.locations || []

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Page Header - Untitled UI style */}
      <div className="pb-5 border-b border-gray-200">
        <h1 className="text-display-sm font-semibold text-gray-900 flex items-center gap-2">
          Settings
          <HelpTooltip position="right">
            Configure your household, manage categories and locations, invite users, and set up backups.
          </HelpTooltip>
        </h1>
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

          {householdData?.household && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Icon icon={Image} size="xs" className="inline mr-2 text-gray-400" />
                Household Images
              </label>
              <ImageUpload
                fileableType="household"
                fileableId={householdData.household.id}
                existingImages={householdData.household.images || []}
                featuredImage={householdData.household.featured_image}
                invalidateQueries={[['household']]}
                label="Upload household images"
              />
            </div>
          )}
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
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingUser({ id: u.id, name: u.name, email: u.email, role: u.role })}
                    >
                      <Icon icon={Pencil} size="xs" className="text-gray-400" />
                    </Button>
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
                  </div>
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
                    {loc.featured_image ? (
                      <img
                        src={loc.featured_image.url}
                        alt={loc.name}
                        className="w-9 h-9 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Icon icon={MapPin} size="sm" className="text-gray-600" />
                      </div>
                    )}
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
                      onClick={() => setEditingLocation({ id: loc.id, name: loc.name, icon: loc.icon || '', images: loc.images, featured_image: loc.featured_image })}
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

      {/* Data Management - Admin only */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                <Icon icon={Database} size="sm" className="text-gray-700" />
              </div>
              <div>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>Export and import your household data</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">Export Backup</h4>
                  <p className="text-sm text-gray-500">Download a JSON backup of all your data</p>
                </div>
                <Button onClick={handleExport} isLoading={isExporting} variant="secondary">
                  <Icon icon={Download} size="xs" /> Export
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div>
                  <h4 className="font-medium text-gray-900">Import Backup</h4>
                  <p className="text-sm text-gray-500">Restore data from a backup file</p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={importBackupMutation.isPending}
                    variant="secondary"
                  >
                    <Icon icon={Upload} size="xs" /> Import
                  </Button>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Note: Importing a backup will replace all existing data in your household.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Storage Configuration - Admin only */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                <Icon icon={HardDrive} size="sm" className="text-gray-700" />
              </div>
              <div>
                <CardTitle>File Storage</CardTitle>
                <CardDescription>Configure where files and attachments are stored</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateStorageSettingsMutation.mutate(storageSettings)
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Storage Driver</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="storage_driver"
                      value="local"
                      checked={storageSettings.storage_driver === 'local'}
                      onChange={(e) => setStorageSettings({ ...storageSettings, storage_driver: e.target.value as 'local' | 's3' })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-900">Local</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="storage_driver"
                      value="s3"
                      checked={storageSettings.storage_driver === 's3'}
                      onChange={(e) => setStorageSettings({ ...storageSettings, storage_driver: e.target.value as 'local' | 's3' })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="text-sm text-gray-900">S3 / S3-Compatible</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Local stores files on the server. S3 works with AWS S3, MinIO, DigitalOcean Spaces, etc.
                </p>
              </div>

              {storageSettings.storage_driver === 's3' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <Input
                    label="Access Key ID"
                    type="password"
                    value={storageSettings.aws_access_key_id || ''}
                    onChange={(e) => setStorageSettings({ ...storageSettings, aws_access_key_id: e.target.value })}
                    placeholder="Enter access key (leave blank to keep current)"
                  />
                  <Input
                    label="Secret Access Key"
                    type="password"
                    value={storageSettings.aws_secret_access_key || ''}
                    onChange={(e) => setStorageSettings({ ...storageSettings, aws_secret_access_key: e.target.value })}
                    placeholder="Enter secret key (leave blank to keep current)"
                  />
                  <Input
                    label="Region"
                    value={storageSettings.aws_default_region || ''}
                    onChange={(e) => setStorageSettings({ ...storageSettings, aws_default_region: e.target.value })}
                    placeholder="e.g., us-east-1"
                  />
                  <Input
                    label="Bucket"
                    value={storageSettings.aws_bucket || ''}
                    onChange={(e) => setStorageSettings({ ...storageSettings, aws_bucket: e.target.value })}
                    placeholder="e.g., my-bucket"
                  />
                  <Input
                    label="Endpoint (for S3-compatible services)"
                    value={storageSettings.aws_endpoint || ''}
                    onChange={(e) => setStorageSettings({ ...storageSettings, aws_endpoint: e.target.value })}
                    placeholder="e.g., https://minio.example.com"
                    hint="Leave blank for AWS S3. Required for MinIO, DigitalOcean Spaces, etc."
                  />
                </div>
              )}

              <Button type="submit" isLoading={updateStorageSettingsMutation.isPending}>
                Save Storage Settings
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Email Configuration - Admin only */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                <Icon icon={Mail} size="sm" className="text-gray-700" />
              </div>
              <div>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>Configure how the system sends emails</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateEmailSettingsMutation.mutate(emailSettings)
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email Provider</label>
                <Select
                  options={[
                    { value: 'log', label: 'Log Only (Development)' },
                    { value: 'smtp', label: 'SMTP' },
                    { value: 'mailgun', label: 'Mailgun' },
                    { value: 'sendgrid', label: 'SendGrid' },
                    { value: 'ses', label: 'Amazon SES' },
                    { value: 'cloudflare', label: 'Cloudflare Email' },
                  ]}
                  value={emailSettings.mail_driver || 'log'}
                  onChange={(e) => setEmailSettings({ ...emailSettings, mail_driver: e.target.value as EmailSettings['mail_driver'] })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select your email service provider. "Log Only" writes emails to logs instead of sending.
                </p>
              </div>

              {/* Common From Address Settings */}
              {emailSettings.mail_driver !== 'log' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Sender Information</h4>
                  <Input
                    label="From Email Address"
                    type="email"
                    value={emailSettings.mail_from_address || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_address: e.target.value })}
                    placeholder="noreply@example.com"
                  />
                  <Input
                    label="From Name"
                    value={emailSettings.mail_from_name || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_name: e.target.value })}
                    placeholder="Housarr"
                  />
                </div>
              )}

              {/* SMTP Settings */}
              {emailSettings.mail_driver === 'smtp' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">SMTP Settings</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="SMTP Host"
                      value={emailSettings.mail_host || ''}
                      onChange={(e) => setEmailSettings({ ...emailSettings, mail_host: e.target.value })}
                      placeholder="smtp.example.com"
                    />
                    <Input
                      label="Port"
                      type="number"
                      value={emailSettings.mail_port || 587}
                      onChange={(e) => setEmailSettings({ ...emailSettings, mail_port: parseInt(e.target.value) || 587 })}
                      placeholder="587"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Username"
                      type="password"
                      value={emailSettings.mail_username || ''}
                      onChange={(e) => setEmailSettings({ ...emailSettings, mail_username: e.target.value })}
                      placeholder="Enter username (leave blank to keep current)"
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={emailSettings.mail_password || ''}
                      onChange={(e) => setEmailSettings({ ...emailSettings, mail_password: e.target.value })}
                      placeholder="Enter password (leave blank to keep current)"
                    />
                  </div>
                  <Select
                    label="Encryption"
                    options={[
                      { value: 'tls', label: 'TLS' },
                      { value: 'ssl', label: 'SSL' },
                      { value: 'null', label: 'None' },
                    ]}
                    value={emailSettings.mail_encryption || 'tls'}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mail_encryption: e.target.value as 'tls' | 'ssl' | 'null' })}
                  />
                </div>
              )}

              {/* Mailgun Settings */}
              {emailSettings.mail_driver === 'mailgun' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Mailgun Settings</h4>
                  <Input
                    label="Domain"
                    value={emailSettings.mailgun_domain || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mailgun_domain: e.target.value })}
                    placeholder="mg.example.com"
                  />
                  <Input
                    label="API Key"
                    type="password"
                    value={emailSettings.mailgun_secret || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mailgun_secret: e.target.value })}
                    placeholder="Enter API key (leave blank to keep current)"
                  />
                  <Input
                    label="Endpoint"
                    value={emailSettings.mailgun_endpoint || 'api.mailgun.net'}
                    onChange={(e) => setEmailSettings({ ...emailSettings, mailgun_endpoint: e.target.value })}
                    placeholder="api.mailgun.net"
                    hint="Use api.eu.mailgun.net for EU region"
                  />
                </div>
              )}

              {/* SendGrid Settings */}
              {emailSettings.mail_driver === 'sendgrid' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">SendGrid Settings</h4>
                  <Input
                    label="API Key"
                    type="password"
                    value={emailSettings.sendgrid_api_key || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, sendgrid_api_key: e.target.value })}
                    placeholder="Enter API key (leave blank to keep current)"
                    hint="Your SendGrid API key starting with SG."
                  />
                </div>
              )}

              {/* Amazon SES Settings */}
              {emailSettings.mail_driver === 'ses' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Amazon SES Settings</h4>
                  <Input
                    label="Access Key ID"
                    type="password"
                    value={emailSettings.ses_key || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, ses_key: e.target.value })}
                    placeholder="Enter access key (leave blank to keep current)"
                  />
                  <Input
                    label="Secret Access Key"
                    type="password"
                    value={emailSettings.ses_secret || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, ses_secret: e.target.value })}
                    placeholder="Enter secret key (leave blank to keep current)"
                  />
                  <Input
                    label="Region"
                    value={emailSettings.ses_region || 'us-east-1'}
                    onChange={(e) => setEmailSettings({ ...emailSettings, ses_region: e.target.value })}
                    placeholder="us-east-1"
                  />
                </div>
              )}

              {/* Cloudflare Email Settings */}
              {emailSettings.mail_driver === 'cloudflare' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Cloudflare Email Settings</h4>
                  <Input
                    label="Account ID"
                    value={emailSettings.cloudflare_account_id || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, cloudflare_account_id: e.target.value })}
                    placeholder="Your Cloudflare Account ID"
                    hint="Found in your Cloudflare dashboard URL or account settings"
                  />
                  <Input
                    label="API Token"
                    type="password"
                    value={emailSettings.cloudflare_api_token || ''}
                    onChange={(e) => setEmailSettings({ ...emailSettings, cloudflare_api_token: e.target.value })}
                    placeholder="Enter API token (leave blank to keep current)"
                    hint="Create a token with Email Routing permissions"
                  />
                </div>
              )}

              <Button type="submit" isLoading={updateEmailSettingsMutation.isPending}>
                Save Email Settings
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* AI Configuration - Admin only */}
      {user?.role === 'admin' && (
        <Card>
          <CardHeader className="border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg border border-gray-200 bg-white flex items-center justify-center">
                <Icon icon={Zap} size="sm" className="text-gray-700" />
              </div>
              <div>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>Connect to AI providers for smart features</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateAISettingsMutation.mutate(aiSettings)
              }}
              className="space-y-6"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
                <Select
                  options={[
                    { value: 'none', label: 'None (Disabled)' },
                    { value: 'claude', label: 'Claude (Anthropic)' },
                    { value: 'openai', label: 'OpenAI' },
                    { value: 'gemini', label: 'Gemini (Google)' },
                    { value: 'local', label: 'Local Model (Ollama, LM Studio)' },
                  ]}
                  value={aiSettings.ai_provider || 'none'}
                  onChange={(e) => setAISettings({ ...aiSettings, ai_provider: e.target.value as AISettings['ai_provider'] })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Select an AI provider to enable smart features like auto-categorization and suggestions.
                </p>
              </div>

              {/* Claude (Anthropic) Settings */}
              {aiSettings.ai_provider === 'claude' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Claude Settings</h4>
                  <Input
                    label="API Key"
                    type="password"
                    value={aiSettings.anthropic_api_key || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, anthropic_api_key: e.target.value })}
                    placeholder="Enter API key (leave blank to keep current)"
                    hint="Get your API key from console.anthropic.com"
                  />
                  <Input
                    label="Model"
                    value={aiSettings.ai_model || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, ai_model: e.target.value })}
                    placeholder="claude-sonnet-4-20250514"
                    hint="Leave blank for default model"
                  />
                </div>
              )}

              {/* OpenAI Settings */}
              {aiSettings.ai_provider === 'openai' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">OpenAI Settings</h4>
                  <Input
                    label="API Key"
                    type="password"
                    value={aiSettings.openai_api_key || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, openai_api_key: e.target.value })}
                    placeholder="Enter API key (leave blank to keep current)"
                    hint="Get your API key from platform.openai.com"
                  />
                  <Input
                    label="Model"
                    value={aiSettings.ai_model || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, ai_model: e.target.value })}
                    placeholder="gpt-4o"
                    hint="Leave blank for default model"
                  />
                  <Input
                    label="Base URL (Optional)"
                    value={aiSettings.openai_base_url || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, openai_base_url: e.target.value })}
                    placeholder="https://api.openai.com/v1"
                    hint="For OpenAI-compatible APIs (Azure, etc.)"
                  />
                </div>
              )}

              {/* Gemini Settings */}
              {aiSettings.ai_provider === 'gemini' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Gemini Settings</h4>
                  <Input
                    label="API Key"
                    type="password"
                    value={aiSettings.gemini_api_key || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, gemini_api_key: e.target.value })}
                    placeholder="Enter API key (leave blank to keep current)"
                    hint="Get your API key from aistudio.google.com"
                  />
                  <Input
                    label="Model"
                    value={aiSettings.ai_model || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, ai_model: e.target.value })}
                    placeholder="gemini-1.5-pro"
                    hint="Leave blank for default model"
                  />
                  <Input
                    label="Base URL (Optional)"
                    value={aiSettings.gemini_base_url || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, gemini_base_url: e.target.value })}
                    placeholder="https://generativelanguage.googleapis.com/v1beta"
                    hint="Leave blank for default Google API"
                  />
                </div>
              )}

              {/* Local Model Settings */}
              {aiSettings.ai_provider === 'local' && (
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">Local Model Settings</h4>
                  <Input
                    label="Base URL"
                    value={aiSettings.local_base_url || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, local_base_url: e.target.value })}
                    placeholder="http://localhost:11434"
                    hint="Ollama: http://localhost:11434, LM Studio: http://localhost:1234"
                  />
                  <Input
                    label="Model Name"
                    value={aiSettings.local_model || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, local_model: e.target.value })}
                    placeholder="llama3"
                    hint="The model name as shown in your local server"
                  />
                  <Input
                    label="API Key (Optional)"
                    type="password"
                    value={aiSettings.local_api_key || ''}
                    onChange={(e) => setAISettings({ ...aiSettings, local_api_key: e.target.value })}
                    placeholder="Enter API key if required"
                    hint="Only needed if your local server requires authentication"
                  />
                </div>
              )}

              <Button type="submit" isLoading={updateAISettingsMutation.isPending}>
                Save AI Settings
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

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

          {editingLocation && (
            <div className="pt-4 border-t border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Location Images</label>
              <ImageUpload
                fileableType="location"
                fileableId={editingLocation.id}
                existingImages={(editingLocation.images as []) || []}
                featuredImage={editingLocation.featured_image as undefined}
                invalidateQueries={[['locations']]}
                label="Upload location images"
              />
            </div>
          )}

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

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title="Edit User">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (editingUser) {
              updateUserMutation.mutate({
                id: editingUser.id,
                data: { name: editingUser.name, email: editingUser.email, role: editingUser.role },
              })
            }
          }}
          className="p-6 space-y-4"
        >
          <Input
            label="Name"
            value={editingUser?.name || ''}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, name: e.target.value } : null)}
            required
          />
          <Input
            label="Email"
            type="email"
            value={editingUser?.email || ''}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, email: e.target.value } : null)}
            required
          />
          <Select
            label="Role"
            options={[
              { value: 'member', label: 'Member' },
              { value: 'admin', label: 'Admin' },
            ]}
            value={editingUser?.role || 'member'}
            onChange={(e) => setEditingUser(prev => prev ? { ...prev, role: e.target.value as 'admin' | 'member' } : null)}
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button type="button" variant="secondary" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={updateUserMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
