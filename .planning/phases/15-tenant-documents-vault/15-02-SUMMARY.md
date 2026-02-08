---
phase: 15-tenant-documents-vault
plan: 02
subsystem: api-controllers, tenant-vault
tags: [rest-api, swagger, file-upload, aggregation, tenant-documents]

# Dependency graph
requires:
  - phase: 15-tenant-documents-vault
    plan: 01
    provides: LeaseDocumentsService for CRUD operations
  - phase: 04-applications-documents
    provides: ApplicationDocument model and DocumentsController pattern
  - phase: 08-leases-payments
    provides: Lease model and LeasesController pattern
  - phase: 07-contracts
    provides: Contract model with signed PDFs
provides:
  - LeaseDocumentsController with 4 REST endpoints
  - Tenant vault aggregated endpoint (GET /users/me/documents)
  - Unified document view across applications, leases, and contracts
  - Document categorization and status mapping
affects: [tenant-ui, landlord-ui]

# Tech tracking
tech-stack:
  added: []
  patterns: [aggregated-vault, cross-entity-queries, unified-document-view]

key-files:
  created:
    - src/leases/lease-documents.controller.ts
  modified:
    - src/leases/leases.module.ts
    - src/users/users.service.ts
    - src/users/users.controller.ts

key-decisions:
  - "LeaseDocumentsController has no @Roles decorators - service validates tenant/landlord access per lease"
  - "Document IDs use ParseUUIDPipe for leaseId but NOT for :id param (LeaseDocument uses cuid)"
  - "Tenant vault aggregates 3 sources in parallel for performance"
  - "No signed URLs in bulk vault response - frontend fetches URLs on demand via individual endpoints"
  - "Category mapping translates backend enum types to user-friendly Spanish categories"

patterns-established:
  - "Pattern 1: Controller delegates access control to service layer (no @Roles decorator)"
  - "Pattern 2: Aggregation via Promise.all for parallel queries across multiple models"
  - "Pattern 3: Unified response format with sourceType/sourceId for frontend routing"
  - "Pattern 4: Stats calculation from aggregated results (total, signed, pending, available)"

# Metrics
duration: 9min
completed: 2026-02-08
---

# Phase 15 Plan 02: Lease Documents Controller & Tenant Vault Summary

**REST endpoints for lease document CRUD and aggregated tenant vault combining all document sources**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-08T00:22:54Z
- **Completed:** 2026-02-08T00:32:15Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- LeaseDocumentsController with 4 endpoints: POST upload, GET list, GET signed URL, DELETE
- Multipart/form-data upload with file validation delegated to service
- GET /users/me/documents tenant vault endpoint aggregating 3 sources
- Parallel queries via Promise.all for ApplicationDocuments, LeaseDocuments, Contract PDFs
- Unified TenantVaultDocument interface with type/category/property/status mapping
- Document categorization: contracts, receipts, inventories with Spanish category names
- Stats calculation: total, signed, pending, available counts
- Controller registered in LeasesModule with proper exports

## Task Commits

Each task was committed atomically:

1. **Task 1: Create LeaseDocumentsController and register in module** - `f821fee` (feat)
   - Created LeaseDocumentsController with 4 endpoints
   - POST /leases/:leaseId/documents for upload (multipart/form-data)
   - GET /leases/:leaseId/documents for listing
   - GET /leases/:leaseId/documents/:id/url for signed URL generation
   - DELETE /leases/:leaseId/documents/:id for deletion (24h window enforced by service)
   - All endpoints delegate to LeaseDocumentsService
   - No @Roles decorators (service validates tenant/landlord access)
   - documentId param does NOT use ParseUUIDPipe (LeaseDocument uses cuid)
   - Registered LeaseDocumentsController and LeaseDocumentsService in LeasesModule
   - Complete Swagger documentation with ApiOperation, ApiResponse, ApiParam

2. **Task 2: Add tenant vault aggregated endpoint** - `3e771cc` (feat)
   - Added getTenantDocuments method to UsersService
   - Queries ApplicationDocuments, LeaseDocuments, Contract PDFs in parallel
   - Maps all sources to unified TenantVaultDocument interface
   - Category mapping: ID_DOCUMENT → Identificación, PAY_STUB → Comprobantes de Pago, etc.
   - Type mapping: CONTRACT_SIGNED/ADDENDUM → contract, PAYMENT_RECEIPT → receipt, others → inventory
   - Status mapping: CONTRACT_SIGNED → signed, others → available
   - Sorts all documents by date descending
   - Calculates stats: total, signed, pending, available counts
   - Added GET /users/me/documents endpoint to UsersController (TENANT role only)
   - Endpoint positioned before parameterized routes to avoid conflicts
   - No signed URLs generated in bulk (frontend fetches on demand)

## Files Created/Modified

**Created:**
- `src/leases/lease-documents.controller.ts` - REST controller with 4 endpoints

**Modified:**
- `src/leases/leases.module.ts` - Registered LeaseDocumentsController and LeaseDocumentsService
- `src/users/users.service.ts` - Added getTenantDocuments aggregation method with mapping helpers
- `src/users/users.controller.ts` - Added GET /users/me/documents endpoint

## Decisions Made

**1. No @Roles decorators on LeaseDocumentsController**
- **Rationale:** Both tenant and landlord can upload/view lease documents. Service validates access per lease.
- **Impact:** Simpler controller, more flexible access control logic in service layer.

**2. Document ID param does NOT use ParseUUIDPipe**
- **Rationale:** LeaseDocument uses cuid (not UUID). ApplicationDocument uses UUID. Mixed ID formats.
- **Impact:** String param for :id, service handles validation.

**3. Aggregation via Promise.all**
- **Rationale:** 3 independent queries can run in parallel for performance.
- **Impact:** Faster vault loading, reduced latency for tenants.

**4. No signed URLs in bulk response**
- **Rationale:** Generating signed URLs for all documents is expensive. Most users only view a few.
- **Impact:** Frontend fetches URLs on demand via /applications/:id/documents/:id/url, /leases/:id/documents/:id/url, /contracts/:id/pdf endpoints.

**5. Spanish category names in mapping**
- **Rationale:** User-facing categories should be in Spanish for Colombian users.
- **Impact:** Frontend can display categories directly without translation layer.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**1. TypeScript type mismatch between Prisma enum and TypeScript enum**
- **Issue:** Prisma's LeaseDocumentType enum treated as different type than src enum
- **Resolution:** Cast to LeaseDocumentType using `as LeaseDocumentType` in mapping functions
- **Impact:** No functional change, TypeScript compilation passes

**2. TenantVaultDocument interface visibility**
- **Issue:** TypeScript error about interface not being exported
- **Resolution:** Moved interface to module level and exported it
- **Impact:** Interface can be imported by other modules if needed

## User Setup Required

None - endpoints use existing services and database schema.

## Next Phase Readiness

**Ready for Phase 15 Plan 03 (if planned):**
- Lease document REST API complete and functional
- Tenant vault aggregation complete
- All endpoints have Swagger documentation
- Service layer handles access control

**No blockers or concerns.**

## Self-Check: PASSED

**Files verified:**
```bash
[ -f "src/leases/lease-documents.controller.ts" ] && echo "FOUND: src/leases/lease-documents.controller.ts" || echo "MISSING: src/leases/lease-documents.controller.ts"
[ -f "src/leases/leases.module.ts" ] && echo "FOUND: src/leases/leases.module.ts" || echo "MISSING: src/leases/leases.module.ts"
[ -f "src/users/users.service.ts" ] && echo "FOUND: src/users/users.service.ts" || echo "MISSING: src/users/users.service.ts"
[ -f "src/users/users.controller.ts" ] && echo "FOUND: src/users/users.controller.ts" || echo "MISSING: src/users/users.controller.ts"
```

**Commits verified:**
```bash
git log --oneline --all | grep -q "f821fee" && echo "FOUND: f821fee" || echo "MISSING: f821fee"
git log --oneline --all | grep -q "3e771cc" && echo "FOUND: 3e771cc" || echo "MISSING: 3e771cc"
```

---
*Phase: 15-tenant-documents-vault*
*Completed: 2026-02-08*
