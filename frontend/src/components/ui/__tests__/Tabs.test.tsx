import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, type Tab } from '../Tabs'

const mockTabs: Tab[] = [
  { id: 'tab1', label: 'Tab 1' },
  { id: 'tab2', label: 'Tab 2' },
  { id: 'tab3', label: 'Tab 3' },
]

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders all tab buttons', () => {
      render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      expect(screen.getByRole('button', { name: /tab 1/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tab 2/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /tab 3/i })).toBeInTheDocument()
    })

    it('highlights active tab', () => {
      render(<Tabs tabs={mockTabs} activeTab="tab2" onTabChange={vi.fn()} />)
      
      const tab1 = screen.getByRole('button', { name: /tab 1/i })
      const tab2 = screen.getByRole('button', { name: /tab 2/i })
      
      // Inactive tab should NOT have aria-current attribute
      expect(tab1).not.toHaveAttribute('aria-current')
      // Active tab should have aria-current="page"
      expect(tab2).toHaveAttribute('aria-current', 'page')
    })

    it('has mobile scrolling classes for horizontal overflow', () => {
      const { container } = render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const nav = container.querySelector('nav')
      expect(nav).toHaveClass('overflow-x-auto', 'scrollbar-hide', 'flex-nowrap')
      expect(nav).toHaveStyle({ WebkitOverflowScrolling: 'touch' })
    })

    it('has proper touch target size for mobile', () => {
      const { container } = render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const buttons = container.querySelectorAll('button')
      buttons.forEach((button) => {
        expect(button).toHaveClass('flex-shrink-0', 'min-h-[44px]')
      })
    })
  })

  describe('tab switching', () => {
    it('calls onTabChange when clicking different tab', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={handleChange} />)
      
      await user.click(screen.getByRole('button', { name: /tab 2/i }))
      
      expect(handleChange).toHaveBeenCalledWith('tab2')
    })

    it('updates aria-current attribute on tab change', () => {
      const { rerender } = render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const tab1 = screen.getByRole('button', { name: /tab 1/i })
      const tab2 = screen.getByRole('button', { name: /tab 2/i })
      
      expect(tab1).toHaveAttribute('aria-current', 'page')
      expect(tab2).not.toHaveAttribute('aria-current')
      
      rerender(<Tabs tabs={mockTabs} activeTab="tab2" onTabChange={vi.fn()} />)
      
      expect(tab1).not.toHaveAttribute('aria-current')
      expect(tab2).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('styling', () => {
    it('applies active tab styles', () => {
      render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const activeTab = screen.getByRole('button', { name: /tab 1/i })
      expect(activeTab).toHaveClass('border-primary-500', 'text-primary-600')
    })

    it('applies inactive tab styles', () => {
      render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const inactiveTab = screen.getByRole('button', { name: /tab 2/i })
      expect(inactiveTab).toHaveClass('border-transparent', 'text-gray-500')
    })
  })

  describe('icons and badges', () => {
    it('renders badge when provided', () => {
      const tabsWithBadge: Tab[] = [
        { id: 'tab1', label: 'Tab 1', badge: 5 },
        { id: 'tab2', label: 'Tab 2' },
      ]
      
      render(<Tabs tabs={tabsWithBadge} activeTab="tab1" onTabChange={vi.fn()} />)
      
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('applies custom className', () => {
      const { container } = render(
        <Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} className="custom-class" />
      )
      
      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('has nav with aria-label', () => {
      render(<Tabs tabs={mockTabs} activeTab="tab1" onTabChange={vi.fn()} />)
      
      const nav = screen.getByRole('navigation', { name: /tabs/i })
      expect(nav).toBeInTheDocument()
    })
  })
})
