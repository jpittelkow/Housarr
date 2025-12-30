# ADR 011: Comprehensive Testing Strategy

## Status
Accepted

## Date
2024-12-30

## Context

Housarr is a full-stack application with a React TypeScript frontend and Laravel PHP backend. As the application has grown to include complex features like multi-agent AI orchestration, file management, and multi-tenant household data, we need a comprehensive testing strategy to ensure:

1. All functions work correctly
2. All pages load without errors
3. All interactive elements (buttons, forms, modals) function properly
4. API endpoints return correct responses
5. Multi-tenant data isolation is maintained
6. Regressions are caught before deployment

Previously, the codebase had no automated tests despite having test infrastructure in place (PHPUnit installed, empty test directories).

## Decision

We will implement a **multi-layer testing strategy** covering:

### Frontend Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Unit/Component | **Vitest** | Fast, Vite-native test runner |
| Component Testing | **React Testing Library** | Test components as users interact with them |
| API Mocking | **MSW (Mock Service Worker)** | Intercept network requests for isolated testing |
| E2E | **Playwright** | Full browser automation for user flow testing |

### Backend Testing Stack

| Layer | Tool | Purpose |
|-------|------|---------|
| Feature/Integration | **Pest PHP** | Modern, expressive syntax for Laravel testing |
| Unit | **Pest PHP** | Service and utility function testing |
| Database | **SQLite in-memory** | Fast, isolated database for each test |

### Why Vitest over Jest?

1. **Native Vite integration** - Uses same config, transformers, and resolvers
2. **Faster execution** - ESM-first, no transformation overhead
3. **Compatible API** - Jest-compatible, easy migration path
4. **HMR for tests** - Watch mode re-runs only affected tests

### Why Pest over PHPUnit?

1. **Cleaner syntax** - Less boilerplate, more readable tests
2. **Laravel-optimized** - First-class support for Laravel testing helpers
3. **Better output** - Beautiful, informative test results
4. **Parallel testing** - Built-in parallel test execution

### Why Playwright over Cypress?

1. **Multi-browser** - Chrome, Firefox, Safari in one config
2. **Faster execution** - Parallel by default, no serialization
3. **Better waits** - Auto-waiting, fewer flaky tests
4. **API testing** - Can test APIs alongside UI

## Test Coverage Goals

### Frontend

| Category | Coverage Target | Priority |
|----------|-----------------|----------|
| UI Components | 80% | High |
| Zustand Stores | 90% | High |
| Utility Functions | 100% | Medium |
| Page Components | 70% | Medium |
| E2E Critical Paths | 100% | High |

### Backend

| Category | Coverage Target | Priority |
|----------|-----------------|----------|
| Authentication | 100% | Critical |
| CRUD Operations | 90% | High |
| AI Services | 70% | Medium |
| File Operations | 80% | High |
| Authorization/Policies | 100% | Critical |

## Test Organization

### Frontend Structure
```
frontend/
├── vitest.config.ts
├── playwright.config.ts
├── src/
│   ├── test/
│   │   ├── setup.ts           # Global test setup
│   │   └── mocks/
│   │       └── handlers.ts    # MSW API mocks
│   ├── components/
│   │   └── ui/
│   │       └── __tests__/     # Component tests
│   ├── stores/
│   │   └── __tests__/         # Store tests
│   └── pages/
│       └── __tests__/         # Page tests
└── e2e/                       # Playwright specs
```

### Backend Structure
```
backend/
├── phpunit.xml
├── tests/
│   ├── Pest.php               # Pest configuration
│   ├── TestCase.php           # Base test class
│   ├── Feature/               # API/Integration tests
│   │   ├── AuthTest.php
│   │   ├── ItemTest.php
│   │   └── ...
│   └── Unit/                  # Service unit tests
│       ├── AIServiceTest.php
│       └── ...
```

## Testing Patterns

### Frontend Component Testing

```typescript
// Use React Testing Library queries
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

test('button calls onClick when clicked', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Click me</Button>)
  
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalledOnce()
})
```

### Backend Feature Testing

```php
// Use Pest's expressive syntax
it('creates an item for authenticated user', function () {
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)
        ->postJson('/api/items', [
            'name' => 'Test Item',
            'category_id' => Category::factory()->create()->id,
        ]);
    
    $response->assertCreated();
    expect(Item::count())->toBe(1);
});
```

### E2E Testing

```typescript
// Use Playwright's auto-waiting
test('user can create an item', async ({ page }) => {
  await page.goto('/items')
  await page.click('button:has-text("Add Item")')
  await page.fill('[name="name"]', 'Test Item')
  await page.click('button:has-text("Save")')
  
  await expect(page.locator('text=Test Item')).toBeVisible()
})
```

## CI/CD Integration

Tests run automatically on:
- Every push to any branch
- Every pull request
- Pre-deployment to production

### Pipeline Stages

1. **Lint** - ESLint (frontend), Pint (backend)
2. **Unit Tests** - Vitest, Pest unit
3. **Feature Tests** - Pest feature with test database
4. **E2E Tests** - Playwright against running app

## Consequences

### Positive

1. **Confidence in deployments** - Catch regressions before users
2. **Documentation** - Tests serve as living documentation
3. **Faster development** - Catch bugs early, reduce manual QA
4. **Refactoring safety** - Change code without fear
5. **Better code design** - Testable code is often better designed

### Negative

1. **Initial time investment** - ~40 test files to create
2. **Maintenance overhead** - Tests need updates with features
3. **CI time** - Full suite adds ~5-10 minutes to pipeline
4. **Learning curve** - Team needs familiarity with tools

### Mitigations

- Start with critical paths (auth, CRUD)
- Use snapshot tests for complex UI sparingly
- Parallelize CI jobs
- Document testing patterns in DOCUMENTATION_TESTING.md

## References

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [Pest PHP Documentation](https://pestphp.com/)
- [Laravel Testing](https://laravel.com/docs/testing)
