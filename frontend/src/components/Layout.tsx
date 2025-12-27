import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useState } from 'react'
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
} from '@/components/ui'
import type { LucideIcon } from 'lucide-react'

const navigation: { name: string; href: string; icon: LucideIcon }[] = [
  { name: 'Dashboard', href: '/', icon: Home },
  { name: 'Items', href: '/items', icon: Package },
  { name: 'Vendors', href: '/vendors', icon: Users },
  { name: 'Reminders', href: '/reminders', icon: Bell },
  { name: 'Todos', href: '/todos', icon: CheckSquare },
  { name: 'Settings', href: '/settings', icon: Settings },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const currentPage = navigation.find(item =>
    item.href === '/' ? location.pathname === '/' : location.pathname.startsWith(item.href)
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Untitled UI pattern */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 h-full w-[280px] bg-white border-r border-gray-200',
          'flex flex-col',
          'transform transition-transform duration-200 ease-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">H</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Housarr</span>
          </div>
          <button
            className="lg:hidden p-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium',
                    'transition-colors duration-150',
                    isActive
                      ? 'bg-gray-50 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <Icon
                    icon={item.icon}
                    size="sm"
                    className={cn(
                      isActive ? 'text-primary-600' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  <span className="flex-1">{item.name}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary-600" />
                  )}
                </NavLink>
              )
            })}
          </div>
        </nav>

        {/* Footer section */}
        <div className="border-t border-gray-200 p-4">
          {/* User account */}
          <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-600">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex h-16 items-center gap-4 px-4 lg:px-8">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Icon icon={Menu} size="md" />
            </button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">{user?.household?.name || 'My Home'}</span>
              {currentPage && (
                <>
                  <Icon icon={ChevronRight} size="xs" className="text-gray-300" />
                  <span className="font-medium text-gray-900">{currentPage.name}</span>
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
