---
phase: 21-explainability
verified: 2026-02-15T17:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 21: Explainability Verification Report

**Phase Goal:** Full scoring explanation with drivers, flags, and suggestions
**Verified:** 2026-02-15T17:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | DriverFormatterService enriches raw drivers with category and icon metadata | VERIFIED | `driver-formatter.service.ts` (141 lines): `format()` maps each driver to matching signal, calls `inferCategory()` with 6 category branches (financial/stability/history/integrity/paymentHistory/documentVerification), and `determineIcon()` logic (positive->trending_up, negative+integrity->warning, else->trending_down) |
| 2 | NarrativeGeneratorService calls Cohere Command R+ with Spanish-language financial explainability prompt | VERIFIED | `narrative-generator.service.ts` (141 lines): Injects `CohereService`, builds system prompt in Spanish ("Eres un asistente especializado en explicar evaluaciones de riesgo crediticio para arriendos en Colombia"), builds user prompt with score data, calls `this.cohereService.analyze()`, parses JSON `{narrative}` response with raw content fallback |
| 3 | TemplateGeneratorService produces a structured Spanish narrative without AI | VERIFIED | `template-generator.service.ts` (87 lines): `generate()` builds 3-paragraph narrative (score+level summary, top 4 drivers with check/cross marks, flags/conditions counts). No external dependencies. `getLevelLabel()` maps A-D to Spanish labels |
| 4 | ExplainabilityService orchestrates driver formatting + narrative generation with fallback | VERIFIED | `explainability.service.ts` (249 lines): Injects all 3 sub-services + PrismaService. `getExplanation()` checks cached `scoreResult.explanation` first, tries AI generation with try/catch, falls back to template generator on failure. `generateAndCacheNarrative()` generates and persists via `prisma.riskScoreResult.update()` |
| 5 | ExplainabilityDto includes totalScore, level, narrative, drivers (with category), flags, conditions, and subscores | VERIFIED | `explainability-response.dto.ts` (168 lines): `ExplainabilityResponseDto` has all fields with `@ApiProperty()` decorators: `totalScore`, `level`, `narrative`, `drivers: DriverExplanationDto[]`, `flags` (with code/severity/message), `conditions` (with type/message/required), `subscores: SubscoreDto[]`, `algorithmVersion`, `isPremium` |
| 6 | GET /scoring/:applicationId/explanation returns ExplainabilityResponseDto for PRO/BUSINESS users | VERIFIED | `scoring.controller.ts` line 124: `@Get(':applicationId/explanation')` with `async getExplanation()` returning `Promise<ExplainabilityResponseDto>`. Calls `this.explainabilityService.getExplanation(result, application)` after permission and subscription checks |
| 7 | GET /scoring/:applicationId/explanation returns 403 for FREE tier users | VERIFIED | `scoring.controller.ts` lines 166-175: Checks `planConfig.hasPremiumScoring`, throws `ForbiddenException` with message "Tu plan no incluye explicaciones detalladas de scoring. Actualiza a PRO o BUSINESS." and `requiredPlan: 'PRO'` |
| 8 | Scoring processor queues async narrative generation after score persistence for premium users | VERIFIED | `scoring.processor.ts` lines 135-168: After `prisma.riskScoreResult.create()` (step 6), checks both tenant and landlord plans via `Promise.all`, calls `this.explainabilityService.generateAndCacheNarrative()` if either has `hasPremiumScoring`. Wrapped in try/catch so failure does not break scoring |
| 9 | Cached narratives in RiskScoreResult.explanation are reused without AI call | VERIFIED | `explainability.service.ts` lines 83-89: `if (scoreResult.explanation)` returns cached narrative directly, sets `isPremium = true`, skips AI generation entirely |
| 10 | Subscores visible with per-category score, maxScore, and Spanish label | VERIFIED | `explainability.service.ts` lines 199-231: `buildSubscores()` returns 5 `SubscoreDto` objects with categories (financial/stability/history/integrity/paymentHistory), correct maxScores (35/25/15/25/15), and Spanish labels ("Situacion Financiera", "Estabilidad Laboral", "Historial de Referencias", "Integridad de Datos", "Historial de Pagos") |
| 11 | 3-6 driver explanations with category metadata in response | VERIFIED | `driver-formatter.service.ts` transforms all drivers from `RiskScoreResultData.drivers` (which aggregator produces 3-6 per spec). Each enriched with `category` (6 possible values) and `icon` (3 possible values). `ExplainabilityResponseDto.drivers` typed as `DriverExplanationDto[]` |
| 12 | Risk flags and suggested conditions included in explanation response | VERIFIED | `explainability.service.ts` line 123-124: Response includes `flags` (cast from `scoreResult.flags as Flag[]` with code/severity/message) and `conditions` (cast from `scoreResult.conditions as Condition[]` with type DEPOSIT/COSIGNER/INCOME_VERIFICATION/INSURANCE, message, required) |

**Score:** 12/12 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/scoring/explainability/driver-formatter.service.ts` | Driver enrichment with category/icon metadata | VERIFIED (141 lines, no stubs, exported, imported by explainability.service.ts) | 6-category inference from signal codes, 3 icon types |
| `src/scoring/explainability/narrative-generator.service.ts` | Cohere-powered Spanish narrative generation | VERIFIED (141 lines, no stubs, exported, imported by explainability.service.ts) | Injects CohereService, Spanish system prompt, JSON parsing with fallback |
| `src/scoring/explainability/template-generator.service.ts` | Template-based fallback narrative | VERIFIED (87 lines, no stubs, exported, imported by explainability.service.ts) | 3-paragraph Spanish narrative, no external deps |
| `src/scoring/explainability/explainability.service.ts` | Orchestration service | VERIFIED (249 lines, no stubs, exported, imported by scoring.controller.ts and scoring.processor.ts) | Injects all 3 sub-services + Prisma, cache-first pattern, AI-then-template fallback |
| `src/scoring/explainability/dto/explainability-response.dto.ts` | Response DTOs | VERIFIED (168 lines, no stubs, 3 classes exported) | DriverExplanationDto, SubscoreDto, ExplainabilityResponseDto with Swagger annotations |
| `src/scoring/explainability/dto/index.ts` | Barrel exports | VERIFIED (1 line, re-exports all) | Exports from explainability-response.dto.ts |
| `src/scoring/scoring.module.ts` | Module wiring | VERIFIED | Imports AiModule, registers 4 explainability services as providers, exports ExplainabilityService |
| `src/scoring/scoring.controller.ts` | GET endpoint | VERIFIED | `@Get(':applicationId/explanation')` placed before `@Get(':applicationId')` for correct route matching |
| `src/scoring/processors/scoring.processor.ts` | Async narrative pre-generation | VERIFIED | Imports ExplainabilityService + SubscriptionsService, narrative generation after step 6, try/catch wrapped |
| `src/ai/ai.module.ts` | CohereService export | VERIFIED | `exports: [CrossValidationService, CohereService]` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `explainability.service.ts` | `driver-formatter.service.ts`, `narrative-generator.service.ts`, `template-generator.service.ts` | Constructor injection | WIRED | All 3 injected and used in `getExplanation()` and `generateAndCacheNarrative()` |
| `narrative-generator.service.ts` | `cohere.service.ts` | Constructor injection | WIRED | `private readonly cohereService: CohereService`, called via `this.cohereService.analyze()` |
| `scoring.controller.ts` | `explainability.service.ts` | Constructor injection | WIRED | `private readonly explainabilityService: ExplainabilityService`, called in `getExplanation()` endpoint |
| `scoring.processor.ts` | `explainability.service.ts` | Constructor injection | WIRED | `private readonly explainabilityService: ExplainabilityService`, called via `this.explainabilityService.generateAndCacheNarrative()` |
| `scoring.module.ts` | `ai.module.ts` | Module import | WIRED | `imports: [SubscriptionsModule, AiModule, ...]` |
| `scoring.controller.ts` | `subscriptions.service.ts` | Constructor injection for gating | WIRED | `getUserPlanConfig(user.id)` -> `hasPremiumScoring` check, throws 403 if false |

### Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| EXPL-01: 3-6 driver explanations generated per candidate | SATISFIED | DriverFormatterService enriches all drivers with category/icon metadata, 6 categories supported |
| EXPL-02: Risk flags generated as structured data | SATISFIED | Flags typed as `{code, severity, message}` in DTO and passed through from score result |
| EXPL-03: Suggested conditions generated | SATISFIED | Conditions typed as `{type: DEPOSIT/COSIGNER/INCOME_VERIFICATION/INSURANCE, message, required}` |
| EXPL-04: AI-generated conversational explanation | SATISFIED | NarrativeGeneratorService calls Cohere with Spanish prompt, TemplateGeneratorService provides fallback |
| EXPL-05: Subscores visible per category | SATISFIED | 5 subscores with category, score, maxScore, and Spanish label |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | - | - | - | - |

No TODO, FIXME, placeholder, empty return, or console.log-only implementations found in any explainability files.

### Notable Observation

`generateAndCacheNarrative()` in `explainability.service.ts` does NOT have a try/catch with template fallback around the AI narrative call (line 180). If Cohere fails, the error propagates up. However, the caller in `scoring.processor.ts` (lines 159-168) wraps the entire call in try/catch and logs a warning, so this does NOT break the scoring pipeline. The `getExplanation()` method (used by the endpoint) DOES have proper fallback (lines 92-114). This means: if pre-generation fails, the endpoint will still generate on-demand with fallback. This is acceptable behavior.

### Human Verification Required

### 1. AI Narrative Quality
**Test:** Trigger scoring for a PRO-tier application, then call GET /scoring/:applicationId/explanation
**Expected:** A 2-3 paragraph Spanish narrative that describes the score, key factors, and any risk flags in professional Colombian financial language
**Why human:** Cannot programmatically verify narrative quality, tone, or coherence

### 2. Subscription Gating End-to-End
**Test:** Call GET /scoring/:applicationId/explanation as a FREE-tier user
**Expected:** 403 response with message "Tu plan no incluye explicaciones detalladas de scoring. Actualiza a PRO o BUSINESS."
**Why human:** Requires running application with database state to verify full auth + subscription chain

### 3. Cached Narrative Reuse
**Test:** Call the explanation endpoint twice for the same application
**Expected:** Second call returns instantly using cached narrative from RiskScoreResult.explanation field (no Cohere call)
**Why human:** Requires observing actual API latency and checking logs for "Using cached narrative" message

### Gaps Summary

No gaps found. All 12 observable truths are verified. All 10 artifacts pass existence, substantive, and wiring checks. All 6 key links are confirmed wired. All 5 EXPL requirements are satisfied. TypeScript compilation passes cleanly. No anti-patterns detected.

---

_Verified: 2026-02-15T17:00:00Z_
_Verifier: Claude (gsd-verifier)_
