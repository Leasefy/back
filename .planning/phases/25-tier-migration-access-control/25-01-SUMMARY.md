---
phase: 25-tier-migration-access-control
plan: 01
subsystem: database
tags: [prisma, postgresql, enum, migration, subscriptions]

# Dependency graph
requires:
  - phase: 12-subscriptions-plans
    provides: SubscriptionPlan enum and SubscriptionPlanConfig table with FREE/PRO/BUSINESS values

provides:
  - PostgreSQL migration renaming SubscriptionPlan enum values FREE->STARTER, BUSINESS->FLEX
  - Updated Prisma schema with STARTER/PRO/FLEX and @default(STARTER)
  - TypeScript enum SubscriptionPlan with STARTER/PRO/FLEX values
  - Updated seed data with new tier names and Landlord PRO pricing ($149,000/mo)
  - New FLEX plan in seed: pay-per-use, credits-based, no monthly fee

affects: [26-agent-credits-system, 27-unified-evaluation-endpoint, 28-flex-billing, PlanEnforcementService, subscriptions.service]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ALTER TYPE ... RENAME VALUE for non-destructive enum renames in PostgreSQL (avoids DROP/RECREATE)"

key-files:
  created:
    - prisma/migrations/20260403000000_rename_subscription_plan_enum/migration.sql
  modified:
    - prisma/schema.prisma
    - src/common/enums/subscription-plan.enum.ts
    - prisma/seed-plans.ts
    - src/subscriptions/services/subscriptions.service.ts
    - src/ai/ai.controller.ts

key-decisions:
  - "Used ALTER TYPE RENAME VALUE (non-destructive) instead of DROP+RECREATE enum to preserve existing data"
  - "FLEX tier: $0/mo subscription, credits-based. Landlord PRO: $149,000/mo unlimited properties"
  - "Seed removes tenant BUSINESS plan (it didn't exist), adds LANDLORD FLEX as new row"

patterns-established:
  - "Enum rename pattern: ALTER TYPE ... RENAME VALUE + reset column DEFAULT separately"

# Metrics
duration: 25min
completed: 2026-04-03
---

# Phase 25 Plan 01: Tier Migration Summary

**PostgreSQL enum rename FREE->STARTER and BUSINESS->FLEX via ALTER TYPE RENAME VALUE, with updated Prisma schema, TypeScript enum, and seed data introducing the FLEX pay-per-use tier at $0/mo**

## Performance

- **Duration:** ~25 min
- **Started:** 2026-04-03T10:00:00Z
- **Completed:** 2026-04-03T10:25:00Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Non-destructive PostgreSQL migration using `ALTER TYPE "SubscriptionPlan" RENAME VALUE` — existing user rows retain their tier without any UPDATE sweep
- Prisma schema updated with STARTER/PRO/FLEX enum and `@default(STARTER)` on User model; Prisma client regenerated
- TypeScript enum updated with tier descriptions clarifying STARTER (free base), PRO (paid subscription), FLEX (credits-based pay-per-use)
- Seed data updated: Landlord STARTER replaces Landlord FREE, Landlord PRO drops from $149,900 to $149,000 with unlimited properties, new LANDLORD FLEX tier added ($0/mo)
- Notification templates updated to say "Starter" instead of "gratuito/free"

## Task Commits

Each task was committed atomically:

1. **Task 1: Create migration and update schema/TypeScript enum** - `2021f1a` (feat)
2. **Task 2: Update seed data with new tier names and pricing** - `42049e6` (feat)

**Plan metadata:** (to be committed with STATE.md update)

## Files Created/Modified

- `prisma/migrations/20260403000000_rename_subscription_plan_enum/migration.sql` - Raw SQL migration with ALTER TYPE RENAME VALUE
- `prisma/schema.prisma` - Updated enum definition (STARTER/PRO/FLEX) and @default(STARTER)
- `src/common/enums/subscription-plan.enum.ts` - TypeScript enum with STARTER/PRO/FLEX
- `prisma/seed-plans.ts` - Updated tier names and pricing; new FLEX plan
- `src/subscriptions/services/subscriptions.service.ts` - All SubscriptionPlan.FREE -> STARTER references
- `src/ai/ai.controller.ts` - tier check 'FREE' -> 'STARTER'

## Decisions Made

- Used `ALTER TYPE ... RENAME VALUE` over DROP+RECREATE to avoid data loss — PostgreSQL supports this since v10 and the Supabase cluster runs PG15
- FLEX tier set at $0 monthly price — billing is handled via credits (Phase 26), not subscriptions
- Landlord PRO changed from $149,900 + max 10 properties to $149,000 + unlimited properties per product spec

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed stale tier references in subscriptions.service.ts and ai.controller.ts**
- **Found during:** Task 1 (after updating enum)
- **Issue:** subscriptions.service.ts referenced `SubscriptionPlan.FREE` (7 occurrences) and ai.controller.ts checked `tier === 'FREE'` — would cause TypeScript errors and wrong runtime behavior
- **Fix:** Replaced all SubscriptionPlan.FREE with SubscriptionPlan.STARTER; updated AI controller check to 'STARTER' with updated error message mentioning PRO/FLEX
- **Files modified:** src/subscriptions/services/subscriptions.service.ts, src/ai/ai.controller.ts
- **Verification:** TypeScript compilation clean after changes
- **Committed in:** 2021f1a (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 stale reference bug)
**Impact on plan:** Required for TypeScript compilation correctness. No scope creep.

## Issues Encountered

- Database not reachable from WSL2 environment (port 5432 blocked). Migration SQL file was created and is ready to apply when running from a connected environment. The Prisma schema and client were updated, and TypeScript compilation verified clean. Run `npx prisma migrate deploy` when DB is accessible.

## User Setup Required

The migration needs to be applied to the database. Run when connected:

```bash
npx prisma migrate deploy
npx ts-node prisma/seed-plans.ts
```

This will:
1. Rename FREE->STARTER and BUSINESS->FLEX in the PostgreSQL enum
2. Upsert plan configs with new tier names and pricing

## Next Phase Readiness

- Enum migration SQL ready, schema and client updated — Phase 25 Plan 02 can proceed (PlanEnforcementService update for STARTER/PRO/FLEX)
- All TypeScript references to FREE/BUSINESS replaced — no downstream compile errors
- FLEX plan seeded as $0 credits-based tier — Phase 26 (Agent Credits) can reference this

---
*Phase: 25-tier-migration-access-control*
*Completed: 2026-04-03*
