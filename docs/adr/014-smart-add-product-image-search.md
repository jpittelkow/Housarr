# ADR 014: Smart Add Product Image Search

## Status

Accepted

## Date

2024-12-30 (Updated: 2024-12-31)

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

**Image Search Strategy:**

The `ProductImageSearchService` uses a multi-tier approach to find product images:

1. **Primary: DuckDuckGo Image Search** - Searches DuckDuckGo's image search directly to extract actual image URLs from HTML results
2. **Fallback: Google Images** - If DuckDuckGo fails, falls back to Google Images search

**Key Implementation Details:**

```php
public function getBestImage(string $make, string $model, string $type = ''): ?string
{
    $searchTerm = $this->buildSearchTerm($make, $model, $type);
    return $this->searchAmazonForImage($searchTerm);
}

protected function searchAmazonForImage(string $searchTerm): ?string
{
    // Try DuckDuckGo image search first
    $imageUrl = $this->searchDuckDuckGoImages($searchTerm);
    
    if ($imageUrl) {
        return $imageUrl;
    }
    
    // Fallback to Google Images
    return $this->searchGoogleImages($searchTerm);
}
```

**Important Design Decisions:**

- **No ASIN-based URL construction**: Amazon image URLs cannot be reliably constructed from ASINs alone. The image identifiers in Amazon's CDN are encoded differently and are not the ASINs themselves. Attempting to construct URLs from ASINs results in 400 errors.

- **Direct URL extraction**: Instead of constructing URLs, we extract actual image URLs from search engine HTML results using regex patterns that match:
  - `data-src` attributes (for lazy-loaded images)
  - `src` attributes (for standard images)
  - JSON-embedded URLs
  - Direct image URL patterns

- **Multi-source fallback**: Uses DuckDuckGo first (privacy-focused, no API key needed), then Google Images as fallback for better coverage.

- **URL validation**: All extracted URLs are validated using `filter_var()` to ensure they're valid HTTP/HTTPS URLs before returning.

**New endpoint `POST /items/search-product-image`:**
- Accepts: `{ make, model, type }`
- Returns: `{ success, image_url, search_term }`
- Uses 10-second timeout to allow for search engine responses
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
- **Multi-Source Search**: Uses DuckDuckGo and Google Images for better coverage
- **No Additional API Keys**: Free image search via DuckDuckGo and Google
- **Reliable URLs**: Extracts actual working image URLs instead of constructing invalid ones
- **Better Fallback**: Google Images fallback increases success rate

### Negative

- **Unreliable Images**: Web scraping can return irrelevant results
- **Rate Limiting Risk**: Heavy usage could trigger search engine blocks
- **HTML Parsing Dependency**: Relies on search engine HTML structure (may break if they change)
- **Additional Network Requests**: 5 extra requests per search
- **No Image Validation**: Doesn't verify image content matches product before displaying

### Limitations

- Only top 5 results get images (to avoid rate limiting)
- Images may not match exact product variant
- 10-second timeout means some images may not load if search engines are slow
- Search engine HTML structure changes could break URL extraction
- No caching - same products searched multiple times will re-fetch images

## Implementation Details

### Files Changed

- `backend/app/Services/ProductImageSearchService.php` - Implemented `getBestImage()`, `searchDuckDuckGoImages()`, `searchGoogleImages()`
- `backend/app/Http/Controllers/Api/ItemController.php` - Added `searchProductImage()` method
- `backend/routes/api.php` - Added `/items/search-product-image` route
- `frontend/src/services/api.ts` - Added `searchProductImage()` method
- `frontend/src/pages/SmartAddPage.tsx` - Added lazy loading state, UI, image gallery import, and "Try Again" button

### Recent Enhancements (2024-12-31)

**Image Gallery Import**:
- When confirming a product from Smart Add results, product images are automatically imported to the item's image gallery
- If user uploaded a photo and checked "attach photo", the uploaded photo becomes featured and the product image is added to the gallery
- If user did a text search with "attach photo" checked, the product image becomes featured
- Product images are always imported to the gallery (unless already uploaded as featured) to provide visual reference

**Try Again Button**:
- Added "Try Again" button that appears when no result is selected
- When clicked, sends feedback to AI that previous results were incorrect
- AI receives modified query: `"{original_query} - None of the previous results were correct. Please try again with different suggestions."`
- Helps AI provide better alternative suggestions when initial results don't match

### Implementation Notes

**URL Extraction Patterns:**

The service uses multiple regex patterns to extract image URLs from search engine HTML:

1. `data-src` attributes (lazy-loaded images)
2. `src` attributes (standard images)
3. JSON-embedded URLs
4. Direct image URL patterns in HTML

**Error Handling:**

- All HTTP requests use 10-second timeout
- Failed requests are logged but don't block the UI
- Invalid URLs are filtered out before returning
- Frontend gracefully falls back to brand initials if image fails

**Search Term Construction:**

```php
protected function buildSearchTerm(string $make, string $model, string $type = ''): string
{
    $parts = array_filter([$make, $model, $type], fn($p) => !empty(trim($p)));
    return implode(' ', $parts);
}
```

This creates search terms like "Thor Kitchen HRG4808U Appliance" from the product information.

### Future Improvements

- Add caching for searched product images (cache by search term)
- Add image validation before displaying (verify image loads and matches product type)
- Consider paid image search API for better reliability (e.g., Bing Image Search API)
- Add image quality scoring to prefer higher-quality images
- Support multiple image results per product (carousel)
- Add retry logic with exponential backoff for failed searches

## Related Decisions

- [ADR-002: Part Image Search Strategy](002-part-image-search-strategy.md) - Original lazy-loading pattern
- [ADR-003: Smart Add Photo Attachment](003-smart-add-photo-attachment.md) - Photo attachment logic
