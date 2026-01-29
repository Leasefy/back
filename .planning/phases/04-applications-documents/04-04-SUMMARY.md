---
phase: 04-applications-documents
plan: 04
subsystem: documents
tags: [storage, supabase, file-validation, signed-urls, multipart]

dependency-graph:
  requires:
    - "04-01" # ApplicationDocument model
    - "04-03" # ApplicationEventService
  provides:
    - DocumentsService
    - DocumentsModule
    - Document upload with magic number validation
    - Signed URL generation
  affects:
    - "05-*" # Scoring may need document access
    - "06-*" # AI analysis will process documents

tech-stack:
  added:
    - "file-type@21.3.0" # Magic number MIME detection
  patterns:
    - Dynamic ESM import for file-type
    - Private Supabase bucket for sensitive documents
    - Signed URLs for secure document access

file-tracking:
  key-files:
    created:
      - src/documents/dto/upload-document.dto.ts
      - src/documents/dto/index.ts
      - src/documents/documents.service.ts
      - src/documents/documents.controller.ts
      - src/documents/documents.module.ts
    modified:
      - package.json
      - package-lock.json
      - src/app.module.ts

decisions:
  - id: magic-number-validation
    choice: "file-type library with dynamic import"
    why: "Validates actual file content, not extension. ESM-only requires dynamic import."
  - id: private-bucket
    choice: "Private 'application-documents' bucket"
    why: "Sensitive documents (cedula, payslips) require signed URL access, not public"
  - id: signed-url-expiry
    choice: "1 hour expiry"
    why: "Balance between security and usability for document viewing"
  - id: max-file-size
    choice: "10MB limit"
    why: "Sufficient for scanned documents and photos while preventing abuse"

metrics:
  duration: "~8 minutes"
  completed: "2026-01-29"
---

# Phase 04 Plan 04: Document Upload Summary

**One-liner:** Secure document upload with magic number validation to private Supabase bucket with signed URL access.

## What Was Built

### DocumentsService (263 lines)
- Upload with ownership and status validation
- Magic number MIME detection via file-type library
- File size validation (max 10MB)
- Allowed types: PDF, JPEG, PNG, WebP
- Private bucket storage with signed URL generation
- 1-hour URL expiry for security
- Event logging for audit trail

### DocumentsController (118 lines)
- POST /applications/:applicationId/documents - Upload document
- GET /applications/:applicationId/documents - List documents
- GET /applications/:applicationId/documents/:documentId/url - Get signed URL
- DELETE /applications/:applicationId/documents/:documentId - Delete document

### DTOs
- UploadDocumentDto - Document type enum for metadata
- DocumentResponseDto - Upload response shape
- SignedUrlResponseDto - Signed URL with expiry

## Key Implementation Details

### Magic Number Validation
```typescript
private async detectMimeType(buffer: Buffer): Promise<string | undefined> {
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime;
}
```
Dynamic import required because file-type v19+ is ESM-only.

### Access Control
- **Upload/Delete:** Only tenant owner of draft applications
- **Signed URLs:** Tenant owner OR property landlord (for review)

### Storage Path Convention
```
{applicationId}/{documentType}/{timestamp}-{random}.{ext}
```
Example: `abc123/ID_DOCUMENT/1706545200000-x7k9m.pdf`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Roles decorator usage**
- **Found during:** Task 3
- **Issue:** Plan used string literals `@Roles('TENANT', 'BOTH')` but decorator expects Role enum
- **Fix:** Changed to `@Roles(Role.TENANT, Role.BOTH)` matching existing patterns
- **Files modified:** src/documents/documents.controller.ts

## Verification Results

| Check | Result |
|-------|--------|
| file-type installed | v21.3.0 |
| TypeScript compiles | No errors |
| DocumentsService lines | 263 (min 100) |
| DocumentsController lines | 118 (min 40) |
| App starts | Success |
| Bucket name | 'application-documents' |
| fileTypeFromBuffer usage | Dynamic import |

## User Action Required

**Create private bucket 'application-documents' in Supabase:**
1. Go to Supabase Dashboard > Storage > New bucket
2. Create bucket named `application-documents`
3. Set Public = false (private bucket for sensitive documents)

## Next Phase Readiness

Phase 4 (Applications) is now complete:
- 04-01: Application data models
- 04-02: State machine and events
- 04-03: Application CRUD and wizard
- 04-04: Document upload (this plan)

Ready for Phase 5 (Scoring Engine) which will:
- Calculate risk scores from application data
- Reference documents for AI analysis in Phase 6

## Commits

| Commit | Description |
|--------|-------------|
| 8f56a16 | feat(04-04): install file-type and create documents DTOs |
| 84deb0a | feat(04-04): create DocumentsService with upload validation |
| 7cfdb5d | feat(04-04): create DocumentsController and DocumentsModule |
