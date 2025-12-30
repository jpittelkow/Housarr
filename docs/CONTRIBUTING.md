# Housarr Development Guidelines

This document outlines critical architectural patterns and rules that **MUST** be followed when making changes to Housarr. Breaking these patterns can cause data leaks, security vulnerabilities, or application failures.

---

## ⚠️ Mandatory Requirements

Before ANY code is merged, the following requirements **MUST** be met:

### 1. Tests Are Required

**Every new feature, bug fix, or change MUST include tests.**

| Change Type | Required Tests |
|-------------|----------------|
| New API endpoint | Pest PHP feature test |
| New React component | Vitest + React Testing Library test |
| New page | Page component test + E2E test (Playwright) |
| Bug fix | Regression test proving the fix |
| New Zustand store | Store unit test |
| New utility function | Unit test |

```bash
# Run all tests before submitting changes
# Frontend
cd frontend && npm run test:run

# Backend
cd backend && ./vendor/bin/pest

# E2E (requires running app)
cd frontend && npm run test:e2e
```

**Tests MUST pass before merging. CI/CD will automatically reject PRs with failing tests.**

See [DOCUMENTATION_TESTING.md](DOCUMENTATION_TESTING.md) for complete testing guide.

### 2. ADRs Are Required for Significant Changes

**Architecture Decision Records (ADRs) MUST be written for:**

- New features that introduce new patterns
- Changes to authentication/authorization
- Database schema changes
- New external integrations (APIs, services)
- Changes to the AI system
- Infrastructure changes
- Any decision that future developers would question "why was this done this way?"

**ADR Location**: `docs/adr/`

**ADR Template**: See [docs/adr/README.md](adr/README.md)

```markdown
# ADR [NUMBER]: [TITLE]

## Status
Accepted

## Date
YYYY-MM-DD

## Context
[Why are we making this change? What problem are we solving?]

## Decision
[What did we decide to do? Include code examples if helpful.]

## Consequences

### Positive
- [Benefits of this decision]

### Negative
- [Trade-offs or downsides]
```

### 3. Run Full Test Suite Before Submitting

```bash
# From project root, run the full test suite:

# Frontend unit/component tests
cd frontend && npm run test:run

# Backend tests
cd backend && ./vendor/bin/pest

# E2E tests (start the app first)
cd frontend && npm run test:e2e
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│  App.tsx ──► Pages (lazy-loaded) ──► Components                             │
│      │                                    │                                 │
│      ▼                                    ▼                                 │
│  Auth Store (Zustand)              API Service (Axios)                      │
│  Theme Store (Zustand)                    │                                 │
│                                           ▼                                 │
│                              Types (src/types/index.ts)                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                           │
                                    HTTP (JSON API)
                                           │
┌─────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (Laravel 11)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  routes/api.php ──► Controllers ──► Policies ──► Models ──► Database        │
│                          │              │                                   │
│                          ▼              ▼                                   │
│                      Services      Gate::authorize()                        │
│                     (AI, Mail,         │                                    │
│                      Storage)          ▼                                    │
│                                 household_id CHECK                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Critical Rule #1: Household-Based Multi-Tenancy

**THIS IS THE MOST IMPORTANT SECURITY PATTERN IN THE APPLICATION.**

All user data is isolated by `household_id`. Users can ONLY access data belonging to their household. Breaking this pattern creates **security vulnerabilities** where users can access other households' data.

### Required Patterns

#### Listing Resources (Index Actions)

```php
// ✅ CORRECT - Always filter by authenticated user's household_id
public function index(Request $request): JsonResponse
{
    $items = Item::where('household_id', $request->user()->household_id)
        ->with(['category', 'vendor'])
        ->get();
    
    return response()->json(['items' => ItemResource::collection($items)]);
}

// ❌ WRONG - Never return all records without household filter
public function index(): JsonResponse
{
    $items = Item::all(); // SECURITY VULNERABILITY!
    return response()->json(['items' => $items]);
}
```

#### Creating Resources (Store Actions)

```php
// ✅ CORRECT - Always set household_id from authenticated user
public function store(StoreItemRequest $request): JsonResponse
{
    $item = Item::create([
        'household_id' => $request->user()->household_id,
        ...$request->validated(),
    ]);
    
    return response()->json(['item' => new ItemResource($item)], 201);
}

// ❌ WRONG - Never trust client-provided household_id
public function store(Request $request): JsonResponse
{
    $item = Item::create($request->all()); // SECURITY VULNERABILITY!
    return response()->json(['item' => $item]);
}
```

#### Viewing/Updating/Deleting Resources

```php
// ✅ CORRECT - Always authorize with policy before action
public function show(Request $request, Item $item): JsonResponse
{
    Gate::authorize('view', $item);  // Policy checks household_id match
    
    return response()->json(['item' => new ItemResource($item)]);
}

public function destroy(Request $request, Item $item): JsonResponse
{
    Gate::authorize('delete', $item);  // Policy checks household_id match
    
    $item->delete();
    return response()->json(['message' => 'Deleted']);
}

// ❌ WRONG - Never skip authorization
public function destroy(Item $item): JsonResponse
{
    $item->delete();  // Any user can delete any item! VULNERABILITY!
    return response()->json(['message' => 'Deleted']);
}
```

### Policy Pattern

All policies in `app/Policies/` MUST check household_id:

```php
class ItemPolicy
{
    public function view(User $user, Item $item): bool
    {
        return $user->household_id === $item->household_id;
    }

    public function update(User $user, Item $item): bool
    {
        return $user->household_id === $item->household_id;
    }

    public function delete(User $user, Item $item): bool
    {
        return $user->household_id === $item->household_id;
    }
}
```

### Models That Require household_id

| Model | Has household_id | Notes |
|-------|-----------------|-------|
| User | ✅ | Belongs to one household |
| Item | ✅ | Core entity |
| Part | ❌ | Accessed via Item (item.household_id) |
| Vendor | ✅ | |
| Location | ✅ | |
| Category | ✅ (nullable) | null = global category |
| Reminder | ✅ | |
| Todo | ✅ | |
| MaintenanceLog | ❌ | Accessed via Item |
| File | ✅ | Also has polymorphic relation |
| Setting | ✅ (nullable) | null = global setting |
| Notification | ❌ | Accessed via User |

---

## Critical Rule #2: Frontend-Backend API Contract

These three files define the API contract and **MUST stay synchronized**:

1. **`frontend/src/types/index.ts`** - TypeScript interfaces
2. **`frontend/src/services/api.ts`** - API client methods
3. **`backend/app/Http/Resources/*.php`** - Response transformers

### When Adding a New Field

1. Add column to migration
2. Add to model's `$fillable` array
3. Add to API Resource (if it should be returned)
4. Add to TypeScript interface
5. Update any form validation (Request classes)

### Example: Adding a field to Item

```php
// 1. Migration
Schema::table('items', function (Blueprint $table) {
    $table->string('color')->nullable();
});

// 2. Model fillable (app/Models/Item.php)
protected $fillable = [
    // ... existing fields
    'color',
];

// 3. Resource (app/Http/Resources/ItemResource.php)
public function toArray($request): array
{
    return [
        // ... existing fields
        'color' => $this->color,
    ];
}
```

```typescript
// 4. TypeScript type (frontend/src/types/index.ts)
export interface Item {
  // ... existing fields
  color: string | null
}
```

---

## Critical Rule #3: Authentication & Authorization

### Authentication Flow

1. Frontend calls `auth.csrf()` to get CSRF token
2. Login/Register creates session via Laravel Sanctum
3. All subsequent requests include session cookie
4. Backend middleware `auth:sanctum` validates session

### Route Protection

```php
// Public routes (login, register)
Route::middleware('throttle:10,1')->group(function () {
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
});

// Protected routes - ALWAYS use auth:sanctum
Route::middleware(['auth:sanctum', 'throttle:60,1'])->group(function () {
    // All resource routes here
});
```

### Authorization Pattern in Controllers

```php
// For actions on existing resources, ALWAYS authorize
public function update(UpdateItemRequest $request, Item $item): JsonResponse
{
    // Form Request handles validation
    // Policy is checked by UpdateItemRequest's authorize() or by Gate
    Gate::authorize('update', $item);
    
    $item->update($request->validated());
    return response()->json(['item' => new ItemResource($item)]);
}
```

---

## Critical Rule #4: Model Relationships

### Relationship Hierarchy

```
Household
├── Users (hasMany)
├── Items (hasMany)
│   ├── Parts (hasMany)
│   │   └── Files (morphMany)
│   ├── MaintenanceLogs (hasMany)
│   │   └── Files (morphMany)
│   ├── Reminders (hasMany)
│   ├── Todos (hasMany)
│   └── Files (morphMany)
├── Vendors (hasMany)
│   └── Files (morphMany)
├── Locations (hasMany)
│   └── Files (morphMany)
├── Categories (hasMany, nullable for global)
├── Reminders (hasMany)
├── Todos (hasMany)
└── Files (hasMany, also morphMany)
```

### Cascade Deletion

When deleting a parent resource, child resources and files MUST be cleaned up:

```php
public function destroy(Request $request, Item $item): JsonResponse
{
    Gate::authorize('delete', $item);

    // Load files to avoid N+1
    $item->load('files');

    // Delete files from storage BEFORE deleting records
    foreach ($item->files as $file) {
        $file->deleteFile();  // Removes from disk
    }

    $item->delete();  // Cascades to parts, logs, etc. via DB foreign keys

    return response()->json(['message' => 'Item deleted successfully']);
}
```

---

## Critical Rule #5: File Storage

### Path Convention

Files are stored in household-scoped paths:

```
households/{household_id}/items/{item_id}/manuals/
households/{household_id}/items/{item_id}/images/
households/{household_id}/vendors/{vendor_id}/
```

### Creating File Records

```php
$fileRecord = $item->files()->create([
    'household_id' => $request->user()->household_id,  // REQUIRED
    'disk' => StorageService::getDiskName($householdId),
    'path' => $path,
    'original_name' => $file->getClientOriginalName(),
    'mime_type' => $file->getMimeType(),
    'size' => $file->getSize(),
    'is_featured' => false,
]);
```

### Deleting Files

ALWAYS use the model method to clean up storage:

```php
// ✅ CORRECT
$file->deleteFile();  // Deletes from storage AND can delete record
$file->delete();

// ❌ WRONG - Leaves orphaned file on disk
$file->delete();  // Only deletes database record!
```

---

## Critical Rule #6: Settings Management

### Household-Scoped Settings

```php
// Get setting for current household
$value = Setting::get('ai_provider', $householdId);

// Set setting for household (encrypts automatically if key matches pattern)
Setting::set('anthropic_api_key', $apiKey, $householdId, encrypted: true);

// Global settings (null household_id)
$globalValue = Setting::get('app_name', null);
```

### Encrypted Settings

These setting keys are automatically encrypted:
- `*_api_key`
- `*_secret`
- `*_password`

---

## Do NOT Change Without Careful Review

### Database Schema

- Foreign key constraints
- `household_id` columns
- Index definitions (performance critical)

### Security Components

- Policies (`app/Policies/`)
- Middleware (`app/Http/Middleware/`)
- Auth routes and controller

### Core Services

- `StorageService` - File handling
- `AIService` - AI provider abstraction
- `MailService` - Email configuration

### API Response Structure

Changes to Resource classes affect the frontend. Coordinate changes.

---

## Pre-Submission Checklist

Before submitting changes, verify ALL items:

### Security & Architecture
- [ ] Household isolation is maintained (no cross-household data access)
- [ ] New resources have appropriate Policy
- [ ] Controllers call `Gate::authorize()` for protected actions
- [ ] New fields added to Model, Resource, AND TypeScript type
- [ ] File uploads use household-scoped paths
- [ ] File deletions clean up storage
- [ ] No N+1 queries (use eager loading)

### Testing (MANDATORY)
- [ ] **Backend tests pass**: `cd backend && ./vendor/bin/pest`
- [ ] **Frontend tests pass**: `cd frontend && npm run test:run`
- [ ] **New features have tests**: Every new endpoint, component, or function has corresponding tests
- [ ] **E2E tests pass** (for UI changes): `cd frontend && npm run test:e2e`
- [ ] **Bug fixes include regression test**: Test proving the bug is fixed

### Documentation (MANDATORY for significant changes)
- [ ] **ADR created** for architectural decisions (see `docs/adr/`)
- [ ] **TypeScript types updated** if API response changed
- [ ] **API documentation updated** if endpoints changed
- [ ] **README updated** if setup process changed

### Code Quality
- [ ] Code follows existing patterns in the codebase
- [ ] No debug/console.log statements left in code
- [ ] Error handling is consistent with existing code
- [ ] Loading/error states handled in UI

---

## Testing Patterns

### Backend Feature Test Example

```php
// tests/Feature/ItemTest.php
use App\Models\Item;
use App\Models\User;

test('user can create item', function () {
    $user = User::factory()->create();
    
    $response = $this->actingAs($user)
        ->postJson('/api/items', [
            'name' => 'Test Item',
            'brand' => 'Test Brand',
        ]);
    
    $response->assertStatus(201)
        ->assertJsonPath('item.name', 'Test Item');
    
    $this->assertDatabaseHas('items', [
        'name' => 'Test Item',
        'household_id' => $user->household_id,
    ]);
});

test('user cannot access other household items', function () {
    $user = User::factory()->create();
    $otherItem = Item::factory()->create(); // Different household
    
    $response = $this->actingAs($user)
        ->getJson("/api/items/{$otherItem->id}");
    
    $response->assertStatus(403);
});
```

### Frontend Component Test Example

```tsx
// src/components/ui/__tests__/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

describe('Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    await userEvent.click(screen.getByRole('button'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

### E2E Test Example

```typescript
// e2e/items.spec.ts
import { test, expect } from '@playwright/test'

test('user can add a new item', async ({ page }) => {
  // Login first
  await page.goto('/login')
  await page.fill('input[name="email"]', 'test@example.com')
  await page.fill('input[name="password"]', 'password')
  await page.click('button[type="submit"]')
  
  // Navigate to items
  await page.goto('/items')
  await page.click('text=Add Item')
  
  // Fill form
  await page.fill('input[name="name"]', 'New Test Item')
  await page.click('button[type="submit"]')
  
  // Verify
  await expect(page.locator('text=New Test Item')).toBeVisible()
})
```

---

## Common Patterns Reference

### Adding a New API Resource

1. Create Model with `household_id` (if applicable)
2. Create Migration
3. Create Policy with household checks
4. Create Resource transformer
5. Create Controller with proper authorization
6. Add routes to `routes/api.php`
7. Add TypeScript types
8. Add API service methods
9. Register Policy in `AuthServiceProvider` (if not auto-discovered)
10. **Write Pest feature tests** (`backend/tests/Feature/`)
11. **Write frontend tests** if UI components added
12. **Create ADR** if introducing new patterns

### Adding a New Frontend Page

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Layout.tsx`
4. Create API methods in `frontend/src/services/api.ts`
5. Update types in `frontend/src/types/index.ts`
6. **Write page tests** (`frontend/src/pages/__tests__/`)
7. **Write E2E tests** (`frontend/e2e/`)
8. Add `HelpTooltip` for contextual help where appropriate

### Adding a New Component

1. Create component in `frontend/src/components/`
2. Export from index file if in `/ui/`
3. **Write component tests** (`frontend/src/components/ui/__tests__/`)
4. Document props with JSDoc comments

### Adding a Field to Existing Resource

1. Migration: Add column
2. Model: Add to `$fillable`, add cast if needed
3. Resource: Add to `toArray()` return
4. Request: Add validation rule
5. TypeScript: Update interface
6. Frontend: Update forms/displays
7. **Update existing tests** to cover new field

### Creating Tests for Existing Code

When adding tests for code that doesn't have them:

```bash
# Backend: Create feature test
touch backend/tests/Feature/NewFeatureTest.php

# Frontend: Create component test
touch frontend/src/components/ui/__tests__/ComponentName.test.tsx

# Frontend: Create store test
touch frontend/src/stores/__tests__/storeName.test.ts

# E2E: Create flow test
touch frontend/e2e/feature.spec.ts
```

---

## CI/CD Integration

All pushes and pull requests automatically run:

1. **Frontend Tests** (Vitest) - Unit & component tests
2. **Backend Tests** (Pest PHP) - Feature & unit tests
3. **E2E Tests** (Playwright) - Full browser tests

See `.github/workflows/test.yml` for configuration.

### Running Tests Locally (Before Push)

```bash
# Quick check - run all tests
npm run test:run --prefix frontend && \
  cd backend && ./vendor/bin/pest && cd ..

# Full check including E2E (app must be running)
npm run test:run --prefix frontend && \
  cd backend && ./vendor/bin/pest && cd .. && \
  npm run test:e2e --prefix frontend
```

---

## Questions?

If you're unsure whether a change is safe:

1. Check if the pattern exists elsewhere in the codebase
2. Look for the `household_id` filtering pattern
3. Verify Policy authorization is in place
4. Ensure TypeScript types match API responses
5. **Run tests** - they will catch many issues
6. **Review existing tests** for similar functionality as examples