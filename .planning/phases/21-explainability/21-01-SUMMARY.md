---
phase: 21-explainability
plan: 01
subsystem: scoring
tags: [cohere, ai, explainability, risk-score, spanish-narratives, dto]

# Dependency graph
requires:
  - phase: 05-scoring-engine
    provides: RiskScoreResult model, Signal/Driver/Flag interfaces, score aggregation
  - phase: 20-ai-document-analysis
    provides: CohereService with JSON response format, AI infrastructure
provides:
  - ExplainabilityService orchestration layer for narrative generation
  - DriverFormatterService for enriching drivers with category/icon metadata
  - NarrativeGeneratorService for Cohere-powered Spanish narratives
  - TemplateGeneratorService for fallback narratives without AI
  - ExplainabilityResponseDto with driver categories, subscores, and narratives
affects: [scoring, landlord-features, applications, frontend-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Spanish financial explainability prompts for Cohere Command R+
    - JSON response parsing from Cohere with fallback handling
    - Driver category inference from signal codes
    - Template-based narrative generation as AI fallback
    - Cached narratives in RiskScoreResult.explanation field

key-files:
  created:
    - src/scoring/explainability/dto/explainability-response.dto.ts
    - src/scoring/explainability/dto/index.ts
    - src/scoring/explainability/driver-formatter.service.ts
    - src/scoring/explainability/template-generator.service.ts
    - src/scoring/explainability/narrative-generator.service.ts
    - src/scoring/explainability/explainability.service.ts
  modified: []

key-decisions:
  - "Category inference: Match signal codes to categories (financial: RTI/DTI, stability: EMPLOYMENT, history: REFERENCE, etc.)"
  - "Icon logic: positive->trending_up, negative+integrity->warning, else->trending_down"
  - "Spanish prompts with Colombian financial context for Cohere narratives"
  - "Automatic fallback to template generator when Cohere unavailable"
  - "Cache AI narratives in RiskScoreResult.explanation for reuse"

patterns-established:
  - "Driver enrichment: Match drivers to signals, infer category from signal.code, assign appropriate icon"
  - "Narrative generation: Try AI first, catch errors, fallback to template"
  - "Template narratives: 3-paragraph structure (score+level, top drivers, flags/conditions)"
  - "Subscore labels: Spanish labels for all 5 scoring categories"

# Metrics
duration: 3.6min
completed: 2026-02-15
---

# Phase 21 Plan 01: Explainability Core Services Summary

**Cohere-powered Spanish narrative generation with driver categorization, template fallback, and cached explanations for risk scores**

## Performance

- **Duration:** 3.6 minutes
- **Started:** 2026-02-15T16:10:52Z
- **Completed:** 2026-02-15T16:14:29Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Complete explainability service architecture with AI-first, template-fallback pattern
- Driver enrichment with 6 categories (financial, stability, history, integrity, paymentHistory, documentVerification) and 3 icon types
- Spanish narrative generation via Cohere Command R+ with financial context for Colombia
- Template-based fallback narratives ensuring explainability without AI dependency
- Narrative caching in RiskScoreResult.explanation field for performance

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DriverFormatterService and TemplateGeneratorService** - `bd07bd1` (feat)
2. **Task 2: Create NarrativeGeneratorService and ExplainabilityService** - `a245bf5` (feat)

## Files Created/Modified

- `src/scoring/explainability/dto/explainability-response.dto.ts` - DTOs for explainability responses with drivers, subscores, narratives
- `src/scoring/explainability/dto/index.ts` - Barrel exports for DTOs
- `src/scoring/explainability/driver-formatter.service.ts` - Enriches drivers with category/icon metadata from signal codes
- `src/scoring/explainability/template-generator.service.ts` - Generates structured Spanish narratives without AI
- `src/scoring/explainability/narrative-generator.service.ts` - Cohere Command R+ powered Spanish narrative generation
- `src/scoring/explainability/explainability.service.ts` - Orchestration service with AI-first, template-fallback pattern

## Decisions Made

- **Category inference from signal codes**: RTI/DTI/INCOME → financial, EMPLOYMENT/TENURE → stability, REFERENCE/RENTAL_HISTORY → history, PAYMENT_HISTORY/ON_TIME → paymentHistory, DOC_VERIFICATION/OCR → documentVerification, default → integrity
- **Icon determination logic**: Positive drivers get trending_up, negative integrity issues get warning, other negatives get trending_down
- **Spanish prompt structure**: System prompt defines financial explainability task, user prompt includes score breakdown, categories, drivers, flags, and conditions
- **JSON response parsing**: Parse `{ "narrative": "..." }` from Cohere, fallback to raw content if parsing fails
- **Template narrative format**: 3 paragraphs (score/level/summary, top 4 drivers, flags/conditions if present)
- **Narrative caching strategy**: Fire-and-forget cache on generation, check explanation field first on retrieval
- **Subscore labels**: Spanish labels for all 5 categories (Situación Financiera, Estabilidad Laboral, etc.)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Explainability services ready for integration with scoring controller
- ExplainabilityService can be called after score generation to produce explanations
- Supports both cached (fast) and on-demand (AI or template) narrative generation
- Ready for endpoint exposure in Phase 21 Plan 02

## Self-Check: PASSED

All files created and commits verified:
- ✓ 6 files created
- ✓ 2 commits exist (bd07bd1, a245bf5)

---
*Phase: 21-explainability*
*Completed: 2026-02-15*
