# Housarr Test Suite Fix Plan

Generated: 2025-01-01

## Executive Summary

| Test Suite | Total | Passed | Failed | Pass Rate |
|------------|-------|--------|--------|-----------|
| Backend (Pest PHP) | 317 | 158 | 159 | 50% |
| Frontend (Vitest) | 14 | 2 | 12 | 14% |
| E2E (Playwright) | 79 | 8 | 71 | 10% |

**Root Causes Identified:**
- Missing factory classes (FIXED during this analysis - 8 factories created)
- Tests written for APIs that were never implemented or changed
- Tests expecting wrong HTTP methods/routes
- Tests expecting wrong response formats
- UI component tests not updated after CSS/component changes
- E2E tests lack proper authentication setup and test data

---

## Debug Code Review: PASSED

No critical debug code was found:
- No `console.log()` statements in production frontend code
- No `dd()`, `dump()`, `var_dump()`, `print_r()` in PHP
- No `debugger;` statements

Acceptable logging found:
- 62 `Log::debug()`/`Log::info()` statements in services (proper application logging)
- 7 `console.error()` statements for legitimate error handling

---

## Backend Test Failures (159 failures)

### Category 1: Unit Tests - API Method Mismatches (TEST BUGS)

**Files Affected:**
- `tests/Unit/AIServiceTest.php`
- `tests/Unit/AIModelServiceTest.php`
- `tests/Unit/AIAgentOrchestratorTest.php`
- `tests/Unit/ManualSearchServiceTest.php`

**Issues:**
| Test File | Called Method | Actual API |
|-----------|--------------|------------|
| AIServiceTest | `hasProvider()` | Method doesn't exist |
| AIServiceTest | `buildImageAnalysisPrompt()` | Method doesn't exist |
| AIServiceTest | `getAvailableProviders()` | Method doesn't exist |
| ManualSearchServiceTest | `search()` | Method is `searchForManual()` |
| AIAgentOrchestratorTest | Constructor with 6 args | Constructor requires 7 args |

**Recommendation:** Rewrite unit tests to match actual service APIs or remove tests for non-existent methods.

---

### Category 2: Feature Tests - Route/Method Mismatches (TEST BUGS)

**Files Affected:**
- `tests/Feature/SettingTest.php`
- `tests/Feature/ChatTest.php`

**Issues:**

| Test | Expected Route | Actual Route |
|------|---------------|--------------|
| SettingTest | `POST /api/settings` | `PATCH /api/settings` |
| SettingTest | `POST /api/settings/storage` | Route doesn't exist (only GET) |
| SettingTest | `POST /api/settings/ai/agents` | `PATCH /api/settings/ai/agents/{agent}` |
| SettingTest | `/api/settings/prompts` | Route doesn't exist |
| ChatTest | `GET /api/chat/history` | Route doesn't exist |
| ChatTest | `DELETE /api/chat/history` | Route doesn't exist |

**Recommendation:** Update tests to use correct HTTP methods or remove tests for routes that don't exist.

---

### Category 3: Feature Tests - Response Format Mismatches (TEST BUGS)

**Files Affected:**
- `tests/Feature/DashboardTest.php`
- `tests/Feature/TodoTest.php`
- `tests/Feature/VendorTest.php`

**Issues:**

| Test | Expected | Actual |
|------|----------|--------|
| DashboardTest | `stats.total_items` | `items_count` (flat structure) |
| TodoTest destroy | 204 No Content | 200 with JSON message |
| VendorTest destroy | 204 No Content | 200 with JSON message |
| VendorTest search | 1 result | 2 results (test data issue) |

**Recommendation:** 
- Update DashboardTest to expect flat response structure
- Either update tests to expect 200 with message OR update controllers to return 204

---

### Category 4: Database Schema Issues (MIXED)

**File:** `tests/Feature/TodoTest.php`

**Issue:** Test creates todos with `completed` field, but model uses `completed_at`

**Error:** `SQLSTATE[HY000]: General error: 1 table todos has no column named completed`

**Recommendation:** Update test to use `completed_at` field name.

---

## Frontend Test Failures (12 failures)

### Category: CSS/Component Changes Not Reflected in Tests (TEST BUGS)

**Files Affected:**
- `src/components/ui/__tests__/Button.test.tsx`
- `src/components/ui/__tests__/Input.test.tsx`
- `src/components/ui/__tests__/Modal.test.tsx`
- `src/components/ui/__tests__/Tabs.test.tsx`
- `src/components/settings/__tests__/AIAgentCard.test.tsx`
- `src/pages/__tests__/RoomsPage.test.tsx`

**Issues:**

| Component | Test Assertion | Actual |
|-----------|---------------|--------|
| Button ghost | `bg-transparent` | Different class |
| Button large | `px-5` | Different class |
| Input | Label rendering assertions | Structure changed |
| Modal | Overlay click, size classes | Implementation changed |
| Tabs | `aria-current` attribute | Not present |
| AIAgentCard | Button with "expand" label | Button has no name |
| RoomsPage | Items count display | Structure changed |

**Recommendation:** Update tests to match current component implementations. Use more flexible assertions (test behavior, not implementation details).

---

## E2E Test Failures (71 failures)

### Category: Authentication/Setup Issues (ENVIRONMENT/TEST SETUP)

**Root Cause:** E2E tests cannot authenticate because:
1. No test users seeded in database
2. CSRF/Sanctum configuration may not work in test environment
3. Tests assume existing data that doesn't exist

**Errors:** Almost all tests fail with login/authentication issues:
```
Error: page.waitForURL: Timeout waiting for URL /dashboard
```

**Recommendation:**
1. Create E2E setup script that seeds test data:
   - Test user (test@example.com / password)
   - Test household
   - Sample items, reminders, todos
2. Consider using Playwright's `storageState` to share authenticated session
3. Add `beforeAll` hook to authenticate once before all tests
4. Create a `tests/e2e-setup.ts` helper file

---

## Fix Priority and Effort Estimate

### High Priority (Required for CI/CD)

| Item | Effort | Impact |
|------|--------|--------|
| Fix backend unit tests (AIServiceTest, etc.) | 2-4 hours | Fixes ~25 tests |
| Fix backend feature test routes/methods | 2-4 hours | Fixes ~40 tests |
| Fix backend response format assertions | 1-2 hours | Fixes ~10 tests |
| Fix Todo schema issue | 15 minutes | Fixes ~5 tests |

### Medium Priority (Improves Coverage)

| Item | Effort | Impact |
|------|--------|--------|
| Fix frontend component test assertions | 2-3 hours | Fixes 12 tests |
| Setup E2E authentication/seeding | 4-6 hours | Fixes 60+ tests |

### Low Priority (Nice to Have)

| Item | Effort | Impact |
|------|--------|--------|
| Add missing route implementations | Variable | Enables new tests |
| Improve test data isolation | 2-3 hours | Reduces flaky tests |

---

## Specific Fix Actions

### Backend Fixes

#### 1. Fix AIServiceTest.php
Replace or remove tests for non-existent methods. Test actual methods:
- `isAvailable()`
- `getProvider()`
- `getModel()`
- `complete()`

#### 2. Fix SettingTest.php
- Change `POST /api/settings` to `PATCH /api/settings`
- Remove or update tests for non-existent routes
- Update assertions to match actual response structure

#### 3. Fix ChatTest.php
- Remove tests for `/api/chat/history` (route doesn't exist)
- OR add the missing routes to `routes/api.php`

#### 4. Fix DashboardTest.php
Change:
```php
->assertJsonStructure(['stats' => ['total_items', ...]])
```
To:
```php
->assertJsonStructure(['items_count', 'upcoming_reminders', ...])
```

#### 5. Fix TodoTest.php
Change:
```php
Todo::factory()->create(['completed' => true])
```
To:
```php
Todo::factory()->completed()->create()
// or
Todo::factory()->create(['completed_at' => now()])
```

#### 6. Fix Delete Response Assertions
Either update tests:
```php
$response->assertOk()->assertJson(['message' => 'deleted']);
```
Or update controllers to return 204.

### Frontend Fixes

#### 1. Update Button.test.tsx
Use flexible assertions or update expected classes:
```tsx
// Instead of checking specific classes
expect(button).toHaveClass('bg-transparent')
// Check behavior or data attributes
expect(button).toHaveAttribute('data-variant', 'ghost')
```

#### 2. Fix AIAgentCard.test.tsx
The expand button has no accessible name. Either:
- Add `aria-label="Expand"` to the button
- Query by a different method (test-id, icon, etc.)

### E2E Fixes

#### 1. Create test setup script
```typescript
// e2e/setup/auth.ts
export async function loginTestUser(page: Page) {
  await page.goto('/login')
  await page.fill('[name="email"]', 'test@example.com')
  await page.fill('[name="password"]', 'password')
  await page.click('[type="submit"]')
  await page.waitForURL('/dashboard')
}
```

#### 2. Add database seeder for E2E tests
```php
// database/seeders/E2ETestSeeder.php
public function run(): void
{
    $household = Household::create(['name' => 'Test Household']);
    User::create([
        'household_id' => $household->id,
        'name' => 'Test User',
        'email' => 'test@example.com',
        'password' => bcrypt('password'),
        'role' => 'admin',
    ]);
    // ... seed items, reminders, etc.
}
```

---

## Files Created During Analysis

The following factory files were created to fix missing factory errors:

1. `backend/database/factories/ItemFactory.php`
2. `backend/database/factories/CategoryFactory.php`
3. `backend/database/factories/VendorFactory.php`
4. `backend/database/factories/ReminderFactory.php`
5. `backend/database/factories/TodoFactory.php`
6. `backend/database/factories/PartFactory.php`
7. `backend/database/factories/MaintenanceLogFactory.php`
8. `backend/database/factories/SettingFactory.php`

These reduced backend failures from 211 to 159.

---

## Next Steps

1. **Immediate:** Fix critical test bugs to establish passing baseline
2. **Short-term:** Set up E2E test infrastructure with authentication
3. **Long-term:** Improve test coverage and reduce implementation-specific assertions

---

## Appendix: Test Commands

```bash
# Backend tests
cd backend && php vendor/bin/pest

# Frontend unit tests
cd frontend && npm run test:run

# E2E tests (requires servers running)
cd frontend && npm run test:e2e

# Run specific test file
cd backend && php vendor/bin/pest --filter=ItemTest
cd frontend && npm test -- Button.test.tsx
```
