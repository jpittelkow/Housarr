# Housarr Development Guidelines

This document outlines critical architectural patterns and rules that **MUST** be followed when making changes to Housarr. Breaking these patterns can cause data leaks, security vulnerabilities, or application failures.

---

## 🚨 STOP: Read This First!

> **⚠️ CRITICAL: Before writing ANY code, you MUST understand these requirements. Your PR will be rejected if these are not met.**

### Quick Checklist

- [ ] **Tests are written** - Every feature/bugfix requires tests (see [Requirements](#-mandatory-requirements) below)
- [ ] **Tests pass** - Run full test suite before submitting
- [ ] **ADR created** - If this is a significant change (see [When ADRs Are Required](#2-adrs-are-required-for-significant-changes))
- [ ] **Documentation updated** - TypeScript types, API docs, README if needed

### Quick Reference: Requirements by Task Type

| Task Type | Tests Required? | ADR Required? | Documentation Required? |
|-----------|----------------|---------------|------------------------|
| New API endpoint | ✅ **YES** - Pest PHP feature test | If significant pattern change | ✅ Update TypeScript types, API docs |
| New React component | ✅ **YES** - Vitest + React Testing Library | ❌ No | ❌ No (unless public API) |
| New page | ✅ **YES** - Component test + E2E test | ❌ No | ❌ No (unless new pattern) |
| Bug fix | ✅ **YES** - Regression test proving fix | ❌ No | ❌ No |
| New Zustand store | ✅ **YES** - Store unit test | ❌ No | ❌ No |
| New utility function | ✅ **YES** - Unit test | ❌ No | ❌ No |
| Database schema change | ✅ **YES** - Migration + model tests | ✅ **YES** - Always | ✅ Update model docs |
| Authentication/Authorization change | ✅ **YES** - Security tests | ✅ **YES** - Always | ✅ Update security docs |
| New external integration | ✅ **YES** - Integration tests | ✅ **YES** - Always | ✅ Update integration docs |
| AI system changes | ✅ **YES** - AI service tests | ✅ **YES** - Always | ✅ Update AI docs |
| Infrastructure changes | ✅ **YES** - Deployment tests | ✅ **YES** - Always | ✅ Update deployment docs |

> **💡 Don't know if an ADR is needed?** If future developers would ask "why was this done this way?", write an ADR. See [ADR Requirements](#2-adrs-are-required-for-significant-changes) for details.

---

## 📐 Planning Your Implementation

> **⚠️ CRITICAL: When creating implementation plans, ADR creation and documentation updates MUST be included as separate, trackable steps when required.**

Before writing code, create an implementation plan that includes all required steps. **Implementation plans MUST explicitly include:**

- **ADR creation steps** - When the change requires an ADR (see [When ADRs Are Required](#2-adrs-are-required-for-significant-changes)), the plan MUST include a step to create the ADR document. This should be a separate, trackable todo item, not just mentioned in passing.
- **Documentation update steps** - When documentation is required (TypeScript types, API docs, README, etc.), the plan MUST include specific steps to update each affected documentation file. These should be explicit, actionable todos (e.g., "Update TypeScript types in `frontend/src/types/index.ts`").
- **Test verification steps** - Plans MUST include steps to run the full test suite after major implementation milestones to ensure nothing broke. These should be explicit, actionable todos (e.g., "Run backend tests: `cd backend && ./vendor/bin/pest`", "Run frontend tests: `cd frontend && npm run test:run`").
- **Test writing verification** - Plans MUST verify that required tests have been written and are passing. After writing new code, the plan must include a step to verify tests exist and pass.

**Why this matters:**
- Plans that omit ADR/documentation steps lead to incomplete implementations
- Plans that omit test verification steps risk breaking existing functionality
- These steps are often forgotten if not explicitly tracked in the plan
- Reviewers need to see these steps in the plan to verify completeness

**Example of a good plan step:**
- ✅ "Create ADR 016 in `docs/adr/016-feature-name.md` documenting the decision to use X pattern"
- ✅ "Update TypeScript types in `frontend/src/types/index.ts` to include new `status` field"
- ✅ "Run backend tests: `cd backend && ./vendor/bin/pest` to verify no regressions"
- ✅ "Run frontend tests: `cd frontend && npm run test:run` to verify new component tests pass"

**Example of a bad plan step:**
- ❌ "Implement feature" (doesn't mention ADR, documentation, or test verification)
- ❌ "Update documentation" (too vague, doesn't specify which files)
- ❌ "Run tests" (too vague, doesn't specify which tests or when)

---

## 📋 Pre-Submission Checklist

**Before submitting your PR, verify ALL of these items:**

### 🔒 Security & Architecture (MANDATORY)
- [ ] Household isolation is maintained (no cross-household data access)
- [ ] New resources have appropriate Policy with household_id checks
- [ ] Controllers call `Gate::authorize()` for protected actions
- [ ] New fields added to Model, Resource, AND TypeScript type (API contract synchronized)
- [ ] File uploads use household-scoped paths
- [ ] File deletions clean up storage (use `deleteFile()` method)
- [ ] No N+1 queries (use eager loading with `with()` or `load()`)

### 🧪 Testing (MANDATORY)

> **⚠️ CRITICAL: ALL tests MUST pass before submission. Running tests is not optional - it's required to ensure you didn't break existing functionality.**

- [ ] **Backend tests pass**: `cd backend && ./vendor/bin/pest` - **MUST pass before submission**
- [ ] **Frontend tests pass**: `cd frontend && npm run test:run` - **MUST pass before submission**
- [ ] **New features have tests**: Every new endpoint, component, or function has corresponding tests
- [ ] **Tests were written for new code**: Verify that all new code has corresponding tests (check test files exist and are not empty)
- [ ] **E2E tests pass** (for UI changes): `cd frontend && npm run test:e2e` - **MUST pass if UI changed**
- [ ] **Bug fixes include regression test**: Test proving the bug is fixed
- [ ] **Tests run after major changes**: Tests were run after completing major implementation steps (not just at the end)

> **💡 When to run tests:**
> - After completing each major implementation step (e.g., after adding a new API endpoint, after adding a new component)
> - Before marking any plan as complete
> - As a final verification before PR submission
> - If any test fails, fix the issue before proceeding

### 📝 Documentation (MANDATORY for significant changes)
- [ ] **ADR created** for architectural decisions (see [ADR Requirements](#2-adrs-are-required-for-significant-changes) and `docs/adr/`)
- [ ] **TypeScript types updated** if API response changed (see [API Contract](#critical-rule-2-frontend-backend-api-contract))
- [ ] **API documentation updated** if endpoints changed
- [ ] **README updated** if setup process changed

> **⚠️ Planning Requirement:** When creating implementation plans for changes that require documentation updates, the plan MUST include specific documentation update steps. These should be explicit, actionable todos that specify which files need to be updated (e.g., "Update TypeScript types in `frontend/src/types/index.ts` to include new `status` field"). Vague steps like "update documentation" are not sufficient.

### ✨ Code Quality
- [ ] Code follows existing patterns in the codebase
- [ ] No debug/console.log statements left in code
- [ ] Error handling uses `getApiErrorMessage()` for specific, actionable messages
- [ ] Loading/error states handled in UI

---

## ⚠️ Mandatory Requirements

Before ANY code is merged, the following requirements **MUST** be met:

### 1. ⚠️ CRITICAL: Tests Are Required

> **🚨 EVERY new feature, bug fix, or change MUST include tests. No exceptions.**

**What happens if you skip tests?**
- ❌ Your PR will be automatically rejected by CI/CD
- ❌ Code review will request tests before approval
- ❌ Risk of introducing bugs that could break production

| Change Type | Required Tests | Test Location |
|-------------|----------------|---------------|
| New API endpoint | Pest PHP feature test | `backend/tests/Feature/` |
| New React component | Vitest + React Testing Library test | `frontend/src/components/**/__tests__/` |
| New page | Page component test + E2E test (Playwright) | `frontend/src/pages/__tests__/` and `frontend/e2e/` |
| Bug fix | Regression test proving the fix | Same location as feature |
| New Zustand store | Store unit test | `frontend/src/stores/__tests__/` |
| New utility function | Unit test | `frontend/src/lib/__tests__/` or `backend/tests/Unit/` |

```bash
# Run all tests before submitting changes
# Frontend
cd frontend && npm run test:run

# Backend
cd backend && ./vendor/bin/pest

# E2E (requires running app)
cd frontend && npm run test:e2e
```

**When to run tests:**
- ✅ **After completing major implementation steps** - Run tests after adding a new API endpoint, component, or significant feature to catch regressions early
- ✅ **Before marking any plan as complete** - Never mark a plan as finished without verifying all tests pass
- ✅ **As a final verification before PR submission** - Always run the full test suite one final time before submitting
- ✅ **If any test fails, fix the issue before proceeding** - Don't continue with implementation if tests are failing

> **⚠️ Tests MUST pass before merging. CI/CD will automatically reject PRs with failing tests.**

📖 See [DOCUMENTATION_TESTING.md](DOCUMENTATION_TESTING.md) for complete testing guide with examples.

---

### 2. ⚠️ CRITICAL: ADRs Are Required for Significant Changes

> **🚨 Architecture Decision Records (ADRs) MUST be written for significant architectural changes. This is mandatory, not optional.**

**What happens if you skip an ADR?**
- ❌ Future developers won't understand why decisions were made
- ❌ Code review will request an ADR for significant changes
- ❌ Risk of re-implementing patterns without understanding context

**ADRs MUST be written for:**
- ✅ New features that introduce new patterns or architecture
- ✅ Changes to authentication/authorization (security impact)
- ✅ Database schema changes (affects all data)
- ✅ New external integrations (APIs, services, third-party tools)
- ✅ Changes to the AI system (core functionality)
- ✅ Infrastructure changes (deployment, Docker, etc.)
- ✅ Any decision where someone would ask: "why was this done this way?"

**ADR Location**: `docs/adr/`  
**ADR Template**: See [docs/adr/README.md](adr/README.md)

**When in doubt, write an ADR.** It's better to document too much than too little.

> **⚠️ Planning Requirement:** When creating implementation plans for changes that require ADRs, the plan MUST include a step to create the ADR document. This should be a separate, trackable todo item in the plan (e.g., "Create ADR 016 in `docs/adr/016-feature-name.md`"). The ADR should be created as part of the implementation, not as an afterthought.

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

---

### 3. ⚠️ CRITICAL: Run Full Test Suite Before Submitting

> **🚨 Always run the full test suite before submitting your PR. Don't rely only on CI/CD.**

**What happens if tests fail in CI/CD?**
- ❌ Your PR will be marked as failing
- ❌ You'll need to fix issues and push again
- ❌ Slows down the review process

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

> **⚠️ REMINDER: Before starting any implementation, review the [Pre-Submission Checklist](#-pre-submission-checklist) and [Mandatory Requirements](#️-mandatory-requirements) above. Tests and documentation are required!**

### Adding a New API Resource

> **📋 Requirements Check:**
> - ✅ Tests: Pest PHP feature test required
> - ✅ ADR: Required if introducing new patterns
> - ✅ Documentation: Update TypeScript types and API docs

1. Create Model with `household_id` (if applicable)
2. Create Migration
3. Create Policy with household checks
4. Create Resource transformer
5. Create Controller with proper authorization
6. Add routes to `routes/api.php`
7. **⚠️ Update TypeScript types** in `frontend/src/types/index.ts` - **MANDATORY** (API contract)
8. Add API service methods in `frontend/src/services/api.ts`
9. Register Policy in `AuthServiceProvider` (if not auto-discovered)
10. **⚠️ Write Pest feature tests** (`backend/tests/Feature/`) - **MANDATORY**
11. **⚠️ Write frontend tests** if UI components added - **MANDATORY**
12. **⚠️ Create ADR** in `docs/adr/` if introducing new patterns - **MANDATORY if significant** (see [ADR Requirements](#2-adrs-are-required-for-significant-changes))
13. **⚠️ Update API documentation** if endpoints changed - **MANDATORY if API contract changed**

### Adding a New Frontend Page

> **📋 Requirements Check:**
> - ✅ Tests: Page component test + E2E test required
> - ✅ ADR: Required if introducing new navigation/route patterns
> - ✅ Documentation: Update types if API changes

1. Create page component in `frontend/src/pages/`
2. Add route in `frontend/src/App.tsx`
3. Add navigation link in `frontend/src/components/Layout.tsx`
4. Create API methods in `frontend/src/services/api.ts`
5. **⚠️ Update TypeScript types** in `frontend/src/types/index.ts` if API response changed - **MANDATORY** (API contract)
6. **⚠️ Write page tests** (`frontend/src/pages/__tests__/`) - **MANDATORY**
7. **⚠️ Write E2E tests** (`frontend/e2e/`) - **MANDATORY**
8. **⚠️ Create ADR** in `docs/adr/` if introducing new navigation/route patterns - **MANDATORY if significant** (see [ADR Requirements](#2-adrs-are-required-for-significant-changes))
9. Add `HelpTooltip` for contextual help where appropriate

### Adding a New Component

> **📋 Requirements Check:**
> - ✅ Tests: Vitest + React Testing Library test required
> - ✅ ADR: Not required for simple components
> - ✅ Documentation: JSDoc comments for props

1. Create component in `frontend/src/components/`
2. Export from index file if in `/ui/`
3. **⚠️ Write component tests** (`frontend/src/components/ui/__tests__/`) - **MANDATORY**
4. **⚠️ Document props with JSDoc comments** - **MANDATORY** (documentation requirement)

### Adding a Field to Existing Resource

> **📋 Requirements Check:**
> - ✅ Tests: Update existing tests to cover new field
> - ✅ ADR: Not required for simple field additions
> - ✅ Documentation: Must update TypeScript types (API contract)

1. Migration: Add column
2. Model: Add to `$fillable`, add cast if needed
3. Resource: Add to `toArray()` return
4. Request: Add validation rule
5. **⚠️ Update TypeScript types** in `frontend/src/types/index.ts` - **MANDATORY** (API contract)
6. Frontend: Update forms/displays
7. **⚠️ Update existing tests** to cover new field - **MANDATORY**

### Error Handling in Frontend

**All API error messages must be specific and actionable.** Use the `getApiErrorMessage()` helper to extract detailed error messages from API responses:

```typescript
import { getApiErrorMessage } from '@/lib/utils'

// In React Query mutations
const mutation = useMutation({
  mutationFn: (data) => api.updateItem(data),
  onError: (error) => {
    // ✅ CORRECT - Shows specific error from API
    toast.error(getApiErrorMessage(error, 'Failed to update item'))
  },
})

// ❌ WRONG - Generic messages hide useful information
onError: () => {
  toast.error('Failed to update item')  // User can't debug the issue!
}
```

The helper extracts messages from various API response formats:
- Laravel validation errors (`response.data.errors` object)
- Standard error messages (`response.data.message`)
- Error property (`response.data.error`)
- Axios error message (fallback)

**When to use:**
- All `onError` handlers in React Query mutations
- All `catch` blocks when calling API methods
- Any place where an API error could occur

**Example output:**
- Generic: "Failed to update item" ❌
- Specific: "The email has already been taken." ✅
- Specific: "invalid x-api-key" ✅
- Specific: "You exceeded your current quota" ✅

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