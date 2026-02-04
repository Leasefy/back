---
phase: 12-subscriptions-plans
plan: 01
subsystem: subscriptions
tags: [prisma, enums, models, seed, subscriptions, plans, billing]

dependency-graph:
  requires: []
  provides:
    - "SubscriptionPlanConfig model for admin-configurable plans"
    - "Subscription model for user subscription tracking"
    - "SubscriptionPayment model for PSE mock payment records"
    - "ScoringUsage model for monthly scoring view limits"
    - "PlanType, BillingCycle, SubscriptionStatus enums"
    - "Seed script with 5 default plan configurations"
  affects:
    - "12-02 (subscription service, enforcement)"
    - "12-03 (subscription endpoints)"
    - "12-04 (admin pricing endpoints)"

tech-stack:
  added: []
  patterns:
    - "Database-driven plan configuration (replaces hardcoded PLAN_LIMITS)"
    - "Upsert seed pattern for re-runnable seeding"
    - "PlanType enum for role-specific plan separation"

key-files:
  created:
    - "src/common/enums/subscription-status.enum.ts"
    - "src/common/enums/billing-cycle.enum.ts"
    - "src/common/enums/plan-type.enum.ts"
    - "prisma/seed-plans.ts"
  modified:
    - "prisma/schema.prisma"
    - "src/common/enums/subscription-plan.enum.ts"
    - "src/common/enums/index.ts"
    - "package.json"

decisions:
  - id: "12-01-01"
    decision: "Database-driven plan limits replace hardcoded PLAN_LIMITS"
    rationale: "Admin can modify prices without code deployment"
  - id: "12-01-02"
    decision: "Separate PlanType enum (TENANT/LANDLORD) with unique compound key"
    rationale: "Different plans for different roles with one config per role+tier combo"
  - id: "12-01-03"
    decision: "ScoringUsage tracks per-month usage with micropayment field"
    rationale: "Tenant Free tier has limited views per month, extra views via micropayment"
  - id: "12-01-04"
    decision: "Annual pricing at ~80% of monthly*12"
    rationale: "Standard SaaS incentive - approximately 2 months free"
  - id: "12-01-05"
    decision: "Keep SubscriptionPlan enum on User model for tier tracking"
    rationale: "Backward compatibility with existing code while new models hold detailed config"

metrics:
  duration: "~8 minutes"
  completed: "2026-02-04"
---

# Phase 12 Plan 01: Subscription Data Models & Seed Summary

**One-liner:** Prisma models for subscription plans, user subscriptions, payments, and scoring usage with 5 seeded plan configs for tenant/landlord roles.

## What Was Done

### Task 1: Add subscription enums and models to Prisma schema
- Added 3 new Prisma enums: `PlanType` (TENANT/LANDLORD), `BillingCycle` (MONTHLY/ANNUAL), `SubscriptionStatus` (TRIAL/ACTIVE/PAST_DUE/CANCELLED/EXPIRED)
- Added 4 new models:
  - **SubscriptionPlanConfig**: Admin-configurable plan definitions with pricing, limits, and feature flags. Unique compound key `[planType, tier]` ensures one config per role+tier combo.
  - **Subscription**: Tracks user's active subscription with status lifecycle, billing cycle, trial dates, cancellation tracking, and auto-renew flag.
  - **SubscriptionPayment**: Payment records for subscriptions via PSE mock, with period tracking.
  - **ScoringUsage**: Monthly scoring view usage tracking per user with micropayment counts.
- Updated `SubscriptionPlan` enum comments to clarify it represents tier level
- Created TypeScript enum mirrors: `SubscriptionStatus`, `BillingCycle`, `PlanType`
- Removed hardcoded `PLAN_LIMITS` constant (limits now database-driven)
- Updated `index.ts` exports

### Task 2: Create seed script for default subscription plans
- Created `prisma/seed-plans.ts` with 5 default plan configurations:
  - Tenant Free: $0, 1 scoring view/mo, micropay at $9,900 COP per extra view
  - Tenant Pro: $49,900/mo ($479,000/yr), unlimited premium scoring
  - Landlord Free: $0, 1 property, basic scoring
  - Landlord Pro: $149,900/mo ($1,439,000/yr), 10 properties, premium scoring
  - Landlord Business: $499,900/mo ($4,799,000/yr), unlimited properties, API access
- Uses upsert pattern for safe re-running (updates prices if already seeded)
- Added `seed:plans` npm script

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Result |
|-------|--------|
| `npx prisma validate` | Pass |
| `npx tsc --noEmit` | Pass |
| PLAN_LIMITS references in src/ | 0 (removed) |
| Schema models count | 4 new models present |
| Schema enums count | 3 new enums present |
| TypeScript enum files | 3 created, match Prisma |
| Seed script plans | 5 plans (2 tenant + 3 landlord) |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `3363a2a` | Add subscription enums and models to Prisma schema |
| 2 | `9353ca9` | Create seed script for default subscription plans |

## Next Phase Readiness

Plan 12-02 can proceed to build subscription services and enforcement logic on top of these models. The database schema and seed data provide the complete data foundation.

**Pending user action:** Run `npx prisma db push` to sync new models to database, then `npm run seed:plans` to seed default plan configs.
