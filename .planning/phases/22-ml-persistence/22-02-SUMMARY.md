---
phase: 22-ml-persistence
plan: 02
subsystem: api, database
tags: [ml, cron, nestjs, prisma, csv-export, event-listeners, prediction-tracking]

# Dependency graph
requires:
  - phase: 22-ml-persistence/01
    provides: PredictionLog, ApplicationFeatureSnapshot models and MlPersistenceService
  - phase: 07-contracts
    provides: ContractActivatedEvent and contract.activated events
  - phase: 04-applications-documents
    provides: application.statusChanged events
  - phase: 08-leases-payments
    provides: Lease model with payments and contract relation
provides:
  - Automated outcome tracking via event listeners (REJECTED, WITHDRAWN, APPROVED_PENDING)
  - Daily cron job updating prediction outcomes from lease payment data
  - ADMIN-only training data export in CSV/JSON format
  - ML data statistics endpoint (outcome breakdown, version breakdown)
  - APPROVED_PENDING -> APPROVED_PAID_ON_TIME | APPROVED_LATE_PAYMENTS | APPROVED_DEFAULTED lifecycle
affects: [ml-retraining, scoring-model-evaluation, admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns: [dedicated-event-listeners, daily-cron-scheduler, raw-sql-export, point-in-time-query]

key-files:
  created:
    - src/ml-persistence/listeners/application-outcome.listener.ts
    - src/ml-persistence/listeners/contract-outcome.listener.ts
    - src/ml-persistence/scheduled/outcome-tracker.scheduler.ts
    - src/ml-persistence/export/ml-export.service.ts
    - src/ml-persistence/export/ml-export.controller.ts
    - src/ml-persistence/dto/export-query.dto.ts
    - supabase/migrations/00008_ml_persistence_v2.sql
  modified:
    - src/ml-persistence/dto/prediction-outcome.enum.ts
    - src/ml-persistence/ml-persistence.service.ts
    - src/ml-persistence/ml-persistence.module.ts
    - src/ml-persistence/dto/index.ts
    - prisma/schema.prisma

key-decisions:
  - "Added APPROVED_* granular outcomes (PENDING, PAID_ON_TIME, LATE_PAYMENTS, DEFAULTED) while keeping legacy LEASE_SUCCESSFUL/LEASE_PROBLEMATIC for backward compat"
  - "Dedicated ML listeners in MlPersistenceModule instead of modifying existing NotificationsModule/LeasesModule listeners"
  - "ContractOutcomeListener resolves applicationId from Contract table since ContractActivatedEvent does not carry it"
  - "5-day grace period for late payment classification matching Phase 9 convention"
  - "Raw SQL for export query to ensure point-in-time correctness (joins snapshots, not mutable applications)"

patterns-established:
  - "Dedicated event listeners: separate ML tracking listeners from business logic listeners, both listening to same events"
  - "Point-in-time export: join immutable snapshot tables for ML training data, never reference mutable application state"
  - "Outcome lifecycle: PENDING -> terminal (REJECTED/WITHDRAWN) or APPROVED_PENDING -> final (PAID_ON_TIME/LATE_PAYMENTS/DEFAULTED)"

# Metrics
duration: 11min
completed: 2026-02-16
---

# Phase 22 Plan 02: Outcome Tracking & Export Summary

**Event-driven outcome tracking with daily cron scheduler and ADMIN-only CSV/JSON training data export for ML model retraining**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-16T00:38:38Z
- **Completed:** 2026-02-16T00:49:56Z
- **Tasks:** 2 (plus pre-task schema/service updates)
- **Files modified:** 12

## Accomplishments
- Application REJECTED/WITHDRAWN outcomes tracked automatically via ApplicationOutcomeListener
- Contract activation links leases to predictions (APPROVED_PENDING) via ContractOutcomeListener
- Daily cron job evaluates lease payment history and upgrades outcomes to final categories
- ADMIN-only export endpoint serves point-in-time correct training data as CSV or JSON
- All ML tracking is non-blocking (try/catch wrapped) -- never affects business flows

## Task Commits

Each task was committed atomically:

1. **Pre-task: Schema + enum + service updates** - `2b18565` (chore)
2. **Task 1: Outcome tracking listeners & scheduler** - `c543dae` (feat)
3. **Task 2: Training data export endpoint** - `fedeb26` (feat)

## Files Created/Modified
- `src/ml-persistence/listeners/application-outcome.listener.ts` - Listens to application.statusChanged, records REJECTED/WITHDRAWN
- `src/ml-persistence/listeners/contract-outcome.listener.ts` - Listens to contract.activated, records APPROVED_PENDING + links leaseId
- `src/ml-persistence/scheduled/outcome-tracker.scheduler.ts` - Daily cron evaluating lease payment performance
- `src/ml-persistence/export/ml-export.service.ts` - Point-in-time correct training data queries + CSV formatting
- `src/ml-persistence/export/ml-export.controller.ts` - GET /ml/export and GET /ml/stats (ADMIN-only)
- `src/ml-persistence/dto/export-query.dto.ts` - Query params: algorithmVersion, minMonthsTracked, format, completedOnly
- `src/ml-persistence/dto/prediction-outcome.enum.ts` - Added APPROVED_PENDING, APPROVED_PAID_ON_TIME, APPROVED_LATE_PAYMENTS, APPROVED_DEFAULTED
- `src/ml-persistence/ml-persistence.service.ts` - Widened recordOutcome(), updated recordLeaseOutcome() with full params
- `src/ml-persistence/ml-persistence.module.ts` - Registered listeners, scheduler, export service/controller
- `prisma/schema.prisma` - Added leaseId, monthsTracked, latePaymentCount, defaulted to PredictionLog; propertyRent to ApplicationFeatureSnapshot
- `supabase/migrations/00008_ml_persistence_v2.sql` - Schema migration for new fields

## Decisions Made
- Added APPROVED_* granular outcome values to PredictionOutcome enum while keeping LEASE_SUCCESSFUL/LEASE_PROBLEMATIC for backward compatibility
- Used dedicated ML event listeners instead of modifying existing notification/lease listeners to avoid cross-module coupling
- ContractOutcomeListener resolves applicationId via Contract table query (event doesn't carry it)
- Used raw SQL for export query to ensure point-in-time correctness across three tables
- Exported ExportStats interface to satisfy TypeScript declaration emit requirements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Exported ExportStats interface for TypeScript declaration compatibility**
- **Found during:** Task 2 (Export controller)
- **Issue:** TypeScript error TS4053 -- controller public method return type used private interface from service
- **Fix:** Changed `interface ExportStats` to `export interface ExportStats` in ml-export.service.ts
- **Files modified:** src/ml-persistence/export/ml-export.service.ts
- **Verification:** `npx tsc --noEmit` compiles cleanly
- **Committed in:** fedeb26 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript visibility fix, no scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 22 ML Persistence is fully complete (both plans executed)
- Prediction-vs-actual feedback loop is closed
- Training data is exportable for external ML model training
- All 4 ROADMAP success criteria satisfied:
  1. Features persisted with application (ApplicationFeatureSnapshot)
  2. Outcomes trackable (PredictionLog with evolving actualOutcome)
  3. Predictions vs actuals logged (predictedScore + predictedLevel vs actualOutcome)
  4. Data exportable (GET /ml/export in CSV/JSON)

## Self-Check: PASSED

All 7 created files verified present. All 3 commits (2b18565, c543dae, fedeb26) verified in git log.

---
*Phase: 22-ml-persistence*
*Completed: 2026-02-16*
