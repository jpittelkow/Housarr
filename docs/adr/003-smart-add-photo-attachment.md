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

## Update: Mobile Camera Capture (2024-12-31)

### Context

Users on mobile devices needed a more direct way to capture photos of products using their phone's camera, rather than first taking a photo and then selecting it from the gallery.

### Decision

Added native camera capture support using the HTML5 `capture` attribute on file inputs:

- **Smart Add Page**: Added a dedicated "Take Photo" button that opens the rear camera directly
- **ImageUpload Component**: Added camera button for all image upload areas
- **Avatar Upload**: Uses front camera (`capture="user"`) for selfies
- **Object Photos**: Uses rear camera (`capture="environment"`) for items/products

### Implementation

```html
<!-- Rear camera for object photos -->
<input type="file" accept="image/*" capture="environment" />

<!-- Front camera for selfies/avatars -->
<input type="file" accept="image/*" capture="user" />
```

Mobile detection determines when to show camera buttons:

```typescript
function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) 
    || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024)
}
```

### UX Flow

On mobile devices, users see two options:
1. **Gallery button** - Select existing photos from device
2. **Camera button** - Open camera to take new photo immediately

On desktop, only the standard file picker is shown.

## Related Decisions

- ADR 001: Multi-Agent AI Orchestration
- ADR 002: Part Image Search Strategy
- ADR 014: Smart Add Product Image Search

## Recent Enhancements (2024-12-31)

**Image Gallery Import**: Product images from search results are now automatically imported to the item's image gallery when creating an item, providing visual reference even if not set as featured.

**Try Again Button**: Users can now request new AI suggestions when none of the initial results match, with the AI receiving feedback that previous results were incorrect.