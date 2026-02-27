---
phase: 22-ml-persistence
verified: 2026-02-15T23:45:00Z
status: passed
score: 7/7 must-haves verified
must_haves:
  truths:
    - "Every scoring run persists exact features used at prediction time in a snapshot table"
    - "Every scoring run creates a prediction log with predicted score and level"
    - "Feature snapshots are immutable and decoupled from mutable Application data"
    - "Rejected/withdrawn applications have their outcome recorded in PredictionLog"
    - "Approved applications that become leases get tracked via PredictionLog with leaseId"
    - "Outcomes update automatically when leases age (via daily cron)"
    - "Admin can export training data as CSV with point-in-time correct features and outcomes"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "ApplicationFeatureSnapshot and PredictionLog models"
    - path: "src/ml-persistence/ml-persistence.service.ts"
      provides: "Core ML persistence service"
    - path: "src/ml-persistence/ml-persistence.module.ts"
      provides: "Self-contained module registration"
    - path: "src/ml-persistence/listeners/application-outcome.listener.ts"
      provides: "REJECTED/WITHDRAWN outcome tracking"
    - path: "src/ml-persistence/listeners/contract-outcome.listener.ts"
      provides: "APPROVED_PENDING outcome + leaseId linking"
    - path: "src/ml-persistence/scheduled/outcome-tracker.scheduler.ts"
      provides: "Daily cron for lease payment evaluation"
    - path: "src/ml-persistence/export/ml-export.service.ts"
      provides: "Point-in-time correct training data export"
    - path: "src/ml-persistence/export/ml-export.controller.ts"
      provides: "ADMIN-only export endpoints"
  key_links:
    - from: "src/scoring/processors/scoring.processor.ts"
      to: "src/ml-persistence/ml-persistence.service.ts"
      via: "constructor injection + createSnapshot + createPredictionLog calls"
    - from: "src/ml-persistence/listeners/application-outcome.listener.ts"
      to: "src/ml-persistence/ml-persistence.service.ts"
      via: "@OnEvent('application.statusChanged') -> recordOutcome"
    - from: "src/ml-persistence/listeners/contract-outcome.listener.ts"
      to: "src/ml-persistence/ml-persistence.service.ts"
      via: "@OnEvent('contract.activated') -> recordOutcome + leaseId update"
    - from: "src/ml-persistence/scheduled/outcome-tracker.scheduler.ts"
      to: "src/ml-persistence/ml-persistence.service.ts"
      via: "@Cron('0 9 * * *') -> recordLeaseOutcome"
    - from: "src/ml-persistence/export/ml-export.service.ts"
      to: "prisma (raw SQL)"
      via: "JOIN application_feature_snapshots + risk_score_results + prediction_logs"
---

# Phase 22: ML Persistence Verification Report

**Phase Goal:** Data infrastructure for future ML model training
**Verified:** 2026-02-15T23:45:00Z
**Status:** PASSED
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every scoring run persists exact features used at prediction time in a snapshot table | VERIFIED | `scoring.processor.ts` line 140: `mlPersistenceService.createSnapshot(applicationId, features, '2.1')` called in step 6a; `ml-persistence.service.ts` line 40: `prisma.applicationFeatureSnapshot.create({ data: { applicationId, features: features as unknown as Prisma.InputJsonValue, algorithmVersion } })` |
| 2 | Every scoring run creates a prediction log with predicted score and level | VERIFIED | `scoring.processor.ts` line 147: `mlPersistenceService.createPredictionLog(applicationId, result.total, result.level, '2.1')` called in step 6a; `ml-persistence.service.ts` line 77: `prisma.predictionLog.upsert(...)` with predictedScore, predictedLevel, algorithmVersion |
| 3 | Feature snapshots are immutable and decoupled from mutable Application data | VERIFIED | Schema: `applicationId String @unique` (one-to-one), `features Json` (full feature vector), no mutable Application fields stored. Export query joins `application_feature_snapshots` (immutable), never `applications` (mutable). |
| 4 | Rejected/withdrawn applications have their outcome recorded in PredictionLog | VERIFIED | `application-outcome.listener.ts` line 25: `@OnEvent('application.statusChanged')`, filters for REJECTED/WITHDRAWN, calls `mlPersistenceService.recordOutcome()`. Event emitted from `landlord.service.ts` lines 476, 533, 596. |
| 5 | Approved applications that become leases get tracked via PredictionLog with leaseId | VERIFIED | `contract-outcome.listener.ts` line 35: `@OnEvent('contract.activated')`, resolves applicationId via `prisma.contract.findUnique()`, records APPROVED_PENDING, links leaseId via `prisma.predictionLog.updateMany()`. Event emitted from `contracts.service.ts` line 564. |
| 6 | Outcomes update automatically when leases age (via daily cron) | VERIFIED | `outcome-tracker.scheduler.ts` line 32: `@Cron('0 9 * * *')`, queries leases 3+ months old, evaluates payment performance with 5-day grace period, calls `mlPersistenceService.recordLeaseOutcome()` with outcome category, monthsTracked, latePaymentCount. |
| 7 | Admin can export training data as CSV with point-in-time correct features and outcomes | VERIFIED | `ml-export.controller.ts` line 25: `@Roles(Role.ADMIN)` at class level. `ml-export.service.ts` line 108: raw SQL query `FROM application_feature_snapshots afs JOIN risk_score_results rsr ON rsr.application_id = afs.application_id JOIN prediction_logs pl ON pl.application_id = afs.application_id` -- point-in-time correct. CSV formatting flattens JSON features into 16 individual columns + prediction + outcome columns. Filters by algorithmVersion, minMonthsTracked, completedOnly, format. |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` (ApplicationFeatureSnapshot) | Model with @unique applicationId, Json features, algorithmVersion | VERIFIED | 20 lines, JSONB features, @unique applicationId, proper FK + cascade |
| `prisma/schema.prisma` (PredictionLog) | Model with predicted score/level, actual outcome, lease tracking fields | VERIFIED | 27 lines, predictedScore Int, predictedLevel RiskLevel, actualOutcome String?, leaseId, monthsTracked, latePaymentCount, defaulted |
| `prisma/schema.prisma` (Application relations) | featureSnapshot and predictionLog optional relations | VERIFIED | Lines 470-471 in Application model |
| `src/ml-persistence/ml-persistence.service.ts` | 4 methods: createSnapshot, createPredictionLog, recordOutcome, recordLeaseOutcome | VERIFIED | 197 lines, all 4 methods present, Prisma queries correct, idempotent upsert for predictionLog, updateMany for outcomes |
| `src/ml-persistence/ml-persistence.module.ts` | Module with all providers, exports MlPersistenceService | VERIFIED | 36 lines, 5 providers + 1 controller, exports MlPersistenceService |
| `src/ml-persistence/dto/prediction-outcome.enum.ts` | TypeScript enum with all outcome states | VERIFIED | 42 lines, 9 enum values including PENDING, APPROVED_PENDING, APPROVED_PAID_ON_TIME, APPROVED_LATE_PAYMENTS, APPROVED_DEFAULTED, REJECTED, WITHDRAWN + legacy compat values |
| `src/ml-persistence/listeners/application-outcome.listener.ts` | @OnEvent listener for REJECTED/WITHDRAWN | VERIFIED | 57 lines, filters for REJECTED/WITHDRAWN, try/catch wrapped |
| `src/ml-persistence/listeners/contract-outcome.listener.ts` | @OnEvent listener for contract.activated, resolves applicationId from contract | VERIFIED | 86 lines, resolves applicationId from Contract table, records APPROVED_PENDING, links leaseId, try/catch wrapped |
| `src/ml-persistence/scheduled/outcome-tracker.scheduler.ts` | Daily cron with payment evaluation logic | VERIFIED | 123 lines, @Cron('0 9 * * *'), 5-day grace period, outcome categorization logic, per-lease try/catch |
| `src/ml-persistence/export/ml-export.service.ts` | Raw SQL export + CSV formatting + stats | VERIFIED | 307 lines, raw SQL point-in-time join, CSV with 30 columns, getStats with groupBy |
| `src/ml-persistence/export/ml-export.controller.ts` | ADMIN-only GET /ml/export and GET /ml/stats | VERIFIED | 72 lines, @Roles(Role.ADMIN) class-level, CSV Content-Type/Disposition headers, JSON fallback |
| `src/ml-persistence/dto/export-query.dto.ts` | Query DTO with algorithmVersion, minMonthsTracked, format, completedOnly | VERIFIED | 59 lines, class-validator decorators, @Transform for boolean, @IsIn for format enum |
| `supabase/migrations/00007_ml_persistence.sql` | Table creation for feature_snapshots and prediction_logs | VERIFIED | 63 lines, CREATE TABLE with FKs, indexes, update trigger |
| `supabase/migrations/00008_ml_persistence_v2.sql` | ALTER TABLE for lease tracking fields | VERIFIED | 16 lines, adds property_rent, lease_id, months_tracked, late_payment_count, defaulted |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `scoring.processor.ts` | `ml-persistence.service.ts` | Constructor injection | WIRED | Line 51: `private readonly mlPersistenceService: MlPersistenceService`, lines 140+147: both createSnapshot and createPredictionLog called |
| `scoring.module.ts` | `ml-persistence.module.ts` | Module import | WIRED | Line 81: MlPersistenceModule in imports array |
| `app.module.ts` | `ml-persistence.module.ts` | Module import | WIRED | Line 98: MlPersistenceModule in imports array |
| `application-outcome.listener.ts` | `ml-persistence.service.ts` | @OnEvent + injection | WIRED | @OnEvent('application.statusChanged') calls recordOutcome(); event emitted from landlord.service.ts lines 476, 533, 596 |
| `contract-outcome.listener.ts` | `ml-persistence.service.ts` | @OnEvent + injection | WIRED | @OnEvent('contract.activated') calls recordOutcome() + updates leaseId; event emitted from contracts.service.ts line 564 |
| `contract-outcome.listener.ts` | `prisma.contract` | Prisma query | WIRED | Line 41: `prisma.contract.findUnique()` resolves applicationId from contractId |
| `outcome-tracker.scheduler.ts` | `ml-persistence.service.ts` | @Cron + injection | WIRED | @Cron('0 9 * * *') calls recordLeaseOutcome() for each qualifying lease |
| `ml-export.service.ts` | Prisma (raw SQL) | $queryRawUnsafe | WIRED | Joins application_feature_snapshots + risk_score_results + prediction_logs -- point-in-time correct, never references mutable applications table |
| `ml-export.controller.ts` | `ml-export.service.ts` | Constructor injection | WIRED | Calls getTrainingData() and getStats() |
| ML persistence errors | Scoring pipeline | try/catch isolation | WIRED | Lines 137-160 in scoring.processor.ts: try/catch ensures ML failures don't block scoring |

### Requirements Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| MLPR-01: All extracted features persisted | SATISFIED | ApplicationFeatureSnapshot stores full ScoringFeatures JSON at scoring time; scoring processor calls createSnapshot() on every run |
| MLPR-02: Application outcomes tracked (approved -> paid/defaulted) | SATISFIED | ApplicationOutcomeListener for REJECTED/WITHDRAWN; ContractOutcomeListener for APPROVED_PENDING; OutcomeTrackerScheduler for APPROVED_PAID_ON_TIME/LATE_PAYMENTS/DEFAULTED |
| MLPR-03: Score predictions vs actuals logged | SATISFIED | PredictionLog stores predictedScore + predictedLevel at scoring time; actualOutcome updated by listeners and scheduler; both joined in export query |
| MLPR-04: Data export capability for ML training | SATISFIED | GET /ml/export (ADMIN-only) returns CSV/JSON with point-in-time correct features + predictions + outcomes; GET /ml/stats returns aggregate statistics |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No TODO, FIXME, placeholder, or stub patterns found in any ml-persistence files |

### Compilation Verification

| Check | Result |
|-------|--------|
| `npx prisma validate` | PASSED -- "The schema at prisma/schema.prisma is valid" |
| `npx tsc --noEmit` | PASSED -- zero errors |

### Architecture Compliance

| Criterion | Status | Evidence |
|-----------|--------|---------|
| ML persistence errors don't block scoring | VERIFIED | try/catch wrapping in scoring.processor.ts lines 137-160 |
| Outcome listeners self-contained in MlPersistenceModule | VERIFIED | No MlPersistence imports in notifications/, leases/, or applications/ modules. Only external consumers: app.module.ts (registration) and scoring/ (module import + service injection) |
| Export uses point-in-time correct query | VERIFIED | Raw SQL joins application_feature_snapshots (immutable) + risk_score_results + prediction_logs. No reference to mutable applications table in export query |
| ADMIN-only access on export endpoints | VERIFIED | @Roles(Role.ADMIN) at class level on MlExportController |
| Export query filters by algorithm version and min observation period | VERIFIED | ExportQueryDto has algorithmVersion, minMonthsTracked, completedOnly, format -- all used in SQL WHERE clause |

### Human Verification Required

### 1. Daily Cron Execution
**Test:** Wait for 09:00 UTC or manually trigger `updatePredictionOutcomes()` with test leases that have 3+ months of payment data
**Expected:** PredictionLog records updated with correct outcome categories based on payment history
**Why human:** Requires running application with database containing lease + payment data; late payment grace period calculation depends on actual dates

### 2. Event Listener Ordering
**Test:** Activate a contract and verify both the Lease is created (by LeasesModule listener) and PredictionLog is updated with APPROVED_PENDING + leaseId (by MlPersistenceModule listener)
**Expected:** Both listeners fire in order; PredictionLog has leaseId linked
**Why human:** NestJS EventEmitter listener execution order depends on module registration order; need runtime verification

### 3. CSV Export Format
**Test:** Call `GET /ml/export?format=csv` with ADMIN credentials after at least one scoring run
**Expected:** CSV file with header row containing 30 columns, feature columns correctly flattened from JSON, proper null handling
**Why human:** CSV formatting edge cases (commas in values, null handling, date serialization) need visual inspection

### Gaps Summary

No gaps found. All 7 observable truths verified. All 14 artifacts pass existence, substantive, and wiring checks. All 10 key links confirmed wired. All 4 ROADMAP success criteria satisfied. All 4 MLPR requirements covered. Zero anti-patterns detected. TypeScript compiles cleanly. Prisma schema validates.

---

_Verified: 2026-02-15T23:45:00Z_
_Verifier: Claude (gsd-verifier)_
