import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { profile } from '@/services/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon, User, Lock } from '@/components/ui'
import { ImageUpload } from '@/components/ui/ImageUpload'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const queryClient = useQueryClient()

  // Fetch profile with avatar
  const { data: profileQueryData } = useQuery({
    queryKey: ['profile'],
    queryFn: profile.get,
  })

  const currentUser = profileQueryData?.user || user

  // Profile form state
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  })
  const [isEditingProfile, setIsEditingProfile] = useState(false)

  // Password form state
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    password: '',
    password_confirmation: '',
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: { name?: string; email?: string }) => profile.update(data),
    onSuccess: (response) => {
      // Update the auth store with new user data
      setUser(response.user)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      setIsEditingProfile(false)
      toast.success('Profile updated successfully')
    },
    onError: () => {
      toast.error('Failed to update profile')
    },
  })

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: (data: {
      current_password: string
      password: string
      password_confirmation: string
    }) => profile.updatePassword(data),
    onSuccess: () => {
      setPasswordData({
        current_password: '',
        password: '',
        password_confirmation: '',
      })
      toast.success('Password updated successfully')
    },
    onError: () => {
      toast.error('Failed to update password. Please check your current password.')
    },
  })

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateProfileMutation.mutate(formData)
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.password !== passwordData.password_confirmation) {
      toast.error('Passwords do not match')
      return
    }
    if (passwordData.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    updatePasswordMutation.mutate(passwordData)
  }

  const cancelProfileEdit = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
    })
    setIsEditingProfile(false)
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-5 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">Profile</h1>
        <p className="mt-1 text-text-md text-gray-500 dark:text-gray-400">
          Manage your account settings and change your password.
        </p>
      </div>

      {/* Avatar Section */}
      <Card>
        <CardHeader className="border-b border-gray-200 dark:border-gray-800">
          <CardTitle className="flex items-center gap-2">
            <Icon icon={User} size="sm" className="text-gray-400 dark:text-gray-500" />
            Profile Photo
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {currentUser && (
            <ImageUpload
              fileableType="user"
              fileableId={currentUser.id}
              featuredImage={currentUser.avatar}
              invalidateQueries={[['profile']]}
              avatarMode
              onUploadComplete={() => {
                toast.success('Avatar updated')
              }}
              onDelete={() => {
                toast.success('Avatar removed')
              }}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profile Information */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-800">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={User} size="sm" className="text-gray-400 dark:text-gray-500" />
              Profile Information
            </CardTitle>
            {!isEditingProfile && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
              >
                Edit
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-6">
            {isEditingProfile ? (
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <Input
                  label="Name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={cancelProfileEdit}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    isLoading={updateProfileMutation.isPending}
                  >
                    Save Changes
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                  <p className="mt-1 text-gray-900 dark:text-gray-50">{user?.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="mt-1 text-gray-900 dark:text-gray-50">{user?.email}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Role</p>
                  <p className="mt-1 text-gray-900 dark:text-gray-50 capitalize">{user?.role}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Household</p>
                  <p className="mt-1 text-gray-900 dark:text-gray-50">{user?.household?.name}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader className="border-b border-gray-200">
            <CardTitle className="flex items-center gap-2">
              <Icon icon={Lock} size="sm" className="text-gray-400" />
              Change Password
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={passwordData.current_password}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    current_password: e.target.value,
                  })
                }
                required
              />
              <Input
                label="New Password"
                type="password"
                value={passwordData.password}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, password: e.target.value })
                }
                required
                minLength={8}
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={passwordData.password_confirmation}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    password_confirmation: e.target.value,
                  })
                }
                required
                minLength={8}
              />
              <div className="flex justify-end pt-4">
                <Button
                  type="submit"
                  isLoading={updatePasswordMutation.isPending}
                >
                  Update Password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
