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

  it('shows text input for model when no API key is configured', () => {
    const agentWithoutKey = { ...mockAgent, configured: false }
    renderComponent(agentWithoutKey, false)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    user.click(expandButton)

    // Should show text input when models can't be fetched
    const modelInput = screen.getByLabelText(/model/i)
    expect(modelInput).toBeInTheDocument()
    expect(modelInput.tagName).toBe('INPUT')
  })

  it('fetches and displays models in dropdown when agent is expanded and configured', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockResolvedValue({
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    })

    renderComponent(mockAgent, true)

    // Expand the card
    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    // Wait for models to be fetched and dropdown to appear
    await waitFor(() => {
      expect(settings.getAvailableModels).toHaveBeenCalledWith('openai')
    })

    // Should show select dropdown
    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i)
      expect(modelSelect).toBeInTheDocument()
      expect(modelSelect.tagName).toBe('SELECT')
    })
  })

  it('shows loading state while fetching models', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ models: [] }), 100))
    )

    renderComponent(mockAgent, true)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    // Should show loading message
    await waitFor(() => {
      expect(screen.getByText(/loading available models/i)).toBeInTheDocument()
    })
  })

  it('falls back to text input when model fetch fails', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockRejectedValue(new Error('API Error'))

    renderComponent(mockAgent, true)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    // Should fall back to text input after error
    await waitFor(() => {
      const modelInput = screen.getByLabelText(/model/i)
      expect(modelInput).toBeInTheDocument()
      expect(modelInput.tagName).toBe('INPUT')
    })
  })

  it('allows selecting a model from dropdown', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockResolvedValue({
      models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    })

    renderComponent(mockAgent, true)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i) as HTMLSelectElement
      expect(modelSelect).toBeInTheDocument()
    })

    const modelSelect = screen.getByLabelText(/model/i) as HTMLSelectElement
    await user.selectOptions(modelSelect, 'gpt-4-turbo')

    expect(modelSelect.value).toBe('gpt-4-turbo')
  })

  it('allows switching to custom model input', async () => {
    const { settings } = await import('@/services/api')
    vi.mocked(settings.getAvailableModels).mockResolvedValue({
      models: ['gpt-4o', 'gpt-4-turbo'],
    })

    renderComponent(mockAgent, true)

    const expandButton = screen.getByRole('button', { name: /expand/i })
    await user.click(expandButton)

    await waitFor(() => {
      const modelSelect = screen.getByLabelText(/model/i) as HTMLSelectElement
      expect(modelSelect).toBeInTheDocument()
    })

    const modelSelect = screen.getByLabelText(/model/i) as HTMLSelectElement
    await user.selectOptions(modelSelect, '__CUSTOM__')

    // Should show custom input
    await waitFor(() => {
      const customInput = screen.getByLabelText(/custom model/i)
      expect(customInput).toBeInTheDocument()
    })
  })
})
