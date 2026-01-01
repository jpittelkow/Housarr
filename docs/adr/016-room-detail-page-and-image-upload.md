# ADR 016: Room Detail Page and Image Upload Improvements

## Status

Accepted

## Date

2025-01-01

## Context

The Rooms feature had several limitations:

1. **No Detail Page**: Rooms (Locations) only had a listing page with no way to view detailed information about a specific room, its photos, paint colors, or associated items.

2. **Image Upload Issues**: The image upload functionality was failing with a 422 error due to:
   - PHP's default `upload_max_filesize` of 2MB in the development Docker container
   - Axios FormData handling issues with Content-Type headers

3. **Paint Color Management**: Paint colors could be added but lacked:
   - A reusable form component
   - Real-time color picker with hex/RGB synchronization
   - CMYK color space support (important for paint matching)

4. **Dashboard Integration**: The dashboard didn't show rooms, making it harder to navigate to them.

## Decision

We implemented the following improvements:

### 1. Room Detail Page (`RoomDetailPage.tsx`)

Created a comprehensive detail page for rooms accessible at `/rooms/:id` that includes:

- **Header Section**: Room name with edit/delete buttons
- **Photos Section**: Image gallery with upload capability, featuring the existing `ImageUpload` component
- **Paint Colors Section**: Display and management of paint colors with:
  - Color swatches showing hex/RGB values
  - Edit and delete functionality
  - AI-powered wall color analysis integration
- **Items Section**: List of items in the room with:
  - Toggle between card and list views
  - Click-through navigation to item details
  - Item count display

### 2. PHP Upload Configuration

Updated `docker/dev/Dockerfile` to configure PHP for larger file uploads:

```dockerfile
RUN echo "upload_max_filesize = 100M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 100M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 300" >> /usr/local/etc/php/conf.d/uploads.ini
```

### 3. Reusable Paint Color Form (`PaintColorForm.tsx`)

Created a reusable component that encapsulates:
- Form state management
- All paint color fields (brand, name, hex, RGB, CMYK, URLs)
- Integration with `ColorPicker` component
- Consistent UI across RoomsPage and RoomDetailPage

### 4. Color Picker Component (`ColorPicker.tsx`)

New UI component providing:
- Native HTML color picker input
- Hex code input with validation
- RGB inputs (R, G, B) with 0-255 range
- CMYK inputs (C, M, Y, K) with 0-100% range
- Real-time bidirectional synchronization between all color formats

### 5. CMYK Support

Extended paint color functionality with CMYK values:
- **Database**: Added migration for `cmyk_c`, `cmyk_m`, `cmyk_y`, `cmyk_k` columns
- **Backend**: Updated `PaintColor` model and `PaintColorController` validation
- **Frontend**: Updated TypeScript types and form handling

### 6. Backend API Enhancements

- **LocationController**: Eager load `images` relationship in `index()` for room cards
- **ItemController**: Added `location_id` filter parameter for listing items by room
- **FileController**: Added comprehensive debug logging for upload troubleshooting

### 7. Dashboard Integration

Added Rooms section to DashboardPage showing:
- Room list with featured images
- Item counts
- Quick navigation to room details

## Consequences

### Positive

- Complete room management workflow (list → detail → edit)
- Professional paint color management with industry-standard CMYK support
- Reusable components reduce code duplication
- Better debugging capability for file uploads
- Development environment supports large file uploads (up to 100MB)
- Dashboard provides quick access to all major features

### Negative

- Docker container rebuild required for PHP configuration changes
- Additional database migration for CMYK columns
- Slightly larger bundle size with new components

## Related Decisions

- [ADR-004: Development Guidelines for Core Functionality](004-development-guidelines-core-functionality.md) - Follows established patterns
- [ADR-006: Document Management Enhancements](006-document-management-enhancements.md) - File upload patterns
- [ADR-012: Docker Self-Hosted Deployment Strategy](012-docker-self-hosted-deployment.md) - Docker configuration
