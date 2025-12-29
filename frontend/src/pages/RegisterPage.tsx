import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon, Home, LoadingScreen } from '@/components/ui'
import { registerSchema, type RegisterInput } from '@/lib/validations'
import { toast } from 'sonner'

export default function RegisterPage() {
  const { register: registerUser } = useAuthStore()
  const navigate = useNavigate()
  const [isTransitioning, setIsTransitioning] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterInput) => {
    try {
      await registerUser(data)
      // Show loading screen instead of navigating immediately
      setIsTransitioning(true)
    } catch {
      toast.error('Failed to create account. Please try again.')
    }
  }

  // Show fun loading screen after successful registration
  if (isTransitioning) {
    return (
      <LoadingScreen 
        title="Welcome to Housarr!" 
        duration={2500}
        onComplete={() => navigate('/')}
      />
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center bg-gray-50 dark:bg-gray-950 px-4 py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Logo */}
        <div className="flex justify-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
              <Icon icon={Home} size="md" className="text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-gray-50">Housarr</span>
          </div>
        </div>

        {/* Header */}
        <div className="mt-6 text-center">
          <h1 className="text-display-sm font-semibold text-gray-900 dark:text-gray-50">Create your account</h1>
          <p className="mt-2 text-text-md text-gray-500 dark:text-gray-400">Set up your household to get started</p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Card */}
        <div className="bg-white dark:bg-gray-900 py-8 px-6 shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl sm:px-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="Household name"
              placeholder="The Smith Residence"
              autoComplete="organization"
              error={errors.household_name?.message}
              {...register('household_name')}
            />

            <Input
              label="Your name"
              placeholder="John Smith"
              autoComplete="name"
              error={errors.name?.message}
              {...register('name')}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Password"
              type="password"
              placeholder="Create a password"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="Confirm password"
              type="password"
              placeholder="Confirm your password"
              autoComplete="new-password"
              error={errors.password_confirmation?.message}
              {...register('password_confirmation')}
            />

            <Button type="submit" className="w-full" size="lg" isLoading={isSubmitting}>
              Create account
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
