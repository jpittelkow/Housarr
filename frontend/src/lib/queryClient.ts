import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30 seconds - keeps UI responsive after mutations
      staleTime: 1000 * 30,
      // Keep unused data in cache for 10 minutes
      gcTime: 1000 * 60 * 10,
      // Only retry once on failure
      retry: 1,
      // Refetch on window focus to keep data fresh
      refetchOnWindowFocus: true,
      // Refetch when network reconnects
      refetchOnReconnect: true,
    },
  },
})
