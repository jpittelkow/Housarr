import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect, lazy, Suspense } from 'react'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import Layout from '@/components/Layout'
import { LoadingScreen } from '@/components/ui'

// Auth pages - loaded directly for instant access
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

// Full screen loading component for initial load and preloading
function FullScreenLoader({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center">
        <div className="w-12 h-12 rounded-xl bg-primary-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto" />
        <p className="mt-4 text-sm font-medium text-gray-600 dark:text-gray-300">{message}</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, isPreloading } = useAuthStore()

  if (isLoading) {
    return <FullScreenLoader message="Loading..." />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (isPreloading) {
    return <LoadingScreen title="Getting things ready..." />
  }

  return <>{children}</>
}

function App() {
  const { checkAuth, isAuthenticated, isLoading } = useAuthStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Show loading only on initial auth check
  if (isLoading) {
    return <FullScreenLoader message="Loading..." />
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Auth routes - redirect to home if already logged in */}
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/" replace /> : <RegisterPage />} 
          />
          
          {/* Protected routes */}
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
