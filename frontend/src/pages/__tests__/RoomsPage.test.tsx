import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import RoomsPage from '../RoomsPage'

// Mock scrollIntoView which isn't available in jsdom
beforeAll(() => {
  Element.prototype.scrollIntoView = () => {}
})

const createMockLocation = (overrides = {}) => ({
  id: 1,
  name: 'Kitchen',
  icon: 'home',
  notes: null,
  items_count: 5,
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

// Setup MSW server
const server = setupServer(
  http.get('/api/locations', () => {
    return HttpResponse.json({
      locations: [
        createMockLocation({ id: 1, name: 'Kitchen' }),
        createMockLocation({ id: 2, name: 'Living Room', featured_image: createMockFile({ id: 1, is_featured: true }) }),
      ],
    })
  }),
  http.get('/api/locations/:id', ({ params }) => {
    const { id } = params as { id: string }
    if (id === '1') {
      return HttpResponse.json({
        location: createMockLocation({
          id: 1,
          name: 'Kitchen',
          images: [createMockFile({ id: 1 }), createMockFile({ id: 2 })],
          featured_image: createMockFile({ id: 1, is_featured: true }),
        }),
      })
    }
    return HttpResponse.json({ location: createMockLocation({ id: Number(id) }) }, { status: 200 })
  }),
  http.post('/api/locations', () => {
    return HttpResponse.json({ location: createMockLocation({ id: 3, name: 'New Room' }) }, { status: 201 })
  }),
  http.patch('/api/locations/:id', () => {
    return HttpResponse.json({ location: createMockLocation({ id: 1, name: 'Updated Kitchen' }) })
  }),
  http.delete('/api/locations/:id', () => {
    return HttpResponse.json({ message: 'Location deleted successfully' }, { status: 200 })
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

function renderRoomsPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <RoomsPage />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

describe('RoomsPage', () => {
  describe('rendering', () => {
    it('renders page title', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByText(/rooms/i)).toBeInTheDocument()
      })
    })

    it('renders rooms list', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByText('Kitchen')).toBeInTheDocument()
        expect(screen.getByText('Living Room')).toBeInTheDocument()
      })
    })

    it('displays featured images when available', async () => {
      renderRoomsPage()
      await waitFor(() => {
        const images = screen.getAllByAltText('Living Room')
        expect(images.length).toBeGreaterThan(0)
      })
    })

    it('shows items count when available', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByText('5 items')).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('room cards link to detail page', async () => {
      renderRoomsPage()
      await waitFor(() => {
        const kitchenLink = screen.getByText('Kitchen').closest('a')
        expect(kitchenLink).toHaveAttribute('href', '/rooms/1')
      })
    })
  })

  describe('photo display', () => {
    it('displays featured image in room card', async () => {
      renderRoomsPage()
      await waitFor(() => {
        const images = screen.getAllByAltText('Living Room')
        expect(images.some(img => img.getAttribute('src')?.includes('image.jpg'))).toBe(true)
      })
    })
  })
})
