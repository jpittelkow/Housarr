import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tooltip, HelpTooltip } from '../Tooltip'

describe('Tooltip', () => {
  describe('rendering', () => {
    it('renders trigger element', () => {
      render(
        <Tooltip content="Tooltip text">
          <span>Hover me</span>
        </Tooltip>
      )
      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Hover me')).toBeInTheDocument()
    })

    it('does not show tooltip content initially', () => {
      render(
        <Tooltip content="Tooltip text">
          <span>Hover me</span>
        </Tooltip>
      )
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  describe('show/hide behavior', () => {
    it('shows tooltip on hover', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content">
          <span>Hover me</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      expect(screen.getByText('Tooltip content')).toBeInTheDocument()
    })

    it('hides tooltip when mouse leaves', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content">
          <span>Hover me</span>
        </Tooltip>
      )
      
      const button = screen.getByRole('button')
      await user.hover(button)
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      
      await user.unhover(button)
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })
    })

    it('shows tooltip on focus', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content">
          <span>Focus me</span>
        </Tooltip>
      )
      
      await user.tab()
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
    })

    it('hides tooltip on blur', async () => {
      const user = userEvent.setup()
      
      render(
        <>
          <Tooltip content="Tooltip content">
            <span>Focus me</span>
          </Tooltip>
          <button>Other button</button>
        </>
      )
      
      await user.tab() // Focus first button (Tooltip wrapper)
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      
      await user.tab() // Focus other button
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })
    })
  })

  describe('keyboard interaction', () => {
    it('hides tooltip on Escape key', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content">
          <span>Press Escape</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument()
      })
      
      await user.keyboard('{Escape}')
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
      })
    })
  })

  describe('positioning', () => {
    it('renders with default top position', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content" position="top">
          <span>Hover me</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveClass('bottom-full')
      })
    })

    it('renders with bottom position', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content" position="bottom">
          <span>Hover me</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveClass('top-full')
      })
    })

    it('renders with left position', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content" position="left">
          <span>Hover me</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveClass('right-full')
      })
    })

    it('renders with right position', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Tooltip content" position="right">
          <span>Hover me</span>
        </Tooltip>
      )
      
      await user.hover(screen.getByRole('button'))
      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip')
        expect(tooltip).toHaveClass('left-full')
      })
    })
  })

  describe('accessibility', () => {
    it('has proper aria attributes', async () => {
      const user = userEvent.setup()
      
      render(
        <Tooltip content="Accessible tooltip">
          <span>Accessible</span>
        </Tooltip>
      )
      
      const button = screen.getByRole('button')
      await user.hover(button)
      
      await waitFor(() => {
        expect(button).toHaveAttribute('aria-describedby')
        expect(screen.getByRole('tooltip')).toHaveAttribute('id')
      })
    })
  })
})

describe('HelpTooltip', () => {
  it('renders help icon as trigger', () => {
    render(<HelpTooltip>Help text</HelpTooltip>)
    // HelpTooltip renders a button with a help icon
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('shows tooltip content on hover', async () => {
    const user = userEvent.setup()
    
    render(<HelpTooltip>Help information</HelpTooltip>)
    
    await user.hover(screen.getByRole('button'))
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('Help information')).toBeInTheDocument()
    })
  })

  it('accepts position prop', async () => {
    const user = userEvent.setup()
    
    render(<HelpTooltip position="right">Help</HelpTooltip>)
    
    await user.hover(screen.getByRole('button'))
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('left-full')
    })
  })
})
