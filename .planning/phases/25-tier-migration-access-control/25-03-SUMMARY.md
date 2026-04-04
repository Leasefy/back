---
phase: 25-tier-migration-access-control
plan: 03
subsystem: api
tags: [scoring, access-control, accs, tenant, landlord, nestjs, prisma]

# Dependency graph
requires:
  - phase: 25-01
    provides: STARTER/PRO/FLEX enum + seed, tier foundation
provides:
  - Tenant-only access control on GET /scoring/:applicationId
  - Tenant-only access control on GET /scoring/:applicationId/explanation
  - Landlords blocked with 403 + message directing to evaluation endpoint
  - Unit tests for ACCS-01/ACCS-02 access control behavior
affects:
  - phase-27-unified-evaluation-endpoint
  - any consumer of scoring controller endpoints

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ACCS-01 pattern: tenantId ownership check replaces combined tenant+landlord check on scoring endpoints"
    - "403 messages in Spanish directing landlords to alternative endpoint (evaluation)"

key-files:
  created:
    - src/scoring/scoring.controller.spec.ts
  modified:
    - src/scoring/scoring.controller.ts

key-decisions:
  - "ACCS-01/ACCS-02: Landlords no longer access scoring directly; they will use the unified evaluation endpoint (Phase 27)"
  - "PRO o BUSINESS renamed to PRO o FLEX in explanation 403 error message, matching new tier names"
  - "Removed property include from findUnique queries — landlordId no longer needed for permission check"

patterns-established:
  - "Tenant-only scoring: application.tenantId !== user.id throws 403 with evaluacion reference"
  - "Error messages in Spanish for end-user-facing 403s in scoring flow"

# Metrics
duration: 15min
completed: 2026-04-03
---

# Phase 25 Plan 03: Scoring Access Control Summary

**Scoring endpoints restricted to tenant-only via ACCS-01: landlords receive 403 directing them to the evaluation endpoint, with 6 unit tests covering allow and deny scenarios**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-03T00:00:00Z
- **Completed:** 2026-04-03T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1 modified, 1 created

## Accomplishments

- Both `getScore()` and `getExplanation()` now enforce `application.tenantId === user.id`
- Landlords and inmobiliarias receive a 403 with a clear Spanish message directing them to the evaluation endpoint
- "PRO o BUSINESS" updated to "PRO o FLEX" in the explanation plan-upgrade error
- 6 passing unit tests validate tenant allow, landlord deny, unrelated user deny, and 404 cases

## Task Commits

1. **Task 1: Restrict getScore() and getExplanation() to tenant-only** - `7ee21b6` (feat)
2. **Task 2: Add integration tests for scoring access control** - `e4ff3dc` (test)

## Files Created/Modified

- `src/scoring/scoring.controller.ts` — Removed `isLandlord` checks, replaced with `application.tenantId !== user.id` in both endpoints; updated Swagger docs; updated error copy
- `src/scoring/scoring.controller.spec.ts` — 6 unit tests using jest.spyOn on PrismaService covering all access scenarios

## Decisions Made

- Landlords are fully blocked from direct scoring endpoints. Phase 27 (unified evaluation endpoint) will give them access via the orchestration layer.
- Removed the `include: { property: { select: { landlordId: true } } }` from both `findUnique` queries since landlordId is no longer needed.
- Error messages kept in Spanish ("Solo el inquilino dueno...", "acceden al scoring a traves de la evaluacion") for consistency with the rest of the scoring flow.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 25 (Tier Migration & Access Control) is now complete: 25-01 (enum rename), 25-02 (source cleanup), 25-03 (scoring access control) all done.
- Phase 27 (Unified Evaluation Endpoint) can now proceed knowing scoring is tenant-only at the HTTP layer.
- No blockers.

---
*Phase: 25-tier-migration-access-control*
*Completed: 2026-04-03*
