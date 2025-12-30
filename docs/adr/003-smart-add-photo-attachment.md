# ADR 003: Smart Add Photo Attachment Logic

## Status

Accepted

## Date

2024-12-30

## Context

Smart Add allows users to identify products in two ways:
1. **Photo Search**: Upload an image of the product
2. **Text Search**: Enter make/model or product description

When creating an item from search results, we needed to decide how to handle the item's primary photo.

### Scenarios

| Search Type | Result Has Image URL | Expected Behavior |
|-------------|---------------------|-------------------|
| Photo uploaded | N/A | Use uploaded photo |
| Text search | Yes | Download and use product image |
| Text search | No | No photo attached |

## Decision

We implemented **context-aware photo attachment** based on how the search was initiated.

### State Tracking

```typescript
// Track whether search was initiated with a photo
const [wasPhotoSearch, setWasPhotoSearch] = useState(false)

// Track selected result's product image URL
const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null)
```

### Photo Selection Logic

```
┌────────────────────────────────────────────────────────────┐
│                  User Creates Item                          │
└────────────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │  Was photo search?  │
              └─────────────────────┘
                    │         │
                   Yes        No
                    │         │
                    ▼         ▼
         ┌──────────────┐  ┌─────────────────────────┐
         │ Upload the   │  │ Does selected result    │
         │ user's photo │  │ have an image URL?      │
         └──────────────┘  └─────────────────────────┘
                                   │         │
                                  Yes        No
                                   │         │
                                   ▼         ▼
                          ┌──────────────┐  ┌────────────┐
                          │ Download and │  │ No photo   │
                          │ attach image │  │ attached   │
                          └──────────────┘  └────────────┘
```

### Implementation

```typescript
// On item creation success
if (wasPhotoSearch && uploadedImage) {
  // User uploaded a photo - use their photo
  await files.upload(uploadedImage, 'item', newItemId, true)
} else if (selectedImageUrl) {
  // Text search with product image - download it
  await files.uploadFromUrl(selectedImageUrl, 'item', newItemId, true)
}
```

### Backend Support

Added new endpoint for downloading images from URLs:

```
POST /api/files/from-url
{
  "url": "https://example.com/product.jpg",
  "fileable_type": "item",
  "fileable_id": 123,
  "is_featured": true
}
```

## Consequences

### Positive

- **User Intent Respected**: Photo searches use user's photo (they may have captured specific details)
- **Automatic Enrichment**: Text searches get product images when available
- **No Duplicate Photos**: Won't download product image if user already provided one
- **Featured Flag**: Downloaded images are marked as featured automatically

### Negative

- **External Image Dependency**: Downloaded URLs may become invalid over time
- **Storage Usage**: Downloading images increases storage requirements
- **Copyright Concerns**: Product images may have usage restrictions

### Edge Cases Handled

1. **Photo search but no photo selected**: Uses uploaded photo
2. **Text search with no results**: No photo attached
3. **Image download fails**: Item still created, just without photo
4. **User unchecks "Attach photo"**: Neither photo nor download occurs

## UI Indication

The checkbox label changes based on context:

| Context | Checkbox Label |
|---------|---------------|
| Photo search | "Attach uploaded photo" |
| Text search with image | "Attach product photo" |
| Text search without image | "Attach photo" (disabled) |

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration
- ADR 002: Part Image Search Strategy
