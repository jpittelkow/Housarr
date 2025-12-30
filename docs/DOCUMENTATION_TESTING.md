# Housarr Testing Documentation

This document provides comprehensive guidance on testing the Housarr application, covering both frontend (React/TypeScript) and backend (Laravel/PHP) testing strategies.

## Table of Contents

1. [Overview](#overview)
2. [Frontend Testing](#frontend-testing)
   - [Setup](#frontend-setup)
   - [Running Tests](#running-frontend-tests)
   - [Writing Component Tests](#writing-component-tests)
   - [Writing Store Tests](#writing-store-tests)
   - [Writing Page Tests](#writing-page-tests)
   - [E2E Testing with Playwright](#e2e-testing-with-playwright)
3. [Backend Testing](#backend-testing)
   - [Setup](#backend-setup)
   - [Running Tests](#running-backend-tests)
   - [Writing Feature Tests](#writing-feature-tests)
   - [Writing Unit Tests](#writing-unit-tests)
   - [Database Testing](#database-testing)
4. [CI/CD Integration](#cicd-integration)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Overview

Housarr uses a multi-layer testing strategy:

| Layer | Frontend Tool | Backend Tool | Purpose |
|-------|---------------|--------------|---------|
| Unit | Vitest | Pest PHP | Individual functions/methods |
| Component | React Testing Library | - | UI component behavior |
| Integration | MSW + Vitest | Pest PHP | Multiple units working together |
| E2E | Playwright | - | Full user flows in browser |

### Test File Locations

```
housarr/
├── frontend/
│   ├── src/
│   │   ├── components/ui/__tests__/    # UI component tests
│   │   ├── stores/__tests__/           # Zustand store tests
│   │   ├── pages/__tests__/            # Page component tests
│   │   ├── lib/__tests__/              # Utility function tests
│   │   └── test/
│   │       ├── setup.ts                # Global test setup
│   │       └── mocks/handlers.ts       # MSW API mocks
│   ├── e2e/                            # Playwright E2E tests
│   ├── vitest.config.ts                # Vitest configuration
│   └── playwright.config.ts            # Playwright configuration
└── backend/
    └── tests/
        ├── Pest.php                    # Pest configuration
        ├── TestCase.php                # Base test class
        ├── Feature/                    # API integration tests
        └── Unit/                       # Service unit tests
```

---

## Frontend Testing

### Frontend Setup

#### Prerequisites
```bash
cd frontend
npm install
```

#### Test Dependencies
The following packages are used for testing:
- `vitest` - Test runner (Vite-native, fast)
- `@testing-library/react` - Component testing utilities
- `@testing-library/jest-dom` - Custom DOM matchers
- `@testing-library/user-event` - User interaction simulation
- `jsdom` - DOM environment for Node.js
- `msw` - API mocking (Mock Service Worker)

### Running Frontend Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI)
npm run test:run

# Run with coverage report
npm run test:coverage

# Run specific test file
npm test -- Button.test.tsx

# Run tests matching pattern
npm test -- --grep "should render"
```

### Writing Component Tests

Component tests verify that UI components render correctly and respond to user interactions.

#### Basic Component Test

```typescript
// src/components/ui/__tests__/Button.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders with children', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button'))
    
    expect(handleClick).toHaveBeenCalledOnce()
  })

  it('shows loading spinner when isLoading', () => {
    render(<Button isLoading>Submit</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('applies variant styles', () => {
    render(<Button variant="danger">Delete</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-error-600')
  })
})
```

#### Testing Forms

```typescript
// src/components/ui/__tests__/Input.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '../Input'

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('shows error message', () => {
    render(<Input label="Email" error="Invalid email" />)
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
  })

  it('calls onChange with value', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    
    render(<Input label="Name" onChange={handleChange} />)
    await user.type(screen.getByLabelText(/name/i), 'John')
    
    expect(handleChange).toHaveBeenCalled()
  })
})
```

#### Testing Modals

```typescript
// src/components/ui/__tests__/Modal.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from '../Modal'

describe('Modal', () => {
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

  it('calls onClose when clicking overlay', async () => {
    const user = userEvent.setup()
    const handleClose = vi.fn()
    
    render(
      <Modal isOpen onClose={handleClose} title="Test">
        <p>Content</p>
      </Modal>
    )
    
    // Click outside the modal content
    await user.click(screen.getByTestId('modal-overlay'))
    expect(handleClose).toHaveBeenCalled()
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
    expect(handleClose).toHaveBeenCalled()
  })
})
```

### Writing Store Tests

Store tests verify Zustand state management logic.

```typescript
// src/stores/__tests__/authStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

describe('authStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: true,
    })
  })

  it('starts with no user', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('sets user on login', () => {
    const user = { id: 1, name: 'Test User', email: 'test@example.com' }
    useAuthStore.getState().setUser(user)
    
    const state = useAuthStore.getState()
    expect(state.user).toEqual(user)
    expect(state.isAuthenticated).toBe(true)
  })

  it('clears user on logout', () => {
    // Set up authenticated state
    useAuthStore.setState({
      user: { id: 1, name: 'Test', email: 'test@example.com' },
      isAuthenticated: true,
    })
    
    // Logout
    useAuthStore.getState().logout()
    
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })
})
```

### Writing Page Tests

Page tests use MSW to mock API responses.

```typescript
// src/pages/__tests__/DashboardPage.test.tsx
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import DashboardPage from '../DashboardPage'

// Mock API handlers
const server = setupServer(
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      stats: {
        total_items: 42,
        upcoming_reminders: 5,
        overdue_reminders: 2,
        open_todos: 8,
      },
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

describe('DashboardPage', () => {
  it('displays stats from API', async () => {
    renderWithProviders(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText('42')).toBeInTheDocument() // Total items
      expect(screen.getByText('5')).toBeInTheDocument()  // Upcoming
      expect(screen.getByText('2')).toBeInTheDocument()  // Overdue
      expect(screen.getByText('8')).toBeInTheDocument()  // Todos
    })
  })

  it('shows loading state initially', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByTestId('loading')).toBeInTheDocument()
  })

  it('handles API error gracefully', async () => {
    server.use(
      http.get('/api/dashboard', () => {
        return HttpResponse.json({ message: 'Server error' }, { status: 500 })
      })
    )
    
    renderWithProviders(<DashboardPage />)
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument()
    })
  })
})
```

### E2E Testing with Playwright

E2E tests run in real browsers and test complete user flows.

#### Running E2E Tests

```bash
# Run all E2E tests
npx playwright test

# Run in headed mode (see browser)
npx playwright test --headed

# Run specific test file
npx playwright test auth.spec.ts

# Run with UI mode (interactive)
npx playwright test --ui

# Generate test report
npx playwright show-report
```

#### Writing E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Authentication', () => {
  test('user can log in with valid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('h1')).toContainText('Dashboard')
  })

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/login')
    
    await page.fill('[name="email"]', 'wrong@example.com')
    await page.fill('[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    
    await expect(page.locator('.toast-error, [role="alert"]')).toBeVisible()
  })

  test('user can log out', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/dashboard')
    
    // Logout
    await page.click('button:has-text("Logout")')
    
    // Should redirect to login
    await expect(page).toHaveURL('/login')
  })
})
```

```typescript
// e2e/items.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Items', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('can create a new item', async ({ page }) => {
    await page.goto('/items')
    await page.click('button:has-text("Add Item")')
    
    await page.fill('[name="name"]', 'Test Refrigerator')
    await page.fill('[name="make"]', 'Samsung')
    await page.fill('[name="model"]', 'RF28R7551SR')
    await page.selectOption('[name="category_id"]', { label: 'Appliances' })
    await page.click('button:has-text("Save")')
    
    // Should show success toast
    await expect(page.locator('.toast-success, [data-sonner-toast]')).toBeVisible()
    
    // Item should appear in list
    await expect(page.locator('text=Test Refrigerator')).toBeVisible()
  })

  test('can view item details', async ({ page }) => {
    await page.goto('/items')
    await page.click('text=Test Refrigerator')
    
    await expect(page.locator('h1')).toContainText('Test Refrigerator')
    await expect(page.locator('text=Samsung')).toBeVisible()
  })

  test('can delete an item', async ({ page }) => {
    await page.goto('/items')
    await page.click('text=Test Refrigerator')
    
    // Click delete button
    await page.click('button:has-text("Delete")')
    
    // Confirm deletion
    await page.click('button:has-text("Confirm")')
    
    // Should redirect to items list
    await expect(page).toHaveURL('/items')
    
    // Item should be gone
    await expect(page.locator('text=Test Refrigerator')).not.toBeVisible()
  })
})
```

---

## Backend Testing

### Backend Setup

#### Prerequisites
```bash
cd backend
composer install
```

#### Configure Test Database

Create a `.env.testing` file:
```env
APP_ENV=testing
DB_CONNECTION=sqlite
DB_DATABASE=:memory:
```

### Running Backend Tests

```bash
# Run all tests
php artisan test

# Run with coverage
php artisan test --coverage

# Run specific test file
php artisan test --filter=ItemTest

# Run specific test method
php artisan test --filter="it creates an item"

# Run in parallel
php artisan test --parallel
```

### Writing Feature Tests

Feature tests verify API endpoints work correctly.

```php
<?php
// tests/Feature/AuthTest.php

use App\Models\User;
use App\Models\Household;

beforeEach(function () {
    $this->household = Household::factory()->create();
});

describe('authentication', function () {
    it('registers a new user', function () {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'household_name' => 'Test Household',
        ]);

        $response->assertCreated();
        expect(User::where('email', 'test@example.com')->exists())->toBeTrue();
    });

    it('logs in with valid credentials', function () {
        $user = User::factory()->create([
            'email' => 'test@example.com',
            'password' => bcrypt('password123'),
            'household_id' => $this->household->id,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'test@example.com',
            'password' => 'password123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user', 'token']);
    });

    it('rejects invalid credentials', function () {
        $user = User::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertUnauthorized();
    });

    it('returns authenticated user', function () {
        $user = User::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->actingAs($user)
            ->getJson('/api/auth/user');

        $response->assertOk()
            ->assertJson(['user' => ['id' => $user->id]]);
    });
});
```

```php
<?php
// tests/Feature/ItemTest.php

use App\Models\User;
use App\Models\Household;
use App\Models\Item;
use App\Models\Category;
use App\Models\Location;

beforeEach(function () {
    $this->household = Household::factory()->create();
    $this->user = User::factory()->create([
        'household_id' => $this->household->id,
    ]);
    $this->category = Category::factory()->create([
        'household_id' => $this->household->id,
    ]);
});

describe('items', function () {
    it('lists items for authenticated user', function () {
        Item::factory()->count(3)->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/items');

        $response->assertOk()
            ->assertJsonCount(3, 'items');
    });

    it('does not show items from other households', function () {
        $otherHousehold = Household::factory()->create();
        Item::factory()->create(['household_id' => $otherHousehold->id]);
        Item::factory()->create(['household_id' => $this->household->id]);

        $response = $this->actingAs($this->user)
            ->getJson('/api/items');

        $response->assertOk()
            ->assertJsonCount(1, 'items');
    });

    it('creates an item', function () {
        $response = $this->actingAs($this->user)
            ->postJson('/api/items', [
                'name' => 'Test Item',
                'make' => 'TestMake',
                'model' => 'TestModel',
                'category_id' => $this->category->id,
            ]);

        $response->assertCreated()
            ->assertJsonPath('item.name', 'Test Item');
        
        expect(Item::where('name', 'Test Item')->exists())->toBeTrue();
    });

    it('validates required fields', function () {
        $response = $this->actingAs($this->user)
            ->postJson('/api/items', []);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['name']);
    });

    it('updates an item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
            'name' => 'Old Name',
        ]);

        $response = $this->actingAs($this->user)
            ->putJson("/api/items/{$item->id}", [
                'name' => 'New Name',
            ]);

        $response->assertOk()
            ->assertJsonPath('item.name', 'New Name');
    });

    it('deletes an item', function () {
        $item = Item::factory()->create([
            'household_id' => $this->household->id,
        ]);

        $response = $this->actingAs($this->user)
            ->deleteJson("/api/items/{$item->id}");

        $response->assertNoContent();
        expect(Item::find($item->id))->toBeNull();
    });

    it('prevents accessing other household items', function () {
        $otherHousehold = Household::factory()->create();
        $item = Item::factory()->create([
            'household_id' => $otherHousehold->id,
        ]);

        $response = $this->actingAs($this->user)
            ->getJson("/api/items/{$item->id}");

        $response->assertForbidden();
    });
});
```

### Writing Unit Tests

Unit tests verify individual service methods.

```php
<?php
// tests/Unit/AIServiceTest.php

use App\Services\AIService;

describe('AIService', function () {
    it('detects configured providers', function () {
        config(['services.anthropic.api_key' => 'test-key']);
        
        $service = new AIService();
        
        expect($service->hasProvider('claude'))->toBeTrue();
    });

    it('returns null for unconfigured providers', function () {
        config(['services.anthropic.api_key' => null]);
        
        $service = new AIService();
        
        expect($service->hasProvider('claude'))->toBeFalse();
    });

    it('builds correct prompt for image analysis', function () {
        $service = new AIService();
        $prompt = $service->buildImageAnalysisPrompt(['Appliances', 'Electronics']);
        
        expect($prompt)->toContain('Appliances')
            ->toContain('Electronics')
            ->toContain('make')
            ->toContain('model');
    });
});
```

```php
<?php
// tests/Unit/StorageServiceTest.php

use App\Services\StorageService;

describe('StorageService', function () {
    it('generates correct local path', function () {
        config(['filesystems.default' => 'local']);
        
        $service = new StorageService();
        $path = $service->getFilePath(1, 'item', 'test.jpg');
        
        expect($path)->toContain('households/1/items')
            ->toContain('test.jpg');
    });

    it('generates public URL for local files', function () {
        config(['filesystems.default' => 'local']);
        
        $service = new StorageService();
        $url = $service->getPublicUrl('households/1/items/test.jpg');
        
        expect($url)->toContain('/storage/');
    });
});
```

### Database Testing

Tests use an in-memory SQLite database for speed and isolation.

```php
<?php
// tests/TestCase.php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase;
    
    protected function setUp(): void
    {
        parent::setUp();
        
        // Run seeders if needed
        // $this->seed(CategorySeeder::class);
    }
}
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  frontend-lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint

  frontend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      - run: cd frontend && npm ci
      - run: cd frontend && npm run test:run

  backend-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          coverage: xdebug
      - run: cd backend && composer install --no-progress
      - run: cd backend && cp .env.example .env.testing
      - run: cd backend && php artisan key:generate --env=testing
      - run: cd backend && php artisan test

  e2e-test:
    runs-on: ubuntu-latest
    needs: [frontend-test, backend-test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: npx playwright install --with-deps
      - run: cd frontend && npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

---

## Best Practices

### General

1. **Test behavior, not implementation** - Test what the code does, not how it does it
2. **One assertion per test** (when possible) - Makes failures easier to diagnose
3. **Use descriptive test names** - `it('shows error when email is invalid')` not `test1`
4. **Arrange-Act-Assert** - Structure tests clearly
5. **Keep tests fast** - Mock external services, use in-memory database

### Frontend

1. **Query by accessibility** - Use `getByRole`, `getByLabelText` over `getByTestId`
2. **Await user interactions** - Always await `userEvent` methods
3. **Test user flows** - Test what users do, not React internals
4. **Mock at network level** - Use MSW instead of mocking modules

### Backend

1. **Use factories** - Create test data with Laravel factories
2. **Test authorization** - Verify users can't access other household's data
3. **Test validation** - Ensure invalid data is rejected
4. **Clean up** - Use `RefreshDatabase` trait for clean state

### E2E

1. **Use page objects** - Abstract page interactions for reuse
2. **Test critical paths** - Focus on most important user journeys
3. **Handle flakiness** - Use proper waits, not arbitrary sleeps
4. **Isolate tests** - Each test should be independent

---

## Troubleshooting

### Frontend Tests

**"Cannot find module" errors**
- Check `vitest.config.ts` has correct path aliases
- Run `npm install` to ensure dependencies are installed

**Tests timing out**
- Increase timeout in `vitest.config.ts`
- Check for unresolved promises

**MSW not intercepting requests**
- Ensure server is started in `beforeAll`
- Check request URL matches handler

### Backend Tests

**"Table not found" errors**
- Ensure `RefreshDatabase` trait is used
- Check migration files are valid

**Tests passing locally but failing in CI**
- Check `.env.testing` configuration
- Ensure database driver matches CI environment

**Slow tests**
- Use `--parallel` flag
- Mock external API calls

### E2E Tests

**Element not found**
- Add proper waits: `await expect(locator).toBeVisible()`
- Check selectors are correct

**Tests flaky**
- Use `waitForURL` instead of arbitrary delays
- Increase default timeout in `playwright.config.ts`

**Screenshots not helpful**
- Use `--trace on` for full trace recording
- Run in headed mode for debugging

---

## Running the Complete Test Suite

```bash
# Run everything
./scripts/test-all.sh

# Or manually:
cd frontend && npm run test:run && npx playwright test
cd ../backend && php artisan test
```
