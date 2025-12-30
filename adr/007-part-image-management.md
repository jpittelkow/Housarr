# ADR 007: Part Image Management

## Status

Accepted

## Date

2024-12-30

## Context

Parts in Housarr support images through the polymorphic files relationship (`fileable_type: 'part'`), but there was no UI to:

1. Upload images for parts
2. View part images in the parts list
3. Manage part images when creating/editing parts

Users needed visual identification of parts, especially when managing multiple similar parts (e.g., different filter sizes).

## Decision

### 1. Part Image Upload in Modal

Enhanced the Part create/edit modal to include image upload:
- Expanded modal to `lg` size with 3-column grid layout
- Left column: Image upload area
- Right columns: Part details form
- For new parts: Shows placeholder with "Save part first to add image"
- For existing parts: Full ImageUpload component with upload capability

### 2. Part List Thumbnails

Added thumbnail images to part list items:
- 40x40px rounded square thumbnail
- Shows `featured_image` if available
- Falls back to Package icon placeholder
- Applies to both Consumable and Replacement parts lists

### 3. Image Upload Configuration

Used existing ImageUpload component with specific settings:
- `multiple={false}` - Single image per part
- `showGallery={false}` - Hide gallery view (not needed for single image)
- `fileableType="part"` - Proper polymorphic association
- Auto-invalidates item queries on upload

## Implementation

### Part Modal Layout

```tsx
<Modal size="lg">
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {/* Part Image - 1 column */}
    <div className="md:col-span-1">
      {editingPart ? (
        <ImageUpload
          fileableType="part"
          fileableId={editingPart.id}
          featuredImage={editingPart.featured_image}
          existingImages={editingPart.images || []}
          invalidateQueries={[['items', id!]]}
          multiple={false}
          showGallery={false}
        />
      ) : (
        <div>Save part first to add image</div>
      )}
    </div>
    
    {/* Part Details - 2 columns */}
    <div className="md:col-span-2">
      {/* Form fields */}
    </div>
  </div>
</Modal>
```

### Part List Item with Thumbnail

```tsx
<li className="flex items-start gap-3">
  {/* Part Image Thumbnail */}
  <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden">
    {part.featured_image ? (
      <img src={part.featured_image.url} className="w-full h-full object-cover" />
    ) : (
      <Icon icon={Package} />
    )}
  </div>
  
  {/* Part Details */}
  <div className="flex-1">
    {/* ... */}
  </div>
</li>
```

## Consequences

### Positive

- **Visual Identification**: Users can quickly identify parts by image
- **Better Organization**: Easier to manage inventory with visual cues
- **Consistent UX**: Uses existing ImageUpload component
- **Non-blocking**: Image upload available after part creation

### Negative

- **Two-step Process**: Must save part before adding image
- **Modal Size Increase**: Larger modal may be harder to use on mobile
- **Storage Usage**: Images increase storage requirements

### Future Considerations

- Allow image upload during part creation (upload to temp storage, associate after save)
- Bulk image upload for multiple parts
- Image search/AI to auto-suggest part images

## Related Decisions

- [002-part-image-search-strategy.md](002-part-image-search-strategy.md) - AI-powered part image search for Smart Fill
