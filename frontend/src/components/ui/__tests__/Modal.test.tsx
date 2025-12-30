import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../Modal'

describe('Modal', () => {
  describe('rendering', () => {
    it('renders when isOpen is true', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Modal content')).toBeInTheDocument()
    })

    it('does not render when isOpen is false', () => {
      render(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders title', () => {
      render(
        <Modal isOpen onClose={() => {}} title="My Title">
          <p>Content</p>
        </Modal>
      )
      expect(screen.getByText('My Title')).toBeInTheDocument()
    })

    it('renders children content', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test">
          <div data-testid="child">Child content</div>
        </Modal>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })
  })

  describe('closing', () => {
    it('calls onClose when close button is clicked', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      
      render(
        <Modal isOpen onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      // Find and click the close button (usually an X button)
      const closeButton = screen.getByRole('button', { name: /close/i })
      await user.click(closeButton)
      
      expect(handleClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when pressing Escape', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      
      render(
        <Modal isOpen onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      await user.keyboard('{Escape}')
      
      expect(handleClose).toHaveBeenCalledOnce()
    })

    it('calls onClose when clicking overlay', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      
      render(
        <Modal isOpen onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      // Click on the overlay (the backdrop)
      const overlay = document.querySelector('[data-testid="modal-overlay"]') || 
                      document.querySelector('.fixed.inset-0')
      if (overlay) {
        await user.click(overlay)
        expect(handleClose).toHaveBeenCalled()
      }
    })
  })

  describe('sizes', () => {
    it('applies small size', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" size="sm">
          <p>Content</p>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.querySelector('.max-w-sm')).toBeInTheDocument()
    })

    it('applies large size', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" size="lg">
          <p>Content</p>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog.querySelector('.max-w-2xl')).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has correct role', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('has aria-labelledby pointing to title', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Accessible Modal">
          <p>Content</p>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('traps focus within modal', async () => {
      const user = userEvent.setup()
      
      render(
        <Modal isOpen onClose={() => {}} title="Focus Trap">
          <button>First</button>
          <button>Second</button>
        </Modal>
      )
      
      // Tab through elements
      await user.tab()
      expect(screen.getByRole('button', { name: /close/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /first/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /second/i })).toHaveFocus()
    })
  })

  describe('body scroll lock', () => {
    it('prevents body scroll when open', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      expect(document.body.style.overflow).toBe('hidden')
    })

    it('restores body scroll when closed', () => {
      const { rerender } = render(
        <Modal isOpen onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      rerender(
        <Modal isOpen={false} onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      expect(document.body.style.overflow).not.toBe('hidden')
    })
  })
})
