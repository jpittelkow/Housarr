import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import LoginPage from '../LoginPage'

// Mock the auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
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

// Helper to get form elements
const getEmailInput = () => screen.getByPlaceholderText(/enter your email/i)
const getPasswordInput = () => screen.getByPlaceholderText(/enter your password/i)

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders login form', () => {
      renderLoginPage()
      
      expect(getEmailInput()).toBeInTheDocument()
      expect(getPasswordInput()).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
    })

    it('renders email and password labels', () => {
      renderLoginPage()
      
      expect(screen.getByText('Email')).toBeInTheDocument()
      expect(screen.getByText('Password')).toBeInTheDocument()
    })

    it('renders registration link', () => {
      renderLoginPage()
      
      expect(screen.getByRole('link', { name: /sign up/i })).toBeInTheDocument()
    })

    it('renders welcome message', () => {
      renderLoginPage()
      
      expect(screen.getByText('Welcome back')).toBeInTheDocument()
    })

    it('renders Housarr logo text', () => {
      renderLoginPage()
      
      expect(screen.getByText('Housarr')).toBeInTheDocument()
    })
  })

  describe('form interactions', () => {
    it('allows typing in email field', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const emailInput = getEmailInput()
      await user.type(emailInput, 'test@example.com')
      
      expect(emailInput).toHaveValue('test@example.com')
    })

    it('allows typing in password field', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const passwordInput = getPasswordInput()
      await user.type(passwordInput, 'password123')
      
      expect(passwordInput).toHaveValue('password123')
    })

    it('submit button exists and is clickable', async () => {
      const user = userEvent.setup()
      renderLoginPage()
      
      const submitButton = screen.getByRole('button', { name: /sign in/i })
      expect(submitButton).not.toBeDisabled()
      
      // Click without filling form - should not throw
      await user.click(submitButton)
    })
  })

  describe('accessibility', () => {
    it('has proper form inputs', () => {
      renderLoginPage()
      
      const emailInput = getEmailInput()
      const passwordInput = getPasswordInput()
      
      expect(emailInput).toHaveAttribute('type', 'email')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('has autocomplete attributes', () => {
      renderLoginPage()
      
      const emailInput = getEmailInput()
      const passwordInput = getPasswordInput()
      
      expect(emailInput).toHaveAttribute('autocomplete', 'email')
      expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })

    it('submit button is focusable', () => {
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
