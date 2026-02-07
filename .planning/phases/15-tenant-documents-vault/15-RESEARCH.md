# Phase 15: Tenant Documents Vault - Research

**Researched:** 2026-02-07
**Domain:** Document management, multi-tenant file storage, NestJS file upload
**Confidence:** HIGH

## Summary

Phase 15 extends the existing document management infrastructure to support lease-related documents and a unified tenant document vault. The phase builds on proven patterns from Phase 4 (Application Documents) and Phase 10 (Tenant Payment Receipts), which have already established robust file upload, validation, storage, and signed URL patterns.

The frontend requires a unified view of ALL tenant documents across applications, leases, and personal uploads, categorized by type (contract-related, payment-related, inventory-related). The backend already has the infrastructure (Supabase Storage, magic number validation, signed URLs), so this phase primarily involves adding a new `LeaseDocument` model and endpoints that follow the existing `DocumentsService` pattern.

**Primary recommendation:** Reuse the existing `DocumentsService` pattern for `LeaseDocument` uploads. Create a tenant-aggregated endpoint (`GET /tenants/me/documents`) that queries across `ApplicationDocument`, `LeaseDocument`, and contract PDFs to provide a unified vault view.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/platform-express | Built-in | Multer integration for file uploads | Standard NestJS file upload solution, no additional installation needed |
| @types/multer | Latest | TypeScript definitions for Multer | Essential for type safety with file uploads |
| @supabase/supabase-js | Latest | Supabase Storage SDK | Already in use (Phase 4, 10), proven for private bucket signed URLs |
| file-type | Latest | Magic number validation | Already in use, ESM-compatible, validates actual file content not just extension |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | Latest | DTO validation | Required for validating enum types, file metadata |
| Prisma | 7.x | Database ORM | Model definition, cascade deletes, relations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Storage | AWS S3 + custom signed URL logic | More complex, requires additional credentials, current solution works |
| Magic number validation | Extension-based validation | Security risk - extensions can be spoofed, current approach is secure |
| Separate storage service | Reuse DocumentsService | More code duplication, harder maintenance |

**Installation:**
```bash
# No new packages needed - all dependencies already installed
npm install  # Verify @types/multer is present
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── documents/
│   ├── documents.service.ts       # Reusable for LeaseDocument uploads
│   ├── documents.controller.ts     # Existing ApplicationDocument endpoints
│   └── dto/                        # Shared DTOs (upload, signed URL)
├── leases/
│   ├── leases.module.ts
│   ├── lease-documents.service.ts  # New: lease document operations
│   └── lease-documents.controller.ts  # New: /leases/:id/documents endpoints
└── tenants/
    └── tenant-documents.controller.ts  # New: aggregated vault endpoint
```

### Pattern 1: Reusable Document Upload Service
**What:** Extract common upload logic into a base service that both ApplicationDocument and LeaseDocument can use.
**When to use:** When multiple document types share validation, storage, and signed URL patterns.
**Example:**
```typescript
// documents.service.ts (existing)
@Injectable()
export class DocumentsService {
  async upload(
    file: Express.Multer.File,
    bucketPath: string,
    maxSize: number = 10 * 1024 * 1024
  ): Promise<string> {
    // 1. Validate file size
    if (file.size > maxSize) throw new BadRequestException();

    // 2. Validate MIME type using magic numbers
    const detectedMime = await this.detectMimeType(file.buffer);
    if (!this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
      throw new BadRequestException();
    }

    // 3. Upload to Supabase Storage
    const storagePath = `${bucketPath}/${Date.now()}-${random()}.${ext}`;
    await this.supabase.storage.from('application-documents').upload(storagePath, file.buffer);

    return storagePath;
  }

  async getSignedUrl(storagePath: string): Promise<{ url: string; expiresAt: Date }> {
    const { data } = await this.supabase.storage
      .from('application-documents')
      .createSignedUrl(storagePath, 3600);
    return { url: data.signedUrl, expiresAt: new Date(Date.now() + 3600000) };
  }
}
```

### Pattern 2: Tenant-Aggregated Document Query
**What:** Single endpoint that queries multiple document sources and returns unified response.
**When to use:** When frontend needs a "vault" view across multiple contexts (applications, leases, contracts).
**Example:**
```typescript
// tenants/tenant-documents.controller.ts
@Get('tenants/me/documents')
async getAllDocuments(@CurrentUser() user: User) {
  const [appDocs, leaseDocs, contracts] = await Promise.all([
    this.prisma.applicationDocument.findMany({
      where: { application: { tenantId: user.id } },
      include: { application: { include: { property: true } } }
    }),
    this.prisma.leaseDocument.findMany({
      where: { lease: { tenantId: user.id } },
      include: { lease: { include: { property: true } } }
    }),
    this.prisma.contract.findMany({
      where: { tenantId: user.id, status: 'SIGNED' },
      include: { application: { include: { property: true } } }
    })
  ]);

  // Map to unified response format with category, property context
  return this.mapToVaultResponse(appDocs, leaseDocs, contracts);
}
```

### Pattern 3: Cascade Delete for Lease Documents
**What:** Use Prisma `onDelete: Cascade` to automatically clean up documents when lease is deleted.
**When to use:** For all dependent document models (ApplicationDocument, LeaseDocument, etc.).
**Example:**
```prisma
model LeaseDocument {
  id         String @id @default(cuid())
  leaseId    String
  lease      Lease  @relation(fields: [leaseId], references: [id], onDelete: Cascade)
}
```
**Source:** [Prisma Referential Actions Documentation](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions)

### Anti-Patterns to Avoid
- **Extension-based validation:** Always use magic numbers via `file-type` library. Extensions can be spoofed.
- **Public bucket for sensitive documents:** Contracts, receipts, and personal docs must use private bucket + signed URLs.
- **Separate storage per document type:** Reuse `application-documents` bucket with subfolder organization (e.g., `receipts/`, `lease-documents/`).
- **Hand-rolling signed URL logic:** Supabase Storage handles expiry, caching, and security - don't reimplement.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File type detection | Parse file extensions or headers manually | `file-type` library with magic numbers | Handles 100+ file formats, validates actual content not just extension, prevents spoofing |
| Signed URL generation | Custom JWT + storage URL construction | Supabase Storage `createSignedUrl()` | Handles expiry, query params, caching headers - complex to get right |
| File upload validation | Custom stream parsing, size checking | Multer + class-validator decorators | Battle-tested, handles multipart/form-data, memory/disk storage, size limits |
| Document categorization | Tag-based system with search | Enum-based categories + database queries | Type-safe, performant, query-optimized with indexes |

**Key insight:** File upload and cloud storage are deceptively complex. Edge cases include: partial uploads, multipart boundaries, MIME type spoofing, signed URL expiry races, concurrent upload conflicts, and storage bucket permission errors. Existing libraries handle these cases; custom implementations rarely do.

## Common Pitfalls

### Pitfall 1: Missing Cascade Deletes
**What goes wrong:** Documents remain in database after lease deletion, causing orphaned records and broken signed URLs.
**Why it happens:** Default Prisma behavior is `Restrict` (prevent delete if dependents exist).
**How to avoid:** Explicitly add `onDelete: Cascade` to all document relation fields.
**Warning signs:** ForeignKey violation errors when deleting leases, growing count of orphaned documents.

### Pitfall 2: Exposing Storage Paths Directly
**What goes wrong:** Frontend receives storage path (`lease-documents/123/file.pdf`) but has no way to access it without service key.
**Why it happens:** Forgetting that private buckets require signed URLs for every access.
**How to avoid:** Always return signed URLs to frontend, never raw storage paths. Create dedicated endpoints for URL generation.
**Warning signs:** 403 Forbidden errors in frontend when trying to access document URLs.

### Pitfall 3: Not Validating Uploader Permissions
**What goes wrong:** Tenant uploads documents to another tenant's lease, or landlord uploads as tenant.
**Why it happens:** Trusting path parameters without checking ownership or role.
**How to avoid:** Always validate lease ownership (`lease.tenantId === user.id` OR `lease.landlordId === user.id`) before allowing upload.
**Warning signs:** Security audit findings, users seeing documents from other users' leases.

### Pitfall 4: Synchronous Document Queries in Aggregated Endpoint
**What goes wrong:** Fetching ApplicationDocument, LeaseDocument, and Contract sequentially takes 300-900ms instead of 100ms.
**Why it happens:** Using `await` in series instead of `Promise.all()` in parallel.
**How to avoid:** Use `Promise.all([query1, query2, query3])` for independent queries.
**Warning signs:** Slow API response times (>500ms), increased P99 latency.

### Pitfall 5: Missing File Cleanup on Upload Failure
**What goes wrong:** File uploaded to Supabase Storage, but database record creation fails. Orphaned file sits in storage.
**Why it happens:** Not wrapping upload + DB insert in proper error handling or transaction.
**How to avoid:** If DB insert fails, catch error and delete uploaded file from storage before re-throwing.
**Warning signs:** Growing storage costs, files in bucket that don't match database records.

## Code Examples

Verified patterns from existing codebase:

### Magic Number Validation (from documents.service.ts)
```typescript
// Source: /mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/src/documents/documents.service.ts
private async detectMimeType(buffer: Buffer): Promise<string | undefined> {
  const { fileTypeFromBuffer } = await import('file-type');
  const result = await fileTypeFromBuffer(buffer);
  return result?.mime;
}

// Usage in upload method
const detectedMime = await this.detectMimeType(file.buffer);
if (!detectedMime || !this.ALLOWED_MIME_TYPES.includes(detectedMime)) {
  throw new BadRequestException(
    `Invalid file type. Allowed: PDF, JPEG, PNG, WebP. Detected: ${detectedMime ?? 'unknown'}`,
  );
}
```

### Signed URL Generation (from documents.service.ts)
```typescript
// Source: /mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/src/documents/documents.service.ts
async getSignedUrl(
  applicationId: string,
  documentId: string,
  userId: string,
): Promise<{ url: string; expiresAt: Date }> {
  // 1. Validate access permissions (tenant or landlord)
  const application = await this.prisma.application.findUnique({
    where: { id: applicationId },
    include: { property: { select: { landlordId: true } } },
  });

  const isOwner = application.tenantId === userId;
  const isLandlord = application.property.landlordId === userId;
  if (!isOwner && !isLandlord) {
    throw new ForbiddenException('You do not have access to this document');
  }

  // 2. Get document and generate signed URL
  const document = await this.prisma.applicationDocument.findUnique({
    where: { id: documentId },
  });

  const { data, error } = await this.supabase.storage
    .from(this.BUCKET_NAME)
    .createSignedUrl(document.storagePath, this.URL_EXPIRY_SECONDS);

  if (error || !data) {
    throw new BadRequestException(`Failed to generate document URL: ${error?.message}`);
  }

  const expiresAt = new Date(Date.now() + this.URL_EXPIRY_SECONDS * 1000);
  return { url: data.signedUrl, expiresAt };
}
```

### Storage Path Organization (from receipt-storage.service.ts)
```typescript
// Source: /mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/src/tenant-payments/receipt-storage/receipt-storage.service.ts
// Organized storage: receipts/{leaseId}/{requestId}-{timestamp}.{ext}
const ext = this.getExtensionFromMime(detectedMime);
const timestamp = Date.now();
const storagePath = `${this.RECEIPT_FOLDER}/${leaseId}/${requestId}-${timestamp}.${ext}`;

await this.supabase.storage
  .from(this.BUCKET_NAME)
  .upload(storagePath, file.buffer, {
    contentType: detectedMime,
    upsert: false,
  });
```

### Parallel Aggregated Queries
```typescript
// Pattern for tenant document vault (to be implemented)
const [appDocs, leaseDocs, contracts] = await Promise.all([
  this.prisma.applicationDocument.findMany({
    where: { application: { tenantId: user.id } },
    include: { application: { select: { id: true, property: { select: { title: true } } } } },
    orderBy: { createdAt: 'desc' },
  }),
  this.prisma.leaseDocument.findMany({
    where: { lease: { tenantId: user.id } },
    include: { lease: { select: { id: true, propertyAddress: true } } },
    orderBy: { createdAt: 'desc' },
  }),
  this.prisma.contract.findMany({
    where: { tenantId: user.id, status: { in: ['SIGNED', 'ACTIVE'] } },
    select: {
      id: true,
      contractPdfPath: true,
      createdAt: true,
      application: { select: { property: { select: { title: true } } } }
    },
    orderBy: { createdAt: 'desc' },
  }),
]);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Extension-based file type validation | Magic number validation with `file-type` library | Phase 4 (2026-01-29) | Security: prevents MIME type spoofing attacks |
| Public bucket for all files | Private bucket + signed URLs per document | Phase 4 (2026-01-29) | Privacy: documents only accessible to authorized users |
| Separate storage service per document type | Unified DocumentsService with subfolder organization | Phase 10 (2026-02-02) | Maintainability: single pattern, less code duplication |
| Service key in frontend | Server-side signed URL generation | Phase 4 (2026-01-29) | Security: service key never exposed to client |

**Deprecated/outdated:**
- **Multer disk storage:** Memory storage (`FileInterceptor()`) is now preferred for cloud upload workflows - no temp file cleanup needed
- **Direct Supabase Storage access from frontend:** Private buckets require service key - always proxy through backend endpoints

## Frontend Requirements

Based on `/mnt/c/Users/victo/OneDrive/Escritorio/Leasify/front/src/app/inquilino/documentos/page.tsx`:

### Document Categories
Frontend expects documents categorized as:
- `contract`: Signed contracts, addendums (status: `signed`, `pending`)
- `receipt`: Payment receipts (status: `available`)
- `inventory`: Delivery/return inventory, photos (status: `signed`)

### Document Fields Required by Frontend
```typescript
{
  id: string;
  name: string;              // Display name
  type: 'contract' | 'receipt' | 'inventory';
  property: string;          // Property name/address for context
  date: string;              // ISO date string
  size: string;              // Human-readable size (e.g., "2.4 MB")
  status: 'signed' | 'pending' | 'available';
  previewUrl: string;        // Signed URL for document access
}
```

### Expected Endpoints
```
GET    /tenants/me/documents               // All tenant documents (aggregated)
POST   /leases/:leaseId/documents          // Upload lease document
GET    /leases/:leaseId/documents          // List lease documents
GET    /leases/:leaseId/documents/:id/url  // Get signed URL
DELETE /leases/:leaseId/documents/:id      // Delete document
```

### Stats Aggregation
Frontend displays counts:
- Total documents across all sources
- Signed documents (contracts, inventories with signatures)
- Pending documents (awaiting signature)
- Available documents (receipts, other downloads)

## Open Questions

1. **Contract PDF storage path tracking**
   - What we know: Contracts have `contractPdfPath` field, stored in `contracts` bucket
   - What's unclear: Should contract PDFs be included in LeaseDocument table or queried separately?
   - Recommendation: Query separately via Contract model, don't duplicate in LeaseDocument table. Contracts are immutable legal records with different lifecycle.

2. **Document deletion permissions**
   - What we know: ApplicationDocument can only be deleted in DRAFT status
   - What's unclear: Can tenants delete LeaseDocuments? Can landlords delete tenant-uploaded lease docs?
   - Recommendation: Only uploader can delete within 24 hours of upload. After 24h, documents become part of lease record (immutable for audit trail).

3. **Storage quota enforcement**
   - What we know: No storage limits currently enforced
   - What's unclear: Should FREE tier have document storage limits? How to track per-user storage?
   - Recommendation: Defer to Phase 12 subscription enforcement patterns. Track via `SUM(fileSize) WHERE uploadedBy = userId`.

4. **Receipt vs LeaseDocument distinction**
   - What we know: Payment receipts already handled by `TenantPaymentRequest.receiptPath`
   - What's unclear: Should receipts be migrated to LeaseDocument table?
   - Recommendation: Keep receipts in TenantPaymentRequest (1:1 relation with payment). LeaseDocument is for general lease docs (inventory, addendums, photos).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `/mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/src/documents/documents.service.ts` - Proven upload, validation, signed URL patterns
- Existing codebase: `/mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/src/tenant-payments/receipt-storage/receipt-storage.service.ts` - Storage path organization, subfolder pattern
- Existing codebase: `/mnt/c/Users/victo/OneDrive/Escritorio/Leasify/back/prisma/schema.prisma` - Cascade delete patterns, relations
- Frontend requirements: `/mnt/c/Users/victo/OneDrive/Escritorio/Leasify/front/src/app/inquilino/documentos/page.tsx` - Expected data structure, categories, endpoints
- [Prisma Referential Actions](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/referential-actions) - Cascade delete documentation

### Secondary (MEDIUM confidence)
- [NestJS File Upload with Multer](https://dev.to/devvspaces/mastering-file-upload-and-validation-in-nestjs-with-multer-cm5) - File upload best practices, validation patterns
- [Supabase Storage Fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals) - Private bucket configuration, signed URLs
- [REST API Document Management Best Practices](https://treblle.com/blog/api-governance-best-practices) - API governance, endpoint structure

### Tertiary (LOW confidence)
- [Multi-Tenant Database Architecture Patterns](https://www.bytebase.com/multi-tenant-database-architecture-patterns-explained/) - Tenant isolation strategies (not directly applicable - we use row-level tenant_id filtering, not schema-per-tenant)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, proven in production
- Architecture: HIGH - Patterns established in Phases 4 and 10, well-documented
- Pitfalls: HIGH - Learned from existing implementations, verified in codebase

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (30 days - stable domain, mature libraries)

## Key Findings

1. **Reuse existing infrastructure:** DocumentsService patterns (magic number validation, signed URLs, Supabase Storage) are production-ready and should be extended, not replaced.

2. **Aggregated endpoint is critical:** Frontend expects a single `/tenants/me/documents` endpoint that combines ApplicationDocument, LeaseDocument, and Contract PDFs into a unified vault view.

3. **Cascade deletes are essential:** LeaseDocument must use `onDelete: Cascade` to automatically clean up when lease is deleted, following ApplicationDocument pattern.

4. **Storage organization pattern established:** Use `application-documents` bucket with subfolders (e.g., `lease-documents/{leaseId}/...`) to organize by context while reusing infrastructure.

5. **Frontend categorization is simple:** Three categories (contract, receipt, inventory) with three statuses (signed, pending, available) - straightforward enum mapping.
