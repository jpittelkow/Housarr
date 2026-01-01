import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { dashboard, profile } from '@/services/api'
import { cn } from '@/lib/utils'
import {
  Icon,
  Home,
  Package,
  Users,
  Bell,
  CheckSquare,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  HelpCircle,
  Sparkles,
  ThemeToggle,
  FileText,
} from '@/components/ui'
import type { LucideIcon } from 'lucide-react'

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Rooms', href: '/rooms', icon: Home },
  { name: 'Smart Add', href: '/smart-add', icon: Sparkles },
  { name: 'Reports', href: '/reports', icon: FileText },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'Todos', href: '/todos', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help', href: '/help', icon: HelpCircle },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const queryClient = useQueryClient()

  // Fetch user profile with avatar
  const { data: profileData } = useQuery({
    queryKey: ['profile'],
    queryFn: profile.get,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const userAvatar = profileData?.user?.avatar

  // Prefetch common data using batched endpoint (single request instead of two)
  useEffect(() => {
    const prefetchData = async () => {
      try {
        const data = await dashboard.prefetch()
        // Populate both caches from the single batched response
        queryClient.setQueryData(['categories'], { categories: data.categories })
        queryClient.setQueryData(['locations'], { locations: data.locations })
      } catch {
        // Silent fail - data will be fetched on demand
      }
    }
    prefetchData()
  }, [queryClient])

  // Prefetch page chunks on hover or during idle time (per nav item)
  // This avoids loading all routes immediately, preserving code-splitting benefits
  const pagePreloaders: Record<string, () => Promise<unknown>> = {
    '/': () => import('@/pages/DashboardPage'),
    '/items': () => import('@/pages/ItemsPage'),
    '/items/:id': () => import('@/pages/ItemDetailPage'),
    '/rooms': () => import('@/pages/RoomsPage'),
    '/smart-add': () => import('@/pages/SmartAddPage'),
    '/reports': () => import('@/pages/ReportsPage'),
    '/reports/create': () => import('@/pages/ReportCreatorPage'),
    '/reports/:id': () => import('@/pages/ReportViewerPage'),
    '/vendors': () => import('@/pages/VendorsPage'),
    '/reminders': () => import('@/pages/RemindersPage'),
    '/todos': () => import('@/pages/TodosPage'),
    '/settings': () => import('@/pages/SettingsPage'),
    '/profile': () => import('@/pages/ProfilePage'),
    '/help': () => import('@/pages/HelpPage'),
  }

  const prefetchPage = (href: string) => {
    const preloader = pagePreloaders[href]
    if (!preloader) return

    // Use requestIdleCallback for non-blocking prefetch
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => preloader(), { timeout: 2000 })
    } else {
      setTimeout(() => preloader(), 50)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const currentPage = navigation.find(item =>
    item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
  )

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 dark:bg-black/70 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Untitled UI pattern */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[280px] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800',
          'flex flex-col',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-xl font-semibold text-gray-900 dark:text-gray-50">Housarr</span>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <Icon icon={X} size="md" />
          </button>
        </div>

        {/* Navigation - Untitled UI style */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href)

              return (
                <NavLink
                  key={item.name}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  onMouseEnter={() => prefetchPage(item.href)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                    'transition-colors duration-150',
                    isActive
                      ? 'bg-gray-50 dark:bg-gray-800 text-primary-700 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'
                  )}
                >
                  <Icon
                    icon={item.icon}
                    size="sm"
                    className={cn(
                      isActive ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-500 dark:group-hover:text-gray-400'
                    )}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600 dark:bg-primary-400" />
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Footer section */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 space-y-3">
          {/* Theme toggle */}
          <ThemeToggle className="w-full" />

          {/* User account */}
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <button
              onClick={() => {
                setSidebarOpen(false)
                navigate('/profile')
              }}
              className="flex items-center gap-3 flex-1 min-w-0 text-left"
            >
              {userAvatar ? (
                <img
                  src={userAvatar.url}
                  alt={user?.name || 'User'}
                  className="w-9 h-9 rounded-full object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </button>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
              title="Sign out"
            >
              <Icon icon={LogOut} size="sm" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-[280px]">
        {/* Top bar - Untitled UI style */}
        <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon icon={Menu} size="md" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500 dark:text-gray-400">{user?.household?.name || 'My Home'}</span>
              {currentPage && (
                <>
                  <Icon icon={ChevronRight} size="xs" className="text-gray-300 dark:text-gray-600" />
                  <span className="font-medium text-gray-900 dark:text-gray-50">{currentPage.name}</span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
