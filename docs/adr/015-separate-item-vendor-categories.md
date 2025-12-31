# ADR 015: Separate Item and Vendor Categories

## Status

Accepted

## Date

2025-01-02

## Context

The `Category` model was originally shared between Items and Vendors. This created confusion because:

- Item categories (e.g., "Appliances", "Electronics") are conceptually different from vendor categories (e.g., "Plumber", "Electrician", "Appliance Repair")
- Users may want to organize items and vendors differently
- The current UI showed all categories together, making it unclear which categories apply to items vs vendors
- There was no way to distinguish between categories meant for items versus those meant for vendors

## Decision

We decided to separate categories into two distinct types: **Item Categories** and **Vendor Categories**, while maintaining a single database table for simplicity and backward compatibility.

### Implementation Approach

1. **Database Schema**: Added a `type` column to the `categories` table with values `'item'` or `'vendor'`
   - All existing categories are migrated to `type = 'item'` for backward compatibility
   - Added index on `(household_id, type)` for efficient filtering

2. **Backend Changes**:
   - Updated `Category` model to include `type` in fillable fields and added `scopeOfType()` scope
   - Updated `CategoryController` to accept optional `type` query parameter in `index()` method
   - Updated `CategoryController` to require `type` field in `store()` validation
   - Updated `CategoryResource` to include `type` in API responses
   - Updated `CategorySeeder` to create both item and vendor default categories

3. **Frontend Changes**:
   - Updated `Category` TypeScript interface to include `type: 'item' | 'vendor'`
   - Updated `categories.list()` API method to accept optional `type` parameter
   - Split Settings page categories section into two separate subsections:
     - **Item Categories**: Manage categories for items
     - **Vendor Categories**: Manage categories for vendors
   - Updated all item-related forms to filter categories by `type='item'`
   - Updated all vendor-related forms to filter categories by `type='vendor'`

4. **Data Migration**:
   - All existing categories are automatically set to `type = 'item'` during migration
   - This preserves existing data and relationships
   - Users can manually create vendor categories after migration

## Consequences

### Positive

- Clear separation between item and vendor categories improves user experience
- Users can organize items and vendors independently
- Settings UI clearly shows which categories apply to which entity type
- Single table approach maintains simplicity and avoids complex joins
- Backward compatible - existing categories are preserved
- Efficient filtering with database index on `(household_id, type)`

### Negative

- Requires database migration for existing installations
- All existing categories default to 'item' type - users need to manually create vendor categories
- Slightly more complex API (optional type parameter)
- Frontend needs to filter categories by type in multiple places

## Related Decisions

- [ADR-004: Development Guidelines for Core Functionality](004-development-guidelines-core-functionality.md) - Follows household-based multi-tenancy patterns
- [ADR-013: Vendor Search & Address Features](013-vendor-search-address-features.md) - Vendor-related features
