---
phase: 21-explainability
plan: 02
subsystem: api, scoring
tags: [nestjs, cohere, explainability, scoring, subscription-gating, bullmq]

# Dependency graph
requires:
  - phase: 21-explainability-01
    provides: ExplainabilityService, DriverFormatterService, NarrativeGeneratorService, TemplateGeneratorService, DTOs
  - phase: 20-ai-document-analysis
    provides: AiModule with CohereService
  - phase: 12-subscriptions-plans
    provides: SubscriptionsService.getUserPlanConfig, hasPremiumScoring
provides:
  - GET /scoring/:applicationId/explanation endpoint (PRO/BUSINESS gated)
  - Async narrative pre-generation in scoring processor pipeline
  - AiModule CohereService export for cross-module usage
  - Algorithm version 2.1 with explainability integration
affects: [frontend-scoring-views, api-documentation]

# Tech tracking
tech-stack:
  added: []
  patterns: [non-blocking narrative generation in BullMQ processor, subscription-gated API endpoint, cross-module service export]

key-files:
  created: []
  modified:
    - src/scoring/scoring.module.ts
    - src/scoring/scoring.controller.ts
    - src/scoring/processors/scoring.processor.ts
    - src/ai/ai.module.ts
    - src/scoring/explainability/explainability.service.ts

key-decisions:
  - "Narrative generation failure in processor is non-blocking (logged as warning, does not fail scoring job)"
  - "Explanation endpoint checks both tenant and landlord premium access"
  - "Pre-generate narrative only when tenant OR landlord has premium plan"

patterns-established:
  - "Non-blocking side-effect in BullMQ: try/catch wrapping optional async work after core persistence"
  - "Route ordering: specific routes before parameterized wildcards (:applicationId/explanation before :applicationId)"

# Metrics
duration: 11min
completed: 2026-02-15
---

# Phase 21 Plan 02: REST Endpoint, Module Wiring, Processor Integration Summary

**Explainability endpoint with subscription gating and async narrative pre-generation in scoring pipeline**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-15T16:20:28Z
- **Completed:** 2026-02-15T16:31:57Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Wired 4 explainability services into ScoringModule with AiModule import for Cohere access
- Created GET /scoring/:applicationId/explanation endpoint with permission checks (tenant owner OR property landlord) and PRO/BUSINESS subscription gating
- Integrated async narrative pre-generation into scoring processor pipeline (non-blocking, fires after score persistence)
- Exported CohereService from AiModule for cross-module consumption
- Bumped algorithmVersion to '2.1' reflecting explainability integration

## Task Commits

Each task was committed atomically:

1. **Task 1: Register explainability services in ScoringModule and add endpoint** - `f8ab61e` (feat)
2. **Task 2: Integrate async narrative generation into scoring processor** - `f9f4a4a` (feat)

**Plan metadata:** pending (docs: complete plan)

## Files Created/Modified
- `src/scoring/scoring.module.ts` - Added AiModule import, 4 explainability service providers, ExplainabilityService export
- `src/scoring/scoring.controller.ts` - Added GET :applicationId/explanation endpoint with permission and subscription checks
- `src/scoring/processors/scoring.processor.ts` - Added narrative pre-generation after score persistence, algorithmVersion to '2.1'
- `src/ai/ai.module.ts` - Added CohereService to exports array
- `src/scoring/explainability/explainability.service.ts` - Fixed Prisma RiskLevel enum cast

## Decisions Made
- Narrative generation in processor is wrapped in try/catch so failures never block the scoring job
- Explanation endpoint is placed before the generic :applicationId route to avoid route shadowing
- Pre-generation checks both tenant and landlord plan configs via Promise.all for efficiency

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma RiskLevel enum type mismatch in ExplainabilityService**
- **Found during:** Task 1 (TypeScript compilation after module wiring)
- **Issue:** `scoreResult.level` from Prisma returns `$Enums.RiskLevel` (string literal type) which is not directly assignable to the app's `RiskLevel` enum despite identical values
- **Fix:** Added `import { RiskLevel }` and cast `scoreResult.level as RiskLevel` in both `getExplanation` and `generateAndCacheNarrative` methods
- **Files modified:** `src/scoring/explainability/explainability.service.ts`
- **Verification:** `npx tsc --noEmit` passes cleanly
- **Committed in:** f8ab61e (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Type-level fix from Phase 21-01 code, required for compilation. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Explainability phase is now complete (both plans executed)
- Frontend can consume GET /scoring/:applicationId/explanation for premium users
- Scoring processor pipeline now auto-generates narratives for premium plan holders
- Ready for frontend integration or next backend phase

## Self-Check: PASSED

All 5 modified files verified present. Both task commits (f8ab61e, f9f4a4a) verified in git log.

---
*Phase: 21-explainability*
*Completed: 2026-02-15*
