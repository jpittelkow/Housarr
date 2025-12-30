# ADR 002: Part Image Search Strategy

## Status

Accepted

## Date

2024-12-30

## Context

When suggesting replacement and consumable parts for items, we wanted to display product images alongside each part to improve the user experience. Users can more easily identify parts when they see what they look like.

### Options Considered

1. **AI-Generated Image URLs**: Ask the AI to provide image URLs in its response
2. **Web Scraping**: Scrape retailer sites (Amazon, Home Depot) for product images
3. **Image Search APIs**: Use Google Custom Search or Bing Image Search APIs
4. **Lazy Loading with Separate Endpoint**: Search for images on-demand after parts are returned

## Decision

We implemented **Option 4: Lazy Loading with Separate Endpoint** combined with a simplified web scraping approach.

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                 Parts Suggestion Flow                       │
└────────────────────────────────────────────────────────────┘

1. User clicks "Find Parts"
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  POST /items/{item}/suggest-parts                          │
│  Returns: parts array (without images)                     │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  Frontend renders parts with placeholder images            │
└────────────────────────────────────────────────────────────┘
         │
         ▼ (for each part, in background)
┌────────────────────────────────────────────────────────────┐
│  POST /items/{item}/search-part-image                      │
│  { search_term: "LG C4 OLED panel" }                      │
│  Returns: { image_url: "https://..." }                    │
└────────────────────────────────────────────────────────────┘
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  Frontend updates part card with loaded image              │
└────────────────────────────────────────────────────────────┘
```

### Image Search Implementation

The `ProductImageSearchService::searchForPartImage()` method:

1. Searches DuckDuckGo HTML for Amazon product URLs
2. Extracts ASIN (Amazon Standard Identification Number) from URLs
3. Constructs predictable Amazon image URL from ASIN

```php
// Example: ASIN B09XYZ123 -> image URL
"https://m.media-amazon.com/images/I/{$asin}._AC_SX300_.jpg"
```

### Fallback Strategy

- If no image found: Frontend displays initials placeholder (e.g., "HF" for HEPA Filter)
- If image fails to load: `onError` handler replaces with initials

## Consequences

### Positive

- **Fast Initial Response**: Parts appear immediately without waiting for images
- **Reusable Endpoint**: Same endpoint can be used for:
  - AI-suggested parts
  - Manual-parsed parts (from PDF manuals)
  - User-entered parts
- **Graceful Degradation**: Works without images if search fails
- **No API Keys Required**: DuckDuckGo search is free

### Negative

- **Unreliable Images**: Web scraping can fail or return irrelevant images
- **Amazon-Centric**: Currently only searches Amazon
- **Rate Limiting Risk**: Heavy usage could trigger DuckDuckGo blocks
- **Image Quality**: Amazon thumbnail URLs may not always work

### Future Improvements

- Add manufacturer website image search
- Implement caching for searched images
- Consider paid image search API for reliability
- Add image validation (check if URL returns valid image)

## Alternatives Rejected

### AI-Generated URLs (Option 1)
- **Rejected because**: AIs hallucinate URLs that don't exist

### Heavy Web Scraping (Option 2)
- **Rejected because**: Caused 504 timeouts, unreliable across different sites

### Paid Image APIs (Option 3)
- **Rejected because**: Adds cost and API key requirements for basic feature

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration
- ADR 003: Smart Add Photo Attachment Logic
