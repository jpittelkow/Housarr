import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
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
  http.get('/api/items', () => {
    // Return empty by default
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
        <Routes>
          <Route path="/rooms/:id" element={<RoomDetailPage />} />
        </Routes>
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

    it('displays items count in header', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        // The header shows the items count from location data
        expect(screen.getByText(/3/)).toBeInTheDocument()
      })
    })

    it('displays items in room section header', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText('Items in This Room')).toBeInTheDocument()
      })
    })

    it('displays paint colors when available', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        expect(screen.getByText('Agreeable Gray')).toBeInTheDocument()
      })
    })
  })

  describe('navigation', () => {
    it('has buttons for room actions', async () => {
      renderRoomDetailPage()
      await waitFor(() => {
        // Check for action buttons
        expect(screen.getByRole('button', { name: /edit room/i })).toBeInTheDocument()
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
