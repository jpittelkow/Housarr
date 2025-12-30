import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        secure: false,
      },
      '/sanctum': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
        secure: false,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunk splitting - group node_modules by category
          if (id.includes('node_modules')) {
            // React core
            if (id.includes('react-dom') || id.includes('/react/')) {
              return 'vendor-react'
            }
            // Router
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            // TanStack (React Query, Virtual)
            if (id.includes('@tanstack')) {
              return 'vendor-query'
            }
            // Form handling
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
              return 'vendor-form'
            }
            // UI utilities
            if (id.includes('lucide-react') || id.includes('/clsx/') || id.includes('tailwind-merge')) {
              return 'vendor-ui'
            }
            // Utility libraries
            if (id.includes('date-fns') || id.includes('/axios/')) {
              return 'vendor-utils'
            }
            // State management
            if (id.includes('/zustand/')) {
              return 'vendor-state'
            }
            // Toast notifications
            if (id.includes('react-hot-toast')) {
              return 'vendor-toast'
            }
          }

          // Shared app code - common modules used across pages
          if (id.includes('/src/components/ui/')) {
            return 'shared-ui'
          }
          if (id.includes('/src/lib/')) {
            return 'shared-lib'
          }
          if (id.includes('/src/stores/')) {
            return 'shared-stores'
          }
          if (id.includes('/src/services/')) {
            return 'shared-services'
          }
          if (id.includes('/src/types/')) {
            return 'shared-types'
          }
        },
      },
    },
  },
})
