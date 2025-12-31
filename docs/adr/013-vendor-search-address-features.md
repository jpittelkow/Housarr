# ADR 013: Vendor Search and Address Features

## Status

Accepted

## Date

2024-12-30

## Context

Housarr users need to find local service providers (plumbers, HVAC technicians, electricians, etc.) for their household items. Manually searching for vendors and entering their details is time-consuming. Additionally, address entry throughout the application was inconsistent and lacked validation.

Key requirements identified:
1. **Vendor Discovery**: Users want to search for local vendors based on their household location
2. **Address Validation**: Address inputs should provide autocomplete suggestions to reduce errors
3. **Household Location**: The household needs a stored address to enable proximity-based vendor search

## Decision

We implemented three interconnected features:

### 1. Household Address Field

Added an `address` field to the Household model to store the user's location:

- New migration adding `address` column to `households` table
- Updated `Household` model, resource, and controller
- Added address input to Settings page (General tab)

### 2. Address Autocomplete Component

Created a reusable `AddressInput` component using **OpenStreetMap/Nominatim** API:

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React)                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AddressInput Component                  │   │
│  │  - 300ms debounce for rate limiting                 │   │
│  │  - Dropdown with suggestions                        │   │
│  │  - Keyboard navigation support                      │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Laravel)                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              AddressController                       │   │
│  │  - GET /api/address/autocomplete                    │   │
│  │  - GET /api/address/reverse                         │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NominatimService                        │   │
│  │  - Rate limiting (1 req/sec)                        │   │
│  │  - Response caching (1 hour)                        │   │
│  │  - User-Agent header for Nominatim                  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│            OpenStreetMap Nominatim API                      │
│            (Free, no API key required)                      │
└─────────────────────────────────────────────────────────────┘
```

**Why Nominatim over Google Places:**
- Free and open source (no API key required)
- No usage costs for self-hosted applications
- Respects privacy (no data sent to Google)
- Sufficient accuracy for address autocomplete needs

### 3. AI-Powered Vendor Search

Added vendor search functionality using the existing AI Agent Orchestrator:

```
┌─────────────────────────────────────────────────────────────┐
│                     VendorsPage                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              VendorSearchModal                       │   │
│  │  - Search query input                               │   │
│  │  - Optional category filter                         │   │
│  │  - AI-powered results                               │   │
│  │  - One-click "Add to Vendors" action                │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     VendorController                        │
│  POST /api/vendors/search-nearby                           │
│  - Requires household address                              │
│  - Uses AIAgentOrchestrator                                │
│  - Returns parsed vendor suggestions                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   AIAgentOrchestrator                       │
│  - Calls active AI agents (Claude, OpenAI, Gemini, Local) │
│  - Summarizes results if multiple agents                   │
│  - Parses JSON response with vendor details                │
└─────────────────────────────────────────────────────────────┘
```

The AI prompt includes:
- Household address for proximity
- Search query (e.g., "HVAC repair")
- Optional category filter
- Structured JSON output format

## Consequences

### Positive

- **Zero Configuration for Address Autocomplete**: Users get address suggestions immediately without API key setup
- **Leverages Existing AI Infrastructure**: Vendor search reuses the AI Agent Orchestrator
- **Privacy-Friendly**: Nominatim doesn't track users or require accounts
- **Cost-Effective**: No per-request charges for address lookups
- **Improved UX**: Consistent address entry with validation across the app
- **Time Savings**: AI finds local vendors automatically

### Negative

- **Nominatim Rate Limits**: Max 1 request per second limits autocomplete responsiveness
- **AI Accuracy**: Vendor search results depend on AI knowledge, which may be outdated
- **No Verification**: AI-suggested vendor information should be verified by users
- **Network Dependency**: Both features require internet connectivity

### Mitigations

- Backend caching reduces Nominatim API calls
- 300ms debounce on frontend prevents excessive requests
- Clear UI indication that vendor results are AI-generated suggestions
- Users can edit vendor details after adding

## Files Changed

### Backend
- `database/migrations/2025_12_30_000001_add_address_to_households_table.php` - New migration
- `app/Models/Household.php` - Added address to fillable
- `app/Http/Resources/HouseholdResource.php` - Return address field
- `app/Http/Controllers/Api/HouseholdController.php` - Accept address in update
- `app/Services/NominatimService.php` - New service for OSM geocoding
- `app/Http/Controllers/Api/AddressController.php` - New controller
- `app/Http/Controllers/Api/VendorController.php` - Added searchNearby method
- `routes/api.php` - New routes for address and vendor search

### Frontend
- `src/types/index.ts` - Added address to Household type
- `src/services/api.ts` - Added address and vendor search endpoints
- `src/components/ui/AddressInput.tsx` - New autocomplete component
- `src/components/vendors/VendorSearchModal.tsx` - New search modal
- `src/pages/SettingsPage.tsx` - Added household address field
- `src/pages/VendorsPage.tsx` - Integrated search modal and AddressInput

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration (vendor search uses this)
- ADR 012: Docker Self-Hosted Deployment (Nominatim aligns with self-hosted philosophy)
