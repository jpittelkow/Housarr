import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  describe('rendering', () => {
    it('renders an input element', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('renders with label when provided', () => {
      render(<Input label="Email" />)
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    })

    it('renders with placeholder', () => {
      render(<Input placeholder="Enter text" />)
      expect(screen.getByPlaceholderText(/enter text/i)).toBeInTheDocument()
    })
  })

  describe('types', () => {
    it('renders as text input by default', () => {
      render(<Input />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })

    it('renders as email input', () => {
      render(<Input type="email" />)
      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('renders as password input', () => {
      render(<Input type="password" />)
      // Password inputs don't have textbox role
      expect(document.querySelector('input[type="password"]')).toBeInTheDocument()
    })

    it('renders as number input', () => {
      render(<Input type="number" />)
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })
  })

  describe('interactions', () => {
    it('calls onChange when typing', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<Input onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), 'hello')
      
      expect(handleChange).toHaveBeenCalled()
    })

    it('updates value when typing', async () => {
      const user = userEvent.setup()
      
      render(<Input />)
      const input = screen.getByRole('textbox')
      await user.type(input, 'test value')
      
      expect(input).toHaveValue('test value')
    })

    it('calls onBlur when focus leaves', async () => {
      const user = userEvent.setup()
      const handleBlur = vi.fn()
      
      render(<Input onBlur={handleBlur} />)
      const input = screen.getByRole('textbox')
      await user.click(input)
      await user.tab()
      
      expect(handleBlur).toHaveBeenCalled()
    })
  })

  describe('error state', () => {
    it('shows error message when provided', () => {
      render(<Input error="This field is required" />)
      expect(screen.getByText(/this field is required/i)).toBeInTheDocument()
    })

    it('applies error styles when error is present', () => {
      render(<Input error="Error" />)
      const input = screen.getByRole('textbox')
      expect(input).toHaveClass('border-error-500')
    })
  })

  describe('disabled state', () => {
    it('is disabled when disabled prop is true', () => {
      render(<Input disabled />)
      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('does not allow typing when disabled', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<Input disabled onChange={handleChange} />)
      await user.type(screen.getByRole('textbox'), 'test')
      
      expect(handleChange).not.toHaveBeenCalled()
    })
  })

  describe('required state', () => {
    it('marks input as required when required prop is true', () => {
      render(<Input required />)
      expect(screen.getByRole('textbox')).toBeRequired()
    })
  })

  describe('accessibility', () => {
    it('associates label with input using htmlFor', () => {
      render(<Input label="Username" id="username" />)
      const input = screen.getByLabelText(/username/i)
      expect(input).toHaveAttribute('id', 'username')
    })

    it('can be focused', async () => {
      const user = userEvent.setup()
      render(<Input label="Focusable" />)
      
      await user.tab()
      
      expect(screen.getByRole('textbox')).toHaveFocus()
    })

    it('announces error to screen readers', () => {
      render(<Input error="Invalid input" aria-describedby="error-msg" />)
      expect(screen.getByText(/invalid input/i)).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('allows custom className on wrapper', () => {
      const { container } = render(<Input className="custom-class" />)
      expect(container.querySelector('.custom-class')).toBeInTheDocument()
    })
  })
})
