# ADR 006: Document Management Enhancements

## Status

Accepted

## Date

2024-12-30

## Context

The document management system in Housarr needed several improvements to enhance user experience:

1. **Display Names**: Files uploaded from URLs or with cryptic filenames (e.g., `1735543200_manual.pdf`) needed user-friendly display names
2. **Document Preview**: Users had to leave the app to view documents (opening in new tabs)
3. **Delete Confirmation**: Accidental deletions were too easy with single-click delete
4. **URL Downloads**: Users needed a way to attach documents from URLs without downloading locally first

## Decision

### 1. Display Name Field

Added an optional `display_name` field to the files table:
- Nullable string column that overrides the display of `original_name`
- Inline editing with pencil icon on hover
- Can be set during upload (from URL) or edited after upload
- Falls back to `original_name` when not set

### 2. Document Preview Modal

Implemented in-app document preview:
- Full-screen modal with embedded viewer
- PDFs displayed in iframe
- Images displayed with proper scaling
- Fallback message for unsupported types with "Open in new tab" link
- Footer with download and external link options

### 3. Delete Confirmation Dialog

Added confirmation modal before document deletion:
- Warning icon and message
- Shows document name being deleted
- Cancel and Delete buttons
- Loading state during deletion

### 4. URL Download Feature

Added "From URL" tab in document upload section:
- URL input field
- Optional display name field
- Download button with loading state
- Backend downloads file and attaches to item
- Supports images and PDFs up to 50MB

## Implementation

### Backend Changes

```php
// Migration
Schema::table('files', function (Blueprint $table) {
    $table->string('display_name')->nullable()->after('original_name');
});

// FileController - new update endpoint
public function update(Request $request, File $file): JsonResponse
{
    $validated = $request->validate([
        'display_name' => ['sometimes', 'nullable', 'string', 'max:255'],
    ]);
    $file->update($validated);
    return response()->json(['file' => new FileResource($file)]);
}
```

### Frontend Changes

```typescript
// FileRecord type
interface FileRecord {
  // ... existing fields
  display_name: string | null;
}

// files API
files.update: async (id: number, data: { display_name?: string | null })
files.uploadFromUrl: async (url, type, id, featured?, displayName?)
```

## Consequences

### Positive

- **Better UX**: Users can give meaningful names to documents
- **Faster Workflow**: Preview documents without leaving the app
- **Safer Deletions**: Confirmation prevents accidental data loss
- **Convenience**: Download documents directly from URLs

### Negative

- **Additional Database Column**: Minor storage overhead for display_name
- **Modal Complexity**: Preview modal adds UI complexity
- **External Dependencies**: URL downloads depend on external site availability

## Related Decisions

- [005-manual-download-fallback-strategy.md](005-manual-download-fallback-strategy.md) - Manual download uses similar URL fetching
