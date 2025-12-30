import { http, HttpResponse } from 'msw'

// Mock data factories
const createMockUser = (overrides = {}) => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'admin',
  household_id: 1,
  household: {
    id: 1,
    name: 'Test Household',
  },
  ...overrides,
})

const createMockItem = (overrides = {}) => ({
  id: 1,
  name: 'Test Item',
  make: 'TestMake',
  model: 'TestModel',
  household_id: 1,
  category_id: 1,
  category: { id: 1, name: 'Appliances', color: '#6366f1' },
  location_id: null,
  location_obj: null,
  featured_image: null,
  images: [],
  files: [],
  parts: [],
  maintenanceLogs: [],
  reminders: [],
  ...overrides,
})

const createMockReminder = (overrides = {}) => ({
  id: 1,
  title: 'Test Reminder',
  description: 'Test description',
  due_date: new Date().toISOString().split('T')[0],
  status: 'pending',
  repeat_interval_days: null,
  item_id: null,
  item: null,
  ...overrides,
})

const createMockTodo = (overrides = {}) => ({
  id: 1,
  title: 'Test Todo',
  description: 'Test description',
  priority: 'medium',
  is_completed: false,
  item_id: null,
  item: null,
  ...overrides,
})

const createMockVendor = (overrides = {}) => ({
  id: 1,
  name: 'Test Vendor',
  contact_name: 'John Doe',
  phone: '555-1234',
  email: 'vendor@example.com',
  website: 'https://vendor.com',
  address: '123 Main St',
  specialty: 'Appliance Repair',
  notes: '',
  ...overrides,
})

const createMockCategory = (overrides = {}) => ({
  id: 1,
  name: 'Appliances',
  icon: 'package',
  color: '#6366f1',
  ...overrides,
})

const createMockLocation = (overrides = {}) => ({
  id: 1,
  name: 'Kitchen',
  icon: 'home',
  ...overrides,
})

// API handlers
export const handlers = [
  // Auth endpoints
  http.get('/api/auth/user', () => {
    return HttpResponse.json({ user: createMockUser() })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: createMockUser(),
        token: 'mock-token',
      })
    }
    return HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 })
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ message: 'Logged out' })
  }),

  // Dashboard
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      stats: {
        total_items: 42,
        upcoming_reminders: 5,
        overdue_reminders: 2,
        open_todos: 8,
      },
      recent_items: [createMockItem()],
      upcoming_reminders: [createMockReminder()],
    })
  }),

  // Items endpoints
  http.get('/api/items', () => {
    return HttpResponse.json({
      items: [createMockItem(), createMockItem({ id: 2, name: 'Item 2' })],
    })
  }),

  http.get('/api/items/:id', ({ params }) => {
    return HttpResponse.json({
      item: createMockItem({ id: Number(params.id) }),
    })
  }),

  http.post('/api/items', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      item: createMockItem({ ...body, id: Math.floor(Math.random() * 1000) }),
    }, { status: 201 })
  }),

  http.put('/api/items/:id', async ({ params, request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      item: createMockItem({ ...body, id: Number(params.id) }),
    })
  }),

  http.delete('/api/items/:id', () => {
    return new HttpResponse(null, { status: 204 })
  }),

  // Reminders endpoints
  http.get('/api/reminders', () => {
    return HttpResponse.json({
      reminders: [createMockReminder()],
    })
  }),

  http.post('/api/reminders', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      reminder: createMockReminder({ ...body, id: Math.floor(Math.random() * 1000) }),
    }, { status: 201 })
  }),

  // Todos endpoints
  http.get('/api/todos', () => {
    return HttpResponse.json({
      todos: [createMockTodo()],
    })
  }),

  http.post('/api/todos', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      todo: createMockTodo({ ...body, id: Math.floor(Math.random() * 1000) }),
    }, { status: 201 })
  }),

  // Vendors endpoints
  http.get('/api/vendors', () => {
    return HttpResponse.json({
      vendors: [createMockVendor()],
    })
  }),

  http.post('/api/vendors', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      vendor: createMockVendor({ ...body, id: Math.floor(Math.random() * 1000) }),
    }, { status: 201 })
  }),

  // Categories endpoints
  http.get('/api/categories', () => {
    return HttpResponse.json({
      categories: [
        createMockCategory(),
        createMockCategory({ id: 2, name: 'Electronics', color: '#10b981' }),
        createMockCategory({ id: 3, name: 'HVAC', color: '#f59e0b' }),
      ],
    })
  }),

  // Locations endpoints
  http.get('/api/locations', () => {
    return HttpResponse.json({
      locations: [
        createMockLocation(),
        createMockLocation({ id: 2, name: 'Living Room' }),
        createMockLocation({ id: 3, name: 'Garage' }),
      ],
    })
  }),

  // Settings endpoints
  http.get('/api/settings', () => {
    return HttpResponse.json({
      settings: {
        ai_provider: 'claude',
        storage_driver: 'local',
      },
    })
  }),

  // Profile endpoints
  http.get('/api/profile', () => {
    return HttpResponse.json({
      user: createMockUser(),
    })
  }),

  http.put('/api/profile', async ({ request }) => {
    const body = await request.json() as Record<string, unknown>
    return HttpResponse.json({
      user: createMockUser(body),
    })
  }),

  // CSRF cookie (for Sanctum)
  http.get('/sanctum/csrf-cookie', () => {
    return new HttpResponse(null, { status: 204 })
  }),
]
