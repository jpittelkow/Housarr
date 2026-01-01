import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AIAgentCard } from '../AIAgentCard'
import type { AIAgent } from '@/services/api'

// Mock the API service
vi.mock('@/services/api', async () => {
  const actual = await vi.importActual('@/services/api')
  return {
    ...actual,
    settings: {
      getAvailableModels: vi.fn(),
      updateAgent: vi.fn(),
      testAgent: vi.fn(),
      setPrimaryAgent: vi.fn(),
    },
  }
})

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const createTestQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
}

const mockAgent: AIAgent = {
  name: 'openai',
  display_name: 'OpenAI',
  enabled: true,
  configured: true,
  available: true,
  model: null,
  default_model: 'gpt-4o',
  last_success_at: null,
  last_test: null,
  is_primary: false,
}

describe('AIAgentCard', () => {
  let queryClient: QueryClient
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  const renderComponent = (agent: AIAgent, hasApiKey = false) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AIAgentCard agent={agent} hasApiKey={hasApiKey} onRefresh={vi.fn()} />
      </QueryClientProvider>
    )
  }

  it('renders agent card with basic information', () => {
    renderComponent(mockAgent)

    expect(screen.getByText('OpenAI')).toBeInTheDocument()
  })

  it('shows agent enabled status', () => {
    renderComponent(mockAgent)
    
    // Should have a toggle (switch) for enabling/disabling
    const toggle = screen.getByRole('switch')
    expect(toggle).toBeChecked()
  })

  it('shows configuration status badges', () => {
    renderComponent(mockAgent)
    
    // Should show status badges
    expect(screen.getByText('Configured')).toBeInTheDocument()
  })

  it('expands when clicking the chevron button', async () => {
    renderComponent(mockAgent, true)

    // Find the expand button (it's the last button in the header area)
    const buttons = screen.getAllByRole('button')
    const expandButton = buttons[buttons.length - 1] // The chevron button

    await user.click(expandButton)

    // After expanding, should show the configuration section
    await waitFor(() => {
      expect(screen.getByText('API Key')).toBeInTheDocument()
    })
  })

  it('shows API key as saved when hasApiKey is true', async () => {
    renderComponent(mockAgent, true)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(screen.getByText(/API key saved/)).toBeInTheDocument()
    })
  })

  it('shows API key input when hasApiKey is false', async () => {
    const agentWithoutKey = { ...mockAgent, configured: false }
    renderComponent(agentWithoutKey, false)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    await waitFor(() => {
      // Should show an input for API key
      const apiKeyInput = document.querySelector('input[type="password"]')
      expect(apiKeyInput).toBeInTheDocument()
    })
  })

  it('fetches models when card is expanded', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockResolvedValue({
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    })

    renderComponent(mockAgent, true)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    // Wait for models to be fetched
    await waitFor(() => {
      expect(settings.getAvailableModels).toHaveBeenCalledWith('openai')
    })
  })

  it('shows loading state while fetching models', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ models: [] }), 500))
    )

    renderComponent(mockAgent, true)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    // Should show loading message briefly
    await waitFor(() => {
      expect(screen.getByText(/Loading available models/)).toBeInTheDocument()
    })
  })

  it('shows model selector when models are loaded', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockResolvedValue({
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    })

    renderComponent(mockAgent, true)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    // Wait for models to load and select to appear
    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i)
      expect(modelSelect).toBeInTheDocument()
    })
  })

  it('shows test connection button when configured', async () => {
    renderComponent(mockAgent, true)

    // Expand the card
    const buttons = screen.getAllByRole('button')
    await user.click(buttons[buttons.length - 1])

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument()
    })
  })

  it('disables primary star button when not configured', () => {
    const unconfiguredAgent = { ...mockAgent, configured: false }
    renderComponent(unconfiguredAgent, false)

    // The star button should be disabled (it's the first button)
    const starButton = screen.getAllByRole('button')[0]
    expect(starButton).toBeDisabled()
  })

  it('shows primary badge when agent is primary', () => {
    const primaryAgent = { ...mockAgent, is_primary: true }
    renderComponent(primaryAgent, true)

    expect(screen.getByText('Primary')).toBeInTheDocument()
  })
})

