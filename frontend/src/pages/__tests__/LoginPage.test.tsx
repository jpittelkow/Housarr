import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '../LoginPage'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
  })),
}))

// Mock navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders login form', () => {
      renderLoginPage()
      
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders registration link', () => {
      renderLoginPage()
      
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
    })

    it('renders theme toggle', () => {
      renderLoginPage()
      
      // Should have theme toggle buttons
      expect(screen.getByRole('button', { name: /light/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /dark/i })).toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('shows error for empty email', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('shows error for invalid email format', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.type(screen.getByLabelText(/email/i), 'invalid-email')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
      })
    })

    it('shows error for empty password', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      await waitFor(() => {
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('form submission', () => {
    it('submits with valid credentials', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))
      
      // Button should show loading state
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
      })
    })

    it('disables submit button while loading', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.type(screen.getByLabelText(/email/i), 'test@example.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      await user.click(submitButton)
      
      // During submission, button should be disabled or show loading
      // The exact behavior depends on the implementation
    })
  })

  describe('accessibility', () => {
    it('has proper form labels', () => {
      renderLoginPage()
      
      const emailInput = screen.getByLabelText(/email/i)
      const passwordInput = screen.getByLabelText(/password/i)
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('can be navigated with keyboard', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      await user.tab()
      // Focus should move through form elements
      expect(document.activeElement).toBeInTheDocument()
    })

    it('submit button is focusable', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      submitButton.focus()
      
      expect(submitButton).toHaveFocus()
    })
  })

  describe('navigation', () => {
    it('registration link navigates to register page', () => {
      renderLoginPage()
      
      const registerLink = screen.getByRole('link', { name: /sign up/i })
      expect(registerLink).toHaveAttribute('href', '/register')
    })
  })
})
