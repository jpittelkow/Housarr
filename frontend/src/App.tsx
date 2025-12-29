import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'

// Direct imports for instant loading
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'

// Lazy load protected pages for code splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const ItemsPage = lazy(() => import('@/pages/ItemsPage'))
const ItemDetailPage = lazy(() => import('@/pages/ItemDetailPage'))
const SmartAddPage = lazy(() => import('@/pages/SmartAddPage'))
const VendorsPage = lazy(() => import('@/pages/VendorsPage'))
const RemindersPage = lazy(() => import('@/pages/RemindersPage'))
const TodosPage = lazy(() => import('@/pages/TodosPage'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage'))
const ProfilePage = lazy(() => import('@/pages/ProfilePage'))
const HelpPage = lazy(() => import('@/pages/HelpPage'))

// Preload all protected pages after login
export function preloadProtectedPages() {
  import('@/pages/DashboardPage')
  import('@/pages/ItemsPage')
  import('@/pages/ItemDetailPage')
  import('@/pages/SmartAddPage')
  import('@/pages/VendorsPage')
  import('@/pages/RemindersPage')
  import('@/pages/TodosPage')
  import('@/pages/SettingsPage')
  import('@/pages/ProfilePage')
  import('@/pages/HelpPage')
}

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
      </div>
    </div>
  )
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth, isLoading } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="items" element={<ItemsPage />} />
            <Route path="items/:id" element={<ItemDetailPage />} />
            <Route path="smart-add" element={<SmartAddPage />} />
            <Route path="vendors" element={<VendorsPage />} />
            <Route path="reminders" element={<RemindersPage />} />
            <Route path="todos" element={<TodosPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="help" element={<HelpPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}

export default App
