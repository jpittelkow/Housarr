# Housarr Contribution Requirements

This is a condensed checklist of mandatory requirements for contributing to Housarr. For detailed explanations and examples, see [CONTRIBUTING.md](CONTRIBUTING.md).

> **⚠️ CRITICAL: These requirements are MANDATORY. Your PR will be rejected if they are not met.**

---

## Quick Reference: Requirements by Task Type

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

---

## Pre-Submission Checklist

### 🔒 Security & Architecture (MANDATORY)
- [ ] Household isolation is maintained (no cross-household data access)
- [ ] New resources have appropriate Policy with household_id checks
- [ ] Controllers call `Gate::authorize()` for protected actions
- [ ] New fields added to Model, Resource, AND TypeScript type (API contract synchronized)
- [ ] File uploads use household-scoped paths
- [ ] File deletions clean up storage (use `deleteFile()` method)
- [ ] No N+1 queries (use eager loading with `with()` or `load()`)

### 🧪 Testing (MANDATORY)
- [ ] **Backend tests pass**: `cd backend && ./vendor/bin/pest`
- [ ] **Frontend tests pass**: `cd frontend && npm run test:run`
- [ ] **New features have tests**: Every new endpoint, component, or function has corresponding tests
- [ ] **E2E tests pass** (for UI changes): `cd frontend && npm run test:e2e`
- [ ] **Bug fixes include regression test**: Test proving the bug is fixed

### 📝 Documentation (MANDATORY for significant changes)
- [ ] **ADR created** for architectural decisions (see `docs/adr/`)
- [ ] **TypeScript types updated** if API response changed
- [ ] **API documentation updated** if endpoints changed
- [ ] **README updated** if setup process changed

### ✨ Code Quality
- [ ] Code follows existing patterns in the codebase
- [ ] No debug/console.log statements left in code
- [ ] Error handling uses `getApiErrorMessage()` for specific, actionable messages
- [ ] Loading/error states handled in UI

---

## Test Requirements Summary

### Every Change Requires Tests

| Change Type | Test Type | Location |
|-------------|-----------|----------|
| New API endpoint | Pest PHP feature test | `backend/tests/Feature/` |
| New React component | Vitest + React Testing Library | `frontend/src/components/**/__tests__/` |
| New page | Component test + E2E test | `frontend/src/pages/__tests__/` and `frontend/e2e/` |
| Bug fix | Regression test | Same location as feature |
| New Zustand store | Store unit test | `frontend/src/stores/__tests__/` |
| New utility function | Unit test | `frontend/src/lib/__tests__/` or `backend/tests/Unit/` |

### Running Tests

```bash
# Frontend
cd frontend && npm run test:run

# Backend
cd backend && ./vendor/bin/pest

# E2E (requires running app)
cd frontend && npm run test:e2e
```

---

## ADR Requirements Summary

### When ADRs Are Required (MANDATORY)

ADRs MUST be written for:
- ✅ New features that introduce new patterns or architecture
- ✅ Changes to authentication/authorization (security impact)
- ✅ Database schema changes (affects all data)
- ✅ New external integrations (APIs, services, third-party tools)
- ✅ Changes to the AI system (core functionality)
- ✅ Infrastructure changes (deployment, Docker, etc.)
- ✅ Any decision where someone would ask: "why was this done this way?"

**ADR Location**: `docs/adr/`  
**ADR Template**: See [docs/adr/README.md](adr/README.md)

**Rule of thumb**: If future developers would question "why was this done this way?", write an ADR.

---

## Documentation Requirements Summary

### When Documentation Updates Are Required

- ✅ **TypeScript types**: Always update if API response structure changes
- ✅ **API documentation**: Update if endpoints are added, modified, or removed
- ✅ **README**: Update if setup process, installation, or configuration changes
- ✅ **Model/Service docs**: Update if public APIs change

### API Contract Synchronization

These three files MUST stay synchronized:
1. `frontend/src/types/index.ts` - TypeScript interfaces
2. `frontend/src/services/api.ts` - API client methods
3. `backend/app/Http/Resources/*.php` - Response transformers

---

## Quick Commands

```bash
# Run all tests (from project root)
cd frontend && npm run test:run && cd ../backend && ./vendor/bin/pest

# Run E2E tests (app must be running)
cd frontend && npm run test:e2e

# Check if tests pass before committing
git add . && git commit -m "..."  # Run tests first!
```

---

## Need Help?

- 📖 **Detailed guidelines**: See [CONTRIBUTING.md](CONTRIBUTING.md)
- 🧪 **Testing guide**: See [DOCUMENTATION_TESTING.md](DOCUMENTATION_TESTING.md)
- 📋 **ADR template**: See [docs/adr/README.md](adr/README.md)

---

**Remember**: These requirements exist to maintain code quality, security, and maintainability. Following them ensures your contributions can be safely merged into the codebase.
