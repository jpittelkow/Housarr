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
  url: 'https://example.com/living-room.jpg',
  original_name: 'room.jpg',
  mime_type: 'image/jpeg',
  is_featured: true,
  ...overrides,
})

// Setup MSW server
const server = setupServer(
  http.get('/api/locations', () => {
    return HttpResponse.json({
      locations: [
        createMockLocation({ id: 1, name: 'Kitchen', items_count: 5 }),
        createMockLocation({ 
          id: 2, 
          name: 'Living Room', 
          items_count: 3,
          featured_image: createMockFile() 
        }),
      ],
    })
  }),
  http.get('/api/locations/:id', ({ params }) => {
    const { id } = params as { id: string }
    return HttpResponse.json({ location: createMockLocation({ id: Number(id) }) })
  }),
  http.post('/api/locations', () => {
    return HttpResponse.json({ location: createMockLocation({ id: 3, name: 'New Room' }) }, { status: 201 })
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
    it('renders page heading', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Rooms' })).toBeInTheDocument()
      })
    })

    it('renders rooms list', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByText('Kitchen')).toBeInTheDocument()
        expect(screen.getByText('Living Room')).toBeInTheDocument()
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

  describe('add room button', () => {
    it('shows add room button', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /add room/i })).toBeInTheDocument()
      })
    })
  })

  describe('page description', () => {
    it('shows page description', async () => {
      renderRoomsPage()
      await waitFor(() => {
        expect(screen.getByText(/manage rooms and track paint colors/i)).toBeInTheDocument()
      })
    })
  })
})
