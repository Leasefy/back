---
phase: 05-scoring-engine
plan: 02
subsystem: scoring
tags: [feature-extraction, scoring-models, risk-assessment, financial-analysis, integrity-check]

# Dependency graph
requires:
  - phase: 05-01
    provides: RiskScoreResult model, BullMQ queue infrastructure
  - phase: 04-applications
    provides: Application model with JSON wizard fields
provides:
  - ScoringFeatures interface for extracted application data
  - FeatureBuilder service for feature extraction
  - FinancialModel service (35 points max)
  - StabilityModel service (25 points max)
  - HistoryModel service (15 points max)
  - IntegrityEngine service (25 points max)
affects: [05-03, 10-ai-document-analysis, 11-explainability]

# Tech tracking
tech-stack:
  added: []
  patterns: [feature extraction from JSON, deduction-based integrity scoring]

key-files:
  created:
    - src/scoring/features/scoring-features.interface.ts
    - src/scoring/features/feature-builder.ts
    - src/scoring/models/model-result.interface.ts
    - src/scoring/models/financial-model.ts
    - src/scoring/models/stability-model.ts
    - src/scoring/models/history-model.ts
    - src/scoring/models/integrity-engine.ts
  modified:
    - src/scoring/scoring.module.ts

key-decisions:
  - "Division-by-zero protection: ratios default to 1.0 when income is 0"
  - "Spanish signal messages for Colombian market"
  - "IntegrityEngine starts at max score and deducts for inconsistencies"
  - "Completeness recognition as positive signal without score impact"
  - "MIN_BUFFER_COP = 500,000 COP for disposable income threshold"

patterns-established:
  - "ModelResult interface: score, maxScore, signals[] for all scoring models"
  - "Signal interface: code, positive, weight, message for explainability"
  - "Feature extraction from Prisma JSON via type casting"
  - "Score allocation: Financial (35) + Stability (25) + History (15) + Integrity (25) = 100"

# Metrics
duration: 16min
completed: 2026-01-30
---

# Phase 5 Plan 2: Scoring Models Summary

**FeatureBuilder extracts scoring features, four models (Financial, Stability, History, Integrity) calculate subscores totaling 100 points with Spanish explainability signals**

## Performance

- **Duration:** 16 min
- **Started:** 2026-01-30T17:16:15Z
- **Completed:** 2026-01-30T17:32:03Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- ScoringFeatures interface covering personal, employment, financial, and reference data
- FeatureBuilder extracts and calculates features from Application JSON + Property
- FinancialModel (0-35): RTI, DTI, disposable income buffer scoring
- StabilityModel (0-25): employment type, tenure, employer contact scoring
- HistoryModel (0-15): landlord, employment, personal reference scoring
- IntegrityEngine (0-25): detects data inconsistencies via deduction-based scoring
- All models return signals with Spanish messages for explainability

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ScoringFeatures interface and FeatureBuilder** - `875d9c3` (feat)
2. **Task 2: Create ModelResult interface and FinancialModel** - `3820c19` (feat)
3. **Task 3: Create StabilityModel, HistoryModel, IntegrityEngine** - `19b6ab3` (feat)

**Plan metadata:** Included below

## Files Created/Modified
- `src/scoring/features/scoring-features.interface.ts` - Interface for extracted scoring features
- `src/scoring/features/feature-builder.ts` - Service to extract features from Application + Property
- `src/scoring/models/model-result.interface.ts` - Signal and ModelResult interfaces
- `src/scoring/models/financial-model.ts` - Financial health scorer (35 max)
- `src/scoring/models/stability-model.ts` - Employment stability scorer (25 max)
- `src/scoring/models/history-model.ts` - References history scorer (15 max)
- `src/scoring/models/integrity-engine.ts` - Data consistency checker (25 max)
- `src/scoring/scoring.module.ts` - Updated with all new providers and exports

## Decisions Made
- **Division-by-zero protection:** When monthlyIncome = 0, ratios default to 1.0 (worst case) instead of NaN/Infinity
- **Spanish signal messages:** All explainability messages in Spanish for Colombian market
- **Deduction-based integrity:** IntegrityEngine starts at 25 and deducts for inconsistencies (vs additive scoring)
- **Completeness bonus:** Complete applications get positive signal recognition without score impact
- **COP thresholds:** MIN_BUFFER_COP = 500,000, HIGH_INCOME_COP = 10,000,000, STUDENT_HIGH_INCOME_COP = 5,000,000
- **Employment type scoring:** EMPLOYED (10) > RETIRED (9) > SELF_EMPLOYED (7) > CONTRACTOR (6) > STUDENT (4) > UNEMPLOYED (0)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Import path resolution:** Initial attempt to use `@/` path aliases failed as tsconfig.json doesn't define path aliases. Fixed by using relative imports with `.js` extensions (ESM requirement).

## User Setup Required

None - no external service configuration required. All dependencies from 05-01 remain valid.

## Next Phase Readiness
- All scoring models ready for aggregation in 05-03
- Score weights verified: 35 + 25 + 15 + 25 = 100
- Models exported from ScoringModule for service injection
- Ready for ScoringService and ScoringProcessor implementation

---
*Phase: 05-scoring-engine*
*Completed: 2026-01-30*
