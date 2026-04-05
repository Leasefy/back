---
phase: 27-unified-evaluation-endpoint
plan: 02
status: completed
completed_at: "2026-04-04"
---

# Plan 27-02 Summary: AgentMicroClient

## What Was Done
- Created `AgentMicroClient` injectable service using Node 18+ built-in fetch
- `startEvaluation(payload)` — POST /tenant-scoring, returns { runId }, throws 503 on failure
- `pollResult(runId)` — GET /tenant-scoring/:runId, returns result or null (graceful)
- Created `TenantScoringPayload` interface matching Application model fields
- No new packages — zero dependencies added

## Files Created
- `src/evaluations/agent-micro.client.ts`
- `src/evaluations/dto/micro-payload.dto.ts`
- `src/evaluations/dto/index.ts`

## Verification
- `npx tsc --noEmit` ✅
