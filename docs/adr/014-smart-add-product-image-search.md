# ADR 014: Smart Add Product Image Search

## Status

Accepted

## Date

2024-12-30

## Context

Smart Add allows users to identify products via photo upload or text search. Previously, search results only displayed brand initials as placeholders (e.g., "LG" for an LG appliance), making it difficult for users to visually verify which result was correct.

The `ProductImageSearchService::getBestImage()` was previously disabled (stub returning null) due to timeout issues when searching during the initial analysis phase.

### Problem

Users could not visually identify products in search results, leading to:
- Difficulty selecting the correct product from similar matches
- Lower confidence in AI suggestions
- Poor user experience when multiple results had similar names

## Decision

We implemented **lazy-loaded product images** following the same pattern as ADR-002 (Part Image Search):

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│              Smart Add Product Search Flow                  │
└────────────────────────────────────────────────────────────┘

1. User searches for product
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  POST /items/analyze-image                                  │
│  Returns: results array (make, model, type, confidence)     │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  Frontend renders results with loading skeletons            │
└────────────────────────────────────────────────────────────┘
         │
         ▼ (for top 5 results, in parallel)
┌────────────────────────────────────────────────────────────┐
│  POST /items/search-product-image                           │
│  { make: "LG", model: "C4 OLED", type: "TV" }             │
│  Returns: { success, image_url, search_term }              │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  Frontend updates result card with loaded image             │
│  Falls back to initials if image search fails               │
└────────────────────────────────────────────────────────────┘
```

### Backend Implementation

Re-enabled `ProductImageSearchService::getBestImage()` method:

```php
public function getBestImage(string $make, string $model, string $type = ''): ?string
{
    $searchTerm = $this->buildSearchTerm($make, $model, $type);
    return $this->searchAmazonForImage($searchTerm);
}
```

New endpoint `POST /items/search-product-image`:
- Accepts: `{ make, model, type }`
- Returns: `{ success, image_url, search_term }`
- Uses 5-second timeout to prevent blocking
- No authentication required beyond session

### Frontend Implementation

```typescript
// State for lazy-loaded images
const [productImages, setProductImages] = useState<Record<number, string | null>>({})
const [imageLoadingStates, setImageLoadingStates] = useState<Record<number, boolean>>({})

// useEffect triggers image search when results change
useEffect(() => {
  results.slice(0, 5).forEach(async (result, index) => {
    const response = await items.searchProductImage(result.make, result.model, result.type)
    setProductImages(prev => ({ ...prev, [index]: response.image_url }))
  })
}, [results])
```

### UI States

| State | Display |
|-------|---------|
| Loading | Pulsing gray skeleton |
| Image found | Product image (object-fit: cover) |
| Image failed/missing | Brand initials gradient |
| Image load error | Falls back to initials |

## Consequences

### Positive

- **Fast Initial Response**: Results appear immediately with loading skeletons
- **Visual Product Identification**: Users can see actual product images
- **Progressive Enhancement**: Images load in background without blocking
- **Graceful Degradation**: Falls back to initials when images unavailable
- **Reuses Existing Infrastructure**: Same DuckDuckGo → Amazon approach as parts
- **No Additional API Keys**: Free image search via DuckDuckGo

### Negative

- **Unreliable Images**: Web scraping can return irrelevant results
- **Rate Limiting Risk**: Heavy usage could trigger DuckDuckGo blocks
- **Amazon-Centric**: Only searches Amazon products
- **Additional Network Requests**: 5 extra requests per search

### Limitations

- Only top 5 results get images (to avoid rate limiting)
- Images may not match exact product variant
- 5-second timeout means some images may not load

## Implementation Details

### Files Changed

- `backend/app/Services/ProductImageSearchService.php` - Re-enabled `getBestImage()`
- `backend/app/Http/Controllers/Api/ItemController.php` - Added `searchProductImage()`
- `backend/routes/api.php` - Added `/items/search-product-image` route
- `frontend/src/services/api.ts` - Added `searchProductImage()` method
- `frontend/src/pages/SmartAddPage.tsx` - Added lazy loading state and UI

### Future Improvements

- Add caching for searched product images
- Support multiple image search providers
- Add image validation before displaying
- Consider paid image search API for better reliability

## Related Decisions

- [ADR-002: Part Image Search Strategy](002-part-image-search-strategy.md) - Original lazy-loading pattern
- [ADR-003: Smart Add Photo Attachment](003-smart-add-photo-attachment.md) - Photo attachment logic
