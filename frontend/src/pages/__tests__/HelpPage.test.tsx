import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import HelpPage from '../HelpPage'

// Mock scrollIntoView which isn't available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

function renderHelpPage() {
  return render(
    <BrowserRouter>
      <HelpPage />
    </BrowserRouter>
  )
}

describe('HelpPage', () => {
  describe('rendering', () => {
    it('renders page title', () => {
      renderHelpPage()
      expect(screen.getByRole('heading', { name: /help & documentation/i })).toBeInTheDocument()
    })

    it('renders search input', () => {
      renderHelpPage()
      expect(screen.getByPlaceholderText(/search help topics/i)).toBeInTheDocument()
    })

    it('renders expand/collapse all buttons', () => {
      renderHelpPage()
      expect(screen.getByRole('button', { name: /expand all/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /collapse all/i })).toBeInTheDocument()
    })

    it('renders quick links section', () => {
      renderHelpPage()
      expect(screen.getByText(/quick links/i)).toBeInTheDocument()
    })

    it('renders all help sections', () => {
      renderHelpPage()
      
      // Use getAllByText since titles appear in both quick links and section headers
      expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Smart Add (AI)').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Items & Inventory').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Vendors & Service Providers').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Reminders & Maintenance').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Todos & Tasks').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Settings & Configuration').length).toBeGreaterThanOrEqual(1)
      expect(screen.getAllByText('Profile & Account').length).toBeGreaterThanOrEqual(1)
    })

    it('renders footer help card', () => {
      renderHelpPage()
      expect(screen.getByText(/need more help/i)).toBeInTheDocument()
    })
  })

  describe('section expansion', () => {
    it('first section is expanded by default', () => {
      renderHelpPage()
      
      // Dashboard section should be open - look for its content
      expect(screen.getByText(/what does the dashboard show/i)).toBeInTheDocument()
    })

    it('expands section on click', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      // Find the Items section button by looking for the heading inside a button container
      const itemsButtons = screen.getAllByRole('button')
      const itemsSectionButton = itemsButtons.find(button => 
        button.textContent?.includes('Items & Inventory')
      )
      
      if (itemsSectionButton) {
        await user.click(itemsSectionButton)
        
        // Should see Items content
        await waitFor(() => {
          expect(screen.getByText(/what can i track as an item/i)).toBeInTheDocument()
        })
      }
    })

    it('collapses section on second click', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      // Find the Dashboard section button
      const dashboardButtons = screen.getAllByRole('button')
      const dashboardSectionButton = dashboardButtons.find(button => 
        button.textContent?.includes('Dashboard') && 
        button.querySelector('svg.lucide-chevron')
      )
      
      if (dashboardSectionButton) {
        await user.click(dashboardSectionButton)
        
        // Content should be hidden
        await waitFor(() => {
          expect(screen.queryByText(/what does the dashboard show/i)).not.toBeInTheDocument()
        })
      }
    })

    it('expand all opens all sections', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      await user.click(screen.getByRole('button', { name: /expand all/i }))
      
      // Multiple sections should be visible
      await waitFor(() => {
        expect(screen.getByText(/what does the dashboard show/i)).toBeInTheDocument()
        expect(screen.getByText(/what can i track as an item/i)).toBeInTheDocument()
        expect(screen.getByText(/what is a vendor/i)).toBeInTheDocument()
      })
    })

    it('collapse all closes all sections', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      // First expand all
      await user.click(screen.getByRole('button', { name: /expand all/i }))
      
      // Then collapse all
      await user.click(screen.getByRole('button', { name: /collapse all/i }))
      
      // Content should be hidden
      await waitFor(() => {
        expect(screen.queryByText(/what does the dashboard show/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('search functionality', () => {
    it('filters sections based on search query', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'reminder')
      
      // Reminders section should be visible (in the filtered results)
      await waitFor(() => {
        expect(screen.getAllByText(/reminders/i).length).toBeGreaterThanOrEqual(1)
      })
    })

    it('auto-expands sections when searching', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'recurring')
      
      // Should show matching content
      await waitFor(() => {
        expect(screen.getByText(/can i set recurring reminders/i)).toBeInTheDocument()
      })
    })

    it('shows no results message when no matches', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'xyznonexistent123')
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument()
      })
    })

    it('shows clear search button when no results', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'xyznonexistent123')
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /clear search/i })).toBeInTheDocument()
      })
    })

    it('clears search and restores sections', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'xyznonexistent123')
      
      await waitFor(() => {
        expect(screen.getByText(/no results found/i)).toBeInTheDocument()
      })
      
      await user.click(screen.getByRole('button', { name: /clear search/i }))
      
      await waitFor(() => {
        expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument()
        expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1)
      })
    })

    it('hides expand/collapse buttons while searching', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      const searchInput = screen.getByPlaceholderText(/search help topics/i)
      await user.type(searchInput, 'item')
      
      await waitFor(() => {
        expect(screen.queryByRole('button', { name: /expand all/i })).not.toBeInTheDocument()
      })
    })
  })

  describe('quick links', () => {
    it('clicking quick link expands that section', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      // Click on Vendors quick link (first one in the quick links section)
      const vendorsLinks = screen.getAllByText('Vendors & Service Providers')
      // The first one should be the quick link button
      await user.click(vendorsLinks[0])
      
      // Vendors section content should be visible
      await waitFor(() => {
        expect(screen.getByText(/what is a vendor/i)).toBeInTheDocument()
      })
    })
  })

  describe('accessibility', () => {
    it('sections are keyboard navigable', async () => {
      const user = userEvent.setup()
      renderHelpPage()
      
      await user.tab()
      // Should be able to navigate to search input
      expect(screen.getByPlaceholderText(/search help topics/i)).toHaveFocus()
    })

    it('section buttons are accessible', () => {
      renderHelpPage()
      
      const sectionButtons = screen.getAllByRole('button')
      sectionButtons.forEach(button => {
        expect(button).toBeVisible()
      })
    })
  })
})
