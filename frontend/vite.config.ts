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
          // Simplified vendor chunking to avoid load order issues
          // React ecosystem (react, react-dom, react-router, tanstack, zustand) 
          // must stay together to ensure proper initialization order
          if (id.includes('node_modules')) {
            // React ecosystem - keep together to avoid createContext errors
            if (
              id.includes('/react/') ||
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('@tanstack') ||
              id.includes('/zustand/') ||
              id.includes('use-sync-external-store')
            ) {
              return 'vendor-react'
            }
            // Form handling (depends on React but loaded lazily with forms)
            if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('/zod/')) {
              return 'vendor-form'
            }
            // UI utilities (no React dependency issues)
            if (id.includes('lucide-react') || id.includes('/clsx/') || id.includes('tailwind-merge')) {
              return 'vendor-ui'
            }
            // Pure utility libraries (no React)
            if (id.includes('date-fns') || id.includes('/axios/')) {
              return 'vendor-utils'
            }
          }
        },
      },
    },
  },
})
