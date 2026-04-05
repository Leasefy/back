---
phase: 26-agent-credits-system
plan: 02
status: completed
completed_at: "2026-04-04"
---

# Plan 26-02 Summary: AgentCredits Module (Purchase, Balance, Deduction)

## What Was Done
- Created `AgentCreditsModule` with TenantPaymentsModule import, exports AgentCreditsService
- Created `AgentCreditsController` with two endpoints:
  - `GET /agent-credits/balance` — returns current credit balance (0 if no record)
  - `POST /agent-credits/purchase` — buy credit pack (1/5/10/20) via PSE mock
- Created `AgentCreditsService` with three methods:
  - `getBalance(userId)` — reads wallet or returns 0
  - `purchaseCredits(userId, dto)` — PSE payment + atomic balance increment + transaction log
  - `deductCredits(userId, amount, applicationId)` — atomic conditional decrement (Phase 27 ready)
- Created `BuyCreditsDto` with pack size validation and nested PSE payment data
- Created `CREDIT_PACK_PRICES` constants with bulk discounts
- Registered `AgentCreditsModule` in `AppModule`

## Credit Pack Pricing
| Pack Size | Price (COP) | Discount |
|-----------|-------------|----------|
| 1 | 42,000 | — |
| 5 | 189,000 | ~10% |
| 10 | 350,000 | ~17% |
| 20 | 630,000 | ~25% |

## Key Design Decisions
- `deductCredits` uses `updateMany` with `balance: { gte: amount }` for atomic double-spend prevention
- PSE payment follows same `as any` cast pattern as subscriptions module
- Optimistic credit grant on SUCCESS or PENDING (same as subscription pattern)

## Files Created
- `src/agent-credits/agent-credits.module.ts`
- `src/agent-credits/agent-credits.controller.ts`
- `src/agent-credits/agent-credits.service.ts`
- `src/agent-credits/dto/buy-credits.dto.ts`
- `src/agent-credits/dto/index.ts`
- `src/agent-credits/constants/credit-packs.ts`

## Files Modified
- `src/app.module.ts` — added AgentCreditsModule import

## Verification
- `npx tsc --noEmit` ✅
