import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs, type Tab } from '../Tabs'

const mockTabs: Tab[] = [
  { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
  { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
]

describe('Tabs', () => {
  describe('rendering', () => {
    it('renders all tab buttons', () => {
      render(<Tabs tabs={mockTabs} />)
      
      expect(screen.getByRole('tab', { name: /tab 1/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /tab 2/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /tab 3/i })).toBeInTheDocument()
    })

    it('renders first tab content by default', () => {
      render(<Tabs tabs={mockTabs} />)
      
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument()
    })

    it('renders with defaultTab', () => {
      render(<Tabs tabs={mockTabs} defaultTab="tab2" />)
      
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })

    it('renders tablist role', () => {
      render(<Tabs tabs={mockTabs} />)
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('renders tabpanel role', () => {
      render(<Tabs tabs={mockTabs} />)
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })
  })

  describe('tab switching', () => {
    it('switches content when clicking different tab', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      
      await user.click(screen.getByRole('tab', { name: /tab 2/i }))
      
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument()
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })

    it('calls onChange when tab changes', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<Tabs tabs={mockTabs} onChange={handleChange} />)
      
      await user.click(screen.getByRole('tab', { name: /tab 2/i }))
      
      expect(handleChange).toHaveBeenCalledWith('tab2')
    })

    it('updates aria-selected attribute', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab1 = screen.getByRole('tab', { name: /tab 1/i })
      const tab2 = screen.getByRole('tab', { name: /tab 2/i })
      
      expect(tab1).toHaveAttribute('aria-selected', 'true')
      expect(tab2).toHaveAttribute('aria-selected', 'false')
      
      await user.click(tab2)
      
      expect(tab1).toHaveAttribute('aria-selected', 'false')
      expect(tab2).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('keyboard navigation', () => {
    it('navigates with arrow keys', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab1 = screen.getByRole('tab', { name: /tab 1/i })
      tab1.focus()
      
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: /tab 2/i })).toHaveFocus()
      
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: /tab 3/i })).toHaveFocus()
    })

    it('wraps around with arrow keys', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab3 = screen.getByRole('tab', { name: /tab 3/i })
      tab3.focus()
      
      await user.keyboard('{ArrowRight}')
      expect(screen.getByRole('tab', { name: /tab 1/i })).toHaveFocus()
    })

    it('navigates left with ArrowLeft', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i })
      tab2.focus()
      
      await user.keyboard('{ArrowLeft}')
      expect(screen.getByRole('tab', { name: /tab 1/i })).toHaveFocus()
    })

    it('activates tab with Enter key', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i })
      tab2.focus()
      await user.keyboard('{Enter}')
      
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })

    it('activates tab with Space key', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab2 = screen.getByRole('tab', { name: /tab 2/i })
      tab2.focus()
      await user.keyboard(' ')
      
      expect(screen.getByText('Content 2')).toBeInTheDocument()
    })

    it('navigates to first tab with Home key', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab3 = screen.getByRole('tab', { name: /tab 3/i })
      tab3.focus()
      
      await user.keyboard('{Home}')
      expect(screen.getByRole('tab', { name: /tab 1/i })).toHaveFocus()
    })

    it('navigates to last tab with End key', async () => {
      const user = userEvent.setup()
      render(<Tabs tabs={mockTabs} />)
      
      const tab1 = screen.getByRole('tab', { name: /tab 1/i })
      tab1.focus()
      
      await user.keyboard('{End}')
      expect(screen.getByRole('tab', { name: /tab 3/i })).toHaveFocus()
    })
  })

  describe('disabled tabs', () => {
    it('skips disabled tabs when navigating', async () => {
      const user = userEvent.setup()
      const tabsWithDisabled: Tab[] = [
        { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
        { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div>, disabled: true },
        { id: 'tab3', label: 'Tab 3', content: <div>Content 3</div> },
      ]
      
      render(<Tabs tabs={tabsWithDisabled} />)
      
      const tab1 = screen.getByRole('tab', { name: /tab 1/i })
      tab1.focus()
      
      await user.keyboard('{ArrowRight}')
      // Should skip tab2 and go to tab3
      expect(screen.getByRole('tab', { name: /tab 3/i })).toHaveFocus()
    })

    it('cannot click disabled tab', async () => {
      const user = userEvent.setup()
      const tabsWithDisabled: Tab[] = [
        { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
        { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div>, disabled: true },
      ]
      
      render(<Tabs tabs={tabsWithDisabled} />)
      
      await user.click(screen.getByRole('tab', { name: /tab 2/i }))
      
      // Content should still be tab 1
      expect(screen.getByText('Content 1')).toBeInTheDocument()
      expect(screen.queryByText('Content 2')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('associates tabpanel with selected tab', () => {
      render(<Tabs tabs={mockTabs} />)
      
      const selectedTab = screen.getByRole('tab', { selected: true })
      const tabPanel = screen.getByRole('tabpanel')
      
      expect(tabPanel).toHaveAttribute('aria-labelledby', selectedTab.id)
    })

    it('has proper tabindex on tabs', () => {
      render(<Tabs tabs={mockTabs} />)
      
      const selectedTab = screen.getByRole('tab', { name: /tab 1/i })
      const otherTab = screen.getByRole('tab', { name: /tab 2/i })
      
      expect(selectedTab).toHaveAttribute('tabindex', '0')
      expect(otherTab).toHaveAttribute('tabindex', '-1')
    })
  })
})
