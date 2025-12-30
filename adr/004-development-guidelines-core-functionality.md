# ADR 004: Development Guidelines for Maintaining Core Functionality

## Status

Accepted

## Date

2024-12-29

## Context

Housarr is a multi-tenant home management application where data isolation between households is critical for security. As the codebase evolves and multiple contributors (human or AI) make changes, there's a risk of:

1. **Breaking household isolation** - The most critical security concern where users could access other households' data
2. **Breaking API contracts** - Frontend/backend type mismatches causing runtime errors
3. **Orphaning files** - Deleting database records without cleaning up associated storage files
4. **Missing authorization** - Adding endpoints without proper policy checks
5. **Inconsistent patterns** - Different approaches to the same problem making maintenance harder

Without documented guidelines, each contributor must reverse-engineer these patterns from existing code, which is error-prone and time-consuming.

## Decision

We created a comprehensive `CONTRIBUTING.md` file at the project root that documents:

### Critical Rules (Must Never Break)

1. **Household-Based Multi-Tenancy**
   - All queries must filter by `household_id`
   - New records must set `household_id` from authenticated user
   - Policies must verify `user->household_id === model->household_id`
   - Code examples showing correct and incorrect patterns

2. **Frontend-Backend API Contract**
   - Three synchronized files: TypeScript types, API service, Laravel Resources
   - Step-by-step guide for adding new fields

3. **Authorization via Policies**
   - Every controller action on existing resources must call `Gate::authorize()`
   - Policy pattern template with household check

4. **File Storage Patterns**
   - Household-scoped paths: `households/{id}/...`
   - Must use `$file->deleteFile()` for cleanup

### Documentation Structure

```
CONTRIBUTING.md
├── Architecture Overview (visual diagram)
├── Critical Rule #1: Household-Based Multi-Tenancy
│   ├── Required Patterns (with code examples)
│   ├── Policy Pattern
│   └── Models Reference Table
├── Critical Rule #2: Frontend-Backend API Contract
│   └── Adding a New Field (step-by-step)
├── Critical Rule #3: Authentication & Authorization
├── Critical Rule #4: Model Relationships
│   └── Cascade Deletion Requirements
├── Critical Rule #5: File Storage
├── Critical Rule #6: Settings Management
├── Do NOT Change Without Careful Review (list)
├── Testing Checklist
└── Common Patterns Reference
```

### Design Decisions

| Decision | Rationale |
|----------|-----------|
| Single file vs multiple | One file is easier to reference and maintain |
| Code examples included | Concrete examples prevent misinterpretation |
| "Correct vs Wrong" format | Visual contrast makes rules memorable |
| Testing checklist | Provides actionable verification steps |
| Reference tables | Quick lookup for model/field requirements |

## Consequences

### Positive

- **Reduced Risk**: Clear documentation of security-critical patterns
- **Faster Onboarding**: New contributors understand architecture quickly
- **AI Assistant Guidance**: AI tools can reference rules when making changes
- **Consistency**: All changes follow established patterns
- **Self-Documenting**: Checklist ensures nothing is forgotten

### Negative

- **Maintenance Overhead**: Guidelines must be updated when patterns change
- **Not Enforceable**: Documentation doesn't prevent violations (unlike tests)
- **Potential Staleness**: Could become outdated if not maintained

### Mitigations

- Link to specific code files so changes are discoverable
- Include in PR review checklist
- Consider automated linting rules for critical patterns (future)

## Related Decisions

- All existing ADRs should be reviewed against these guidelines
- Future ADRs should reference CONTRIBUTING.md for standard patterns
