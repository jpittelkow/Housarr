import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter, MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import RoomDetailPage from '../RoomDetailPage'

// Mock scrollIntoView which isn't available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const createMockLocation = (overrides = {}) => ({
  id: 1,
  name: 'Kitchen',
  icon: 'home',
  notes: 'Main kitchen area',
  items_count: 3,
  images: [],
  featured_image: null,
  paint_colors: [],
  ...overrides,
})

const createMockFile = (overrides = {}) => ({
  id: 1,
  url: 'https://example.com/image.jpg',
  original_name: 'room.jpg',
  mime_type: 'image/jpeg',
  is_featured: false,
  ...overrides,
})

const createMockItem = (overrides = {}) => ({
  id: 1,
  name: 'Refrigerator',
  make: 'Samsung',
  model: 'RF28R7551SR',
  household_id: 1,
  category_id: 1,
  location_id: 1,
  category: { id: 1, name: 'Appliances', color: '#6366f1' },
  vendor: null,
  location_obj: { id: 1, name: 'Kitchen' },
  featured_image: null,
  install_date: null,
  ...overrides,
})

const createMockPaintColor = (overrides = {}) => ({
  id: 1,
  brand: 'Sherwin-Williams',
  color_name: 'Agreeable Gray',
  hex_code: '#D0CCC9',
  rgb_r: 208,
  rgb_g: 204,
  rgb_b: 201,
  purchase_url: 'https://example.com/paint',
  product_url: null,
  ...overrides,
})

// Setup MSW server
const server = setupServer(
  http.get('/api/locations/:id', ({ params }) => {
    const { id } = params as { id: string }
    if (id === '1') {
      return HttpResponse.json({
        location: createMockLocation({
          id: 1,
          name: 'Kitchen',
          notes: 'Main kitchen area',
          images: [createMockFile({ id: 1 }), createMockFile({ id: 2 })],
          featured_image: createMockFile({ id: 1, is_featured: true }),
          paint_colors: [createMockPaintColor()],
        }),
      })
    }
    return HttpResponse.json({ message: 'Not found' }, { status: 404 })
  }),
  http.get('/api/items', ({ request }) => {
    const url = new URL(request.url)
    const locationId = url.searchParams.get('location_id')
    if (locationId === '1') {
      return HttpResponse.json({
        items: [
          createMockItem({ id: 1, name: 'Refrigerator' }),
          createMockItem({ id: 2, name: 'Dishwasher' }),
        ],
      })
    }
    return HttpResponse.json({ items: [] })
  }),
  http.get('/api/auth/user', () => {
    return HttpResponse.json({ user: { id: 1, name: 'Test User', email: 'test@example.com', household_id: 1 } })
  }),
)

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'warn' })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

function renderRoomDetailPage(roomId = '1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/rooms/${roomId}`]}>
        <RoomDetailPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('RoomDetailPage', () => {
  describe('rendering', () => {
    it('renders room name', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText('Kitchen')).toBeInTheDocument()
      })
    })

    it('renders room notes', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText('Main kitchen area')).toBeInTheDocument()
      })
    })

    it('displays room photos section', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText(/room photos/i)).toBeInTheDocument()
      })
    })

    it('displays items in room section', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText(/items in this room/i)).toBeInTheDocument()
      })
    })

    it('displays paint colors when available', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText(/paint colors/i)).toBeInTheDocument()
        expect(screen.getByText('Agreeable Gray')).toBeInTheDocument()
      })
    })
  })

  describe('items display', () => {
    it('shows items in grid view by default', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText('Refrigerator')).toBeInTheDocument()
        expect(screen.getByText('Dishwasher')).toBeInTheDocument()
      })
    })

    it('allows switching to list view', async () => {
      const user = userEvent.setup()
      renderRoomDetailPage()
      
      await waitFor(() => {
        expect(screen.getByText('Refrigerator')).toBeInTheDocument()
      })

      // Find and click list view button
      const listButtons = screen.getAllByTitle(/list view/i)
      if (listButtons.length > 0) {
        await user.click(listButtons[0])
        // List view should be active
        await waitFor(() => {
          expect(listButtons[0].closest('button')).toHaveClass(/bg-gray-100|bg-gray-700/)
        })
      }
    })

    it('allows switching back to grid view', async () => {
      const user = userEvent.setup()
      renderRoomDetailPage()
      
      await waitFor(() => {
        expect(screen.getByText('Refrigerator')).toBeInTheDocument()
      })

      // Find view toggle buttons
      const gridButtons = screen.getAllByTitle(/grid view/i)
      const listButtons = screen.getAllByTitle(/list view/i)
      
      if (listButtons.length > 0 && gridButtons.length > 0) {
        // Switch to list
        await user.click(listButtons[0])
        await waitFor(() => {
          expect(listButtons[0].closest('button')).toHaveClass(/bg-gray-100|bg-gray-700/)
        })
        
        // Switch back to grid
        await user.click(gridButtons[0])
        await waitFor(() => {
          expect(gridButtons[0].closest('button')).toHaveClass(/bg-gray-100|bg-gray-700/)
        })
      }
    })

    it('shows empty state when no items', async () => {
      server.use(
        http.get('/api/items', () => {
          return HttpResponse.json({ items: [] })
        })
      )
      
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText(/no items in this room/i)).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('has back button to rooms list', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        const backButton = screen.getByRole('button', { name: /back/i }) || screen.getByText(/back/i).closest('button')
        expect(backButton).toBeInTheDocument()
      })
    })

    it('items link to item detail page', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        const itemLink = screen.getByText('Refrigerator').closest('a')
        expect(itemLink).toHaveAttribute('href', '/items/1')
      })
    })
  })

  describe('error handling', () => {
    it('shows error when room not found', async () => {
      server.use(
        http.get('/api/locations/:id', () => {
          return HttpResponse.json({ message: 'Not found' }, { status: 404 })
        })
      )
      
      renderRoomDetailPage('999')
      await waitFor(() => {
        expect(screen.getByText(/room not found/i)).toBeInTheDocument()
      })
    })
  })
})
