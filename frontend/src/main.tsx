import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import './index.css'
import { useThemeStore } from './stores/themeStore'
import { queryClient } from './lib/queryClient'

// Initialize theme before render to prevent flash
useThemeStore.getState().initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster 
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            className: 'font-sans',
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
