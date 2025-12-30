import { queryClient } from './queryClient'
import { dashboard, items, categories, locations, vendors, reminders, todos } from '@/services/api'

// Preload all protected page modules
function preloadModules(): Promise<unknown[]> {
  return Promise.all([
    import('@/pages/DashboardPage'),
    import('@/pages/ItemsPage'),
    import('@/pages/ItemDetailPage'),
    import('@/pages/SmartAddPage'),
    import('@/pages/VendorsPage'),
    import('@/pages/RemindersPage'),
    import('@/pages/TodosPage'),
    import('@/pages/SettingsPage'),
    import('@/pages/ProfilePage'),
    import('@/pages/HelpPage'),
  ])
}

// Prefetch all common data into React Query cache
function prefetchData(): Promise<void[]> {
  return Promise.all([
    // Dashboard data
    queryClient.prefetchQuery({
      queryKey: ['dashboard'],
      queryFn: () => dashboard.get(),
    }),
    // Items list (default state: no search, no category filter)
    queryClient.prefetchQuery({
      queryKey: ['items', { search: undefined, category_id: '' }],
      queryFn: () => items.list({}),
    }),
    // Categories (used by multiple pages)
    queryClient.prefetchQuery({
      queryKey: ['categories'],
      queryFn: () => categories.list(),
    }),
    // Locations (used by multiple pages)
    queryClient.prefetchQuery({
      queryKey: ['locations'],
      queryFn: () => locations.list(),
    }),
    // Vendors
    queryClient.prefetchQuery({
      queryKey: ['vendors'],
      queryFn: () => vendors.list(),
    }),
    // Reminders (default filter: empty object)
    queryClient.prefetchQuery({
      queryKey: ['reminders', {}],
      queryFn: () => reminders.list(),
    }),
    // Todos (default filter: empty object)
    queryClient.prefetchQuery({
      queryKey: ['todos', {}],
      queryFn: () => todos.list(),
    }),
  ])
}

// Preload everything - modules and data in parallel
export async function preloadProtectedPages(): Promise<void> {
  await Promise.all([
    preloadModules(),
    prefetchData(),
  ])
}
