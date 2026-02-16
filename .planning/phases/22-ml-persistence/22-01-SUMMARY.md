---
phase: 22-ml-persistence
plan: 01
subsystem: database, ml
tags: [prisma, postgresql, ml-persistence, feature-snapshots, prediction-logs]

# Dependency graph
requires:
  - phase: 21-explainability
    provides: Scoring processor with AI narrative generation
  - phase: 05-scoring-engine
    provides: Async scoring pipeline with feature extraction and model aggregation
provides:
  - Immutable feature snapshots stored at prediction time
  - Prediction logs tracking predicted scores vs actual outcomes
  - MlPersistenceService for snapshot and outcome recording
  - Database schema with ApplicationFeatureSnapshot and PredictionLog models
affects: [model-retraining, performance-tracking, audit]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Immutable feature snapshots decoupled from mutable Application data"
    - "Prediction logs with outcome tracking for model evaluation"
    - "ML persistence wrapped in try/catch to never block scoring"
    - "JSON storage for flexible feature vectors"

key-files:
  created:
    - src/ml-persistence/ml-persistence.service.ts
    - src/ml-persistence/ml-persistence.module.ts
    - src/ml-persistence/dto/prediction-outcome.enum.ts
    - supabase/migrations/00007_ml_persistence.sql
  modified:
    - prisma/schema.prisma
    - src/scoring/processors/scoring.processor.ts
    - src/scoring/scoring.module.ts
    - src/app.module.ts

key-decisions:
  - "PredictionOutcome as TypeScript enum (not Prisma enum) for flexibility"
  - "Features stored as JSONB for immutability and schema independence"
  - "Algorithm version hardcoded as '2.1' across snapshot, log, and score result"
  - "ML persistence runs synchronously in scoring job but wrapped in try/catch"
  - "Use updateMany for recordOutcome (no-op if no prediction log exists)"

patterns-established:
  - "Pattern: ML persistence never blocks core business logic (try/catch)"
  - "Pattern: Immutable snapshots preserve exact prediction-time state"
  - "Pattern: Idempotent upsert for prediction logs (re-scoring safe)"

# Metrics
duration: 7min
completed: 2026-02-16
---

# Phase 22 Plan 01: ML Persistence Summary

**Immutable feature snapshots and prediction logs stored at scoring time for model reproducibility and outcome tracking**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-16T00:24:56Z
- **Completed:** 2026-02-16T00:31:56Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- ApplicationFeatureSnapshot model stores immutable point-in-time features as JSONB
- PredictionLog model tracks predicted score/level with actual outcome field for later updates
- MlPersistenceService with 4 methods: createSnapshot, createPredictionLog, recordOutcome, recordLeaseOutcome
- ML persistence wired into ScoringProcessor step 6a (after score persist, before AI narrative)
- Migration 00007_ml_persistence.sql applied successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Database Models and MlPersistenceModule** - `d70d004` (feat)
   - Added ApplicationFeatureSnapshot and PredictionLog models to schema
   - Created PredictionOutcome TypeScript enum
   - Implemented MlPersistenceService with 4 methods
   - Created MlPersistenceModule
   - Registered in AppModule
   - Applied migration

2. **Task 2: Wire Feature Snapshot into Scoring Processor** - `13fbd59` (feat)
   - Imported MlPersistenceModule in ScoringModule
   - Injected MlPersistenceService in ScoringProcessor
   - Added step 6a: ML snapshot + prediction log creation
   - Wrapped in try/catch to never block scoring

## Files Created/Modified

**Created:**
- `src/ml-persistence/ml-persistence.service.ts` - Service with createSnapshot, createPredictionLog, recordOutcome, recordLeaseOutcome
- `src/ml-persistence/ml-persistence.module.ts` - Module registration
- `src/ml-persistence/dto/prediction-outcome.enum.ts` - TypeScript enum for outcomes
- `src/ml-persistence/dto/index.ts` - Barrel export
- `supabase/migrations/00007_ml_persistence.sql` - Database migration for new tables

**Modified:**
- `prisma/schema.prisma` - Added ApplicationFeatureSnapshot and PredictionLog models with relations
- `src/scoring/processors/scoring.processor.ts` - Added ML persistence step 6a with try/catch
- `src/scoring/scoring.module.ts` - Imported MlPersistenceModule
- `src/app.module.ts` - Registered MlPersistenceModule

## Decisions Made

1. **PredictionOutcome as TypeScript enum** - Stored as VARCHAR(30) in database for flexibility, not Prisma enum to avoid migration overhead for enum changes

2. **Features as JSONB** - Complete ScoringFeatures interface stored as JSON for immutability and decoupling from Application schema changes

3. **Algorithm version '2.1'** - Hardcoded across feature snapshot, prediction log, and risk score result for consistency

4. **Synchronous ML persistence** - Runs in scoring job (not separate queue) but wrapped in try/catch to never fail scoring

5. **Idempotent prediction log** - Uses upsert on applicationId to allow re-scoring without duplicates

6. **updateMany for outcome recording** - No-op if prediction log doesn't exist (graceful handling)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Database drift during migration** - Prisma detected drift between migration history and actual schema. Resolved by:
1. Creating migration SQL manually based on schema changes
2. Applying directly with `npx prisma db execute --file`
3. Regenerating Prisma client with `npx prisma generate`

This is expected in the project's migration workflow (Supabase migrations folder, not Prisma migrations folder).

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 22 Plan 02 (Model Retraining Dataset)**:
- Feature snapshots being persisted with every scoring run
- Prediction logs created with PENDING outcome
- Outcome recording methods ready for application/lease lifecycle hooks
- Database schema supports efficient querying for retraining datasets

**No blockers or concerns.**

## Self-Check: PASSED

All deliverables verified:

**Created files:**
- ✓ src/ml-persistence/ml-persistence.service.ts
- ✓ src/ml-persistence/ml-persistence.module.ts
- ✓ src/ml-persistence/dto/prediction-outcome.enum.ts
- ✓ src/ml-persistence/dto/index.ts
- ✓ supabase/migrations/00007_ml_persistence.sql

**Commits:**
- ✓ d70d004 (Task 1)
- ✓ 13fbd59 (Task 2)

**Database tables:**
- ✓ application_feature_snapshots
- ✓ prediction_logs

---
*Phase: 22-ml-persistence*
*Completed: 2026-02-16*
