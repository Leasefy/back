---
phase: 27-unified-evaluation-endpoint
plan: 03
status: completed
completed_at: "2026-04-04"
---

# Plan 27-03 Summary: EvaluationsModule + Orchestration

## What Was Done
- Created `EvaluationsModule` importing AgentCreditsModule + SubscriptionsModule
- Created `EvaluationsController` with POST /:applicationId (202) and GET /:applicationId/result
- Created `EvaluationsService` with full orchestration:
  - Ownership validation (property.landlordId === requestedBy)
  - Idempotency (PENDING/COMPLETED return existing, FAILED allows retry)
  - Plan validation (getActiveSubscription, 403 if none)
  - FLEX bypass (no credit deduction)
  - STARTER/PRO credit deduction (deductCredits(userId, 1, applicationId))
  - PRO 30/month limit (EvaluationUsage upsert)
  - Micro call + runId storage
  - Client-driven polling with DB update on completion
- Registered EvaluationsModule in AppModule

## Files Created
- `src/evaluations/evaluations.module.ts`
- `src/evaluations/evaluations.controller.ts`
- `src/evaluations/evaluations.service.ts`
- `src/evaluations/dto/evaluation-response.dto.ts`

## Files Modified
- `src/evaluations/dto/index.ts` — added barrel export
- `src/app.module.ts` — added EvaluationsModule

## Verification
- `npx tsc --noEmit` ✅
