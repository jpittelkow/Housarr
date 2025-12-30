# ADR 009: ZIP Backup with Files

## Status
Accepted

## Date
2024-12-30

## Context
The original backup/export functionality only exported JSON data containing database records. While this preserved item metadata, categories, locations, vendors, reminders, todos, and file references, it did **not** include the actual file content (images, documents, manuals, etc.).

Users needed a complete backup solution that would allow them to fully restore their household data, including all uploaded files, to the same or a different Housarr instance.

## Decision
We enhanced the backup system to export a **ZIP file** containing:
1. **`manifest.json`** - The complete JSON data (version 2.0 format) with all database records
2. **`files/` directory** - All actual file content from storage, organized with indexed filenames

### Export Process
1. Build JSON manifest with all household data
2. Query all files for the household
3. For each file, read content from storage and add to ZIP
4. Include `backup_path` reference in file metadata for restoration
5. Return ZIP file as download

### Import Process
1. Accept both ZIP (v2.0) and JSON (v1.0 legacy) backup files
2. For ZIP files:
   - Extract and parse `manifest.json`
   - Delete existing data (with proper cascade order)
   - Recreate all records with ID mapping
   - Extract and restore file content to storage
   - Update file paths for new household context
3. For JSON files (backwards compatibility):
   - Process as before (data only, no files)
   - Display message indicating legacy format

### File Structure in ZIP
```
housarr-backup-YYYY-MM-DD-HHMMSS.zip
├── manifest.json
└── files/
    ├── 0_original-filename.jpg
    ├── 1_document.pdf
    └── ...
```

## Consequences

### Positive
- **Complete backups**: Users can fully restore their household including all uploaded files
- **Portability**: Backups can be moved between Housarr instances
- **Single file**: One ZIP file contains everything needed for restoration
- **Backwards compatible**: Legacy JSON backups still work (data only)

### Negative
- **Larger file sizes**: ZIP backups include all file content, significantly larger than JSON-only
- **Longer processing time**: Export/import takes more time due to file I/O
- **Storage disk access**: Requires read/write access to storage disks during backup/restore

### Technical Notes
- Uses PHP's `ZipArchive` class for ZIP operations
- Files are stored with indexed prefixes to avoid naming conflicts
- Backup timeout extended to 5 minutes in frontend for large households
- Rate limiting removed from backup routes to allow large file transfers
- File ID mappings are maintained during import for proper relationship restoration

## Alternatives Considered
1. **Separate file export**: Export files and JSON separately - rejected for complexity
2. **Cloud backup service**: Use external backup service - rejected for simplicity and self-hosted nature
3. **Database dump**: Export raw database - rejected for portability concerns
