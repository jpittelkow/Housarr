import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AddressInput } from '../AddressInput'

// Mock the api module
vi.mock('@/services/api', () => ({
  address: {
    autocomplete: vi.fn().mockResolvedValue({
      suggestions: [
        {
          place_id: 1,
          display_name: '123 Main Street, Springfield, IL 62701, USA',
          lat: '39.7817',
          lon: '-89.6501',
          type: 'house',
          importance: 0.9,
          address: {
            house_number: '123',
            road: 'Main Street',
            city: 'Springfield',
            state: 'Illinois',
            postcode: '62701',
            country: 'United States',
            country_code: 'us',
          },
        },
        {
          place_id: 2,
          display_name: '456 Oak Avenue, Chicago, IL 60601, USA',
          lat: '41.8781',
          lon: '-87.6298',
          type: 'house',
          importance: 0.85,
          address: {
            house_number: '456',
            road: 'Oak Avenue',
            city: 'Chicago',
            state: 'Illinois',
            postcode: '60601',
            country: 'United States',
            country_code: 'us',
          },
        },
      ],
      count: 2,
    }),
    reverse: vi.fn(),
  },
}))

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  )
}

describe('AddressInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders an input element', () => {
      renderWithClient(<AddressInput {...defaultProps} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with label when provided', () => {
      renderWithClient(<AddressInput {...defaultProps} label="Address" />)
      expect(screen.getByText('Address')).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      renderWithClient(<AddressInput {...defaultProps} placeholder="Enter address" />)
      expect(screen.getByPlaceholderText(/enter address/i)).toBeInTheDocument()
    })

    it('renders with hint text', () => {
      renderWithClient(<AddressInput {...defaultProps} hint="Enter your full address" />)
      expect(screen.getByText(/enter your full address/i)).toBeInTheDocument()
    })

    it('renders with error message', () => {
      renderWithClient(<AddressInput {...defaultProps} error="Address is required" />)
      expect(screen.getByText(/address is required/i)).toBeInTheDocument()
    })

    it('renders with map pin icon', () => {
      const { container } = renderWithClient(<AddressInput {...defaultProps} />)
      // The MapPin icon should be rendered
      expect(container.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onChange when typing', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      renderWithClient(<AddressInput {...defaultProps} onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), 'hello')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('shows initial value', () => {
      renderWithClient(<AddressInput {...defaultProps} value="123 Test St" />)
      expect(screen.getByRole('textbox')).toHaveValue('123 Test St')
    })

    it('updates when value prop changes', () => {
      const { rerender } = renderWithClient(<AddressInput {...defaultProps} value="Old Address" />)
      expect(screen.getByRole('textbox')).toHaveValue('Old Address')
      
      rerender(
        <QueryClientProvider client={new QueryClient()}>
          <AddressInput {...defaultProps} value="New Address" />
        </QueryClientProvider>
      )
      expect(screen.getByRole('textbox')).toHaveValue('New Address')
    })
  })

  describe('autocomplete dropdown', () => {
    it('shows suggestions after typing 3+ characters', async () => {
      const user = userEvent.setup()
      
      renderWithClient(<AddressInput {...defaultProps} />)
      await user.type(screen.getByRole('textbox'), '123 Main')
      
      // Wait for debounce and API call
      await waitFor(() => {
        expect(screen.getByText(/main street/i)).toBeInTheDocument()
      }, { timeout: 1000 })
    })

    it('does not show dropdown for short queries', async () => {
      const user = userEvent.setup()
      
      renderWithClient(<AddressInput {...defaultProps} />)
      await user.type(screen.getByRole('textbox'), 'ab')
      
      // Wait a bit to ensure no dropdown appears
      await new Promise(resolve => setTimeout(resolve, 500))
      expect(screen.queryByText(/main street/i)).not.toBeInTheDocument()
    })

    it('selects suggestion on click', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      renderWithClient(<AddressInput {...defaultProps} onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), '123 Main')
      
      // Wait for suggestions
      await waitFor(() => {
        expect(screen.getByText(/main street/i)).toBeInTheDocument()
      })
      
      // Click on the suggestion
      await user.click(screen.getByText(/main street/i))
      
      // Check that onChange was called with the full address
      expect(handleChange).toHaveBeenCalledWith(
        '123 Main Street, Springfield, IL 62701, USA',
        expect.objectContaining({
          display_name: '123 Main Street, Springfield, IL 62701, USA',
        })
      )
    })
  })

  describe('keyboard navigation', () => {
    it('closes dropdown on Escape', async () => {
      const user = userEvent.setup()
      
      renderWithClient(<AddressInput {...defaultProps} />)
      await user.type(screen.getByRole('textbox'), '123 Main')
      
      // Wait for suggestions
      await waitFor(() => {
        expect(screen.getByText(/main street/i)).toBeInTheDocument()
      })
      
      // Press Escape
      await user.keyboard('{Escape}')
      
      // Dropdown should close
      await waitFor(() => {
        expect(screen.queryByText(/main street/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      renderWithClient(<AddressInput {...defaultProps} disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('does not show dropdown when disabled', async () => {
      const user = userEvent.setup()
      
      renderWithClient(<AddressInput {...defaultProps} disabled />)
      
      // Try to type (will be ignored due to disabled)
      const input = screen.getByRole('textbox')
      await user.click(input)
      
      // No dropdown should appear
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has autocomplete off to prevent browser suggestions', () => {
      renderWithClient(<AddressInput {...defaultProps} />)
      expect(screen.getByRole('textbox')).toHaveAttribute('autocomplete', 'off')
    })
  })
})
