---
phase: 26-agent-credits-system
plan: 01
status: completed
completed_at: "2026-04-04"
---

# Plan 26-01 Summary: Database Foundation for Agent Credits

## What Was Done
- Added `AgentCreditTransactionType` enum (PURCHASE, DEDUCTION)
- Added `AgentCredit` model (one-per-user wallet with atomic balance)
- Added `AgentCreditTransaction` model (append-only ledger)
- Added User back-relations: `agentCredit` and `agentCreditTransactions`
- Added `evaluationCreditPrice` field to `SubscriptionPlanConfig`
- Created migration `20260404000000_add_agent_credits`
- Updated seed data with evaluation pricing per tier

## Evaluation Credit Pricing (seed)
| Plan Type | Tier | evaluationCreditPrice (COP) |
|-----------|------|-----------------------------|
| TENANT | STARTER | 0 |
| TENANT | PRO | 0 |
| LANDLORD | STARTER | 42,000 |
| LANDLORD | PRO | 21,000 |
| LANDLORD | FLEX | 0 |

## Files Modified
- `prisma/schema.prisma` — new enum, 2 models, User relations, SubscriptionPlanConfig field
- `prisma/migrations/20260404000000_add_agent_credits/migration.sql` — manual migration
- `prisma/seed-plans.ts` — evaluationCreditPrice in all plan configs

## Verification
- `npx prisma validate` ✅
- `npx prisma generate` ✅
- `npx tsc --noEmit` ✅
- Migration pending apply (DB unreachable — apply with `npx prisma migrate dev` when connected)

## Notes
- Migration created manually (DB not reachable). Apply when Supabase connection is available.
- AgentCreditTransaction relates to User only (not AgentCredit) to avoid dual-FK Prisma validation error.
