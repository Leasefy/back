---
phase: 05-scoring-engine
plan: 03
subsystem: api
tags: [bullmq, scoring, risk-assessment, async-processing, nestjs]

# Dependency graph
requires:
  - phase: 05-01
    provides: BullMQ queue, RiskScoreResult model, RiskLevel enum
  - phase: 05-02
    provides: FeatureBuilder, FinancialModel, StabilityModel, HistoryModel, IntegrityEngine
  - phase: 04-05
    provides: ApplicationsService with submit method
provides:
  - ScoreAggregator combining 4 subscores into total 0-100
  - Risk level calculation A/B/C/D with condition generation
  - ScoringProcessor (BullMQ WorkerHost) for async execution
  - ScoringService for queue job creation
  - Integration with application submit flow
affects: [06-landlord-features, 10-ai-document-analysis, 11-explainability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "BullMQ WorkerHost pattern for async job processing"
    - "Prisma InputJsonValue cast for strict JSON typing"
    - "Module export pattern for cross-module service injection"

key-files:
  created:
    - src/scoring/aggregator/risk-score-result.interface.ts
    - src/scoring/aggregator/score-aggregator.ts
    - src/scoring/processors/scoring.processor.ts
    - src/scoring/scoring.service.ts
    - src/scoring/dto/scoring-job.dto.ts
  modified:
    - src/scoring/scoring.module.ts
    - src/applications/applications.module.ts
    - src/applications/applications.service.ts

key-decisions:
  - "IntegrityEngine.analyze() instead of calculate() - requires full Application for context"
  - "Prisma InputJsonValue cast for drivers/flags/conditions arrays"
  - "Job ID pattern: score-{applicationId} prevents duplicate scoring"

patterns-established:
  - "Condition generation based on risk level: C=deposit, D=cosigner"
  - "Flag-based conditions: HIGH_RTI triggers income verification"
  - "Status auto-transition: SUBMITTED -> UNDER_REVIEW via async processor"

# Metrics
duration: 5min
completed: 2026-01-30
---

# Phase 5 Plan 3: Score Aggregation Summary

**ScoreAggregator combining 4 subscores into 0-100 total with A/B/C/D classification, async BullMQ processor persisting results, and submit flow integration**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-30T17:34:24Z
- **Completed:** 2026-01-30T17:39:22Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- ScoreAggregator combines Financial(35) + Stability(25) + History(15) + Integrity(25) into bounded 0-100 total
- Risk level classification: A (80+), B (65-79), C (50-64), D (0-49)
- Condition generation: C level suggests deposit, D level requires cosigner, HIGH_RTI flag requires income verification
- ScoringProcessor persists to RiskScoreResult table and updates application status to UNDER_REVIEW
- Application submit() now queues scoring job via ScoringService

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScoreAggregator with level calculation and conditions** - `ef5c556` (feat)
2. **Task 2: Create ScoringProcessor and ScoringService** - `4659154` (feat)
3. **Task 3: Integrate scoring into application submit flow** - `a21e492` (feat)

## Files Created/Modified

- `src/scoring/aggregator/risk-score-result.interface.ts` - Driver, Flag, Condition, RiskScoreResultData interfaces
- `src/scoring/aggregator/score-aggregator.ts` - Combines subscores, calculates level, generates conditions
- `src/scoring/dto/scoring-job.dto.ts` - ScoringJobData interface for queue payload
- `src/scoring/processors/scoring.processor.ts` - BullMQ WorkerHost for async job processing
- `src/scoring/scoring.service.ts` - addScoringJob method for queue job creation
- `src/scoring/scoring.module.ts` - Added providers, exports ScoringService
- `src/applications/applications.module.ts` - Imports ScoringModule
- `src/applications/applications.service.ts` - Calls scoringService.addScoringJob in submit()

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use IntegrityEngine.analyze() not calculate() | IntegrityEngine requires full Application object for context, unlike other models |
| Cast to Prisma.InputJsonValue | Prisma 7.x strict JSON typing requires explicit cast for Driver/Flag/Condition arrays |
| Job ID = `score-{applicationId}` | Prevents duplicate scoring jobs for same application |
| Use getRiskLevelFromScore() helper | Reuse existing helper from risk-level.enum.ts for consistent level calculation |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] IntegrityEngine method name mismatch**
- **Found during:** Task 2 (ScoringProcessor creation)
- **Issue:** Plan specified `integrityEngine.calculate()` but IntegrityEngine has `analyze()` method
- **Fix:** Changed to `integrityEngine.analyze(application, features)` with application parameter
- **Files modified:** src/scoring/processors/scoring.processor.ts
- **Verification:** TypeScript compiles successfully
- **Committed in:** `4659154` (Task 2 commit)

**2. [Rule 3 - Blocking] Prisma 7.x JSON type strictness**
- **Found during:** Task 2 (ScoringProcessor creation)
- **Issue:** TypeScript error: `Type 'Driver[]' is not assignable to type 'InputJsonValue'`
- **Fix:** Added `as unknown as Prisma.InputJsonValue` cast for signals/drivers/flags/conditions
- **Files modified:** src/scoring/processors/scoring.processor.ts
- **Verification:** TypeScript compiles, npm run build passes
- **Committed in:** `4659154` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes were necessary for compilation. No scope creep.

## Issues Encountered

None - all issues were blocking TypeScript compilation errors handled via deviation rules.

## User Setup Required

None - no external service configuration required. Redis (Upstash) was configured in 05-01.

## Next Phase Readiness

- **Phase 5 COMPLETE** - Scoring engine fully operational
- Scoring pipeline: submit -> queue job -> extract features -> run models -> aggregate -> persist -> status update
- Ready for Phase 6: Landlord Features (approve/reject candidates with risk score visibility)
- Risk score results available in `RiskScoreResult` table for landlord decision-making

---
*Phase: 05-scoring-engine*
*Completed: 2026-01-30*
