---
phase: 27-unified-evaluation-endpoint
plan: 01
status: completed
completed_at: "2026-04-04"
---

# Plan 27-01 Summary: Schema + Migration + Env Config

## What Was Done
- Added `EvaluationStatus` enum (PENDING, COMPLETED, FAILED)
- Added `EvaluationResult` model with @unique applicationId, runId, Json result field
- Added `EvaluationTransaction` model for per-tier pricing audit trail
- Added `EvaluationUsage` model for PRO monthly counter (@@unique userId_month_year_eval)
- Added User back-relations for all 3 models
- Added Application back-relation (evaluationResult)
- Created manual migration `20260404100000_add_evaluation_models`
- Added `AGENT_MICRO_URL` to env.validation.ts with http://localhost:4000 default

## Files Modified
- `prisma/schema.prisma`
- `prisma/migrations/20260404100000_add_evaluation_models/migration.sql`
- `src/config/env.validation.ts`

## Verification
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npx tsc --noEmit` ✅
