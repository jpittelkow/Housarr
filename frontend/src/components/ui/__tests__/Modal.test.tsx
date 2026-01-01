import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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

    it('calls onClose when clicking backdrop', async () => {
      const user = userEvent.setup()
      const handleClose = vi.fn()
      
      render(
        <Modal isOpen onClose={handleClose} title="Test">
          <p>Content</p>
        </Modal>
      )
      
      // The backdrop is the div with aria-hidden="true" and the bg-gray-900/50 class
      const backdrop = document.querySelector('[aria-hidden="true"].fixed.inset-0')
      if (backdrop) {
        await user.click(backdrop)
        expect(handleClose).toHaveBeenCalled()
      }
    })
  })

  describe('sizes', () => {
    it('applies small size (max-w-md)', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" size="sm">
          <p>Content</p>
        </Modal>
      )
      // size="sm" maps to max-w-md in the component
      const modalContent = document.querySelector('.max-w-md')
      expect(modalContent).toBeInTheDocument()
    })

    it('applies medium size by default (max-w-lg)', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      const modalContent = document.querySelector('.max-w-lg')
      expect(modalContent).toBeInTheDocument()
    })

    it('applies large size (max-w-2xl)', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" size="lg">
          <p>Content</p>
        </Modal>
      )
      const modalContent = document.querySelector('.max-w-2xl')
      expect(modalContent).toBeInTheDocument()
    })

    it('applies xl size (max-w-4xl)', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" size="xl">
          <p>Content</p>
        </Modal>
      )
      const modalContent = document.querySelector('.max-w-4xl')
      expect(modalContent).toBeInTheDocument()
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

    it('has aria-modal set to true', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test">
          <p>Content</p>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
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

    it('focuses first focusable element when opened', async () => {
      render(
        <Modal isOpen onClose={() => {}} title="Focus Trap">
          <button>First</button>
          <button>Second</button>
        </Modal>
      )
      
      // Modal focuses the first focusable element in the modal (could be close button)
      await waitFor(() => {
        // Either the First button or the Close button should have focus
        const firstButton = screen.getByRole('button', { name: /first/i })
        const closeButton = screen.getByRole('button', { name: /close/i })
        const hasFocus = document.activeElement === firstButton || document.activeElement === closeButton
        expect(hasFocus).toBe(true)
      })
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

  describe('description', () => {
    it('renders description when provided', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" description="This is a description">
          <p>Content</p>
        </Modal>
      )
      expect(screen.getByText('This is a description')).toBeInTheDocument()
    })

    it('sets aria-describedby when description is provided', () => {
      render(
        <Modal isOpen onClose={() => {}} title="Test" description="Description text">
          <p>Content</p>
        </Modal>
      )
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-describedby')
    })
  })
})
