# Phase 25: Tier Migration & Access Control - Research

**Researched:** 2026-04-03
**Domain:** Prisma enum migration, NestJS access control guards, subscription tier restructuring
**Confidence:** HIGH

## Summary

Phase 25 has two independent workstreams: (1) rename the `SubscriptionPlan` enum from `FREE/PRO/BUSINESS` to `STARTER/PRO/FLEX`, and (2) restrict `GET /scoring/:applicationId` to tenant-only access. Both are surgical changes to existing code with minimal blast radius.

The enum rename is the highest-risk part of this phase. PostgreSQL does NOT support renaming enum values with a simple `ALTER TYPE ... RENAME VALUE` in Prisma migrations — the safe pattern is to add new values, migrate data, and drop old values within a single transaction using raw SQL. Since REQUIREMENTS.md explicitly states "No hay usuarios reales aun" (no real users), the migration can be a hard rename without a data migration step, but the pattern must still be correct for the migration file.

The access control change (ACCS-01) is a simple guard modification in `ScoringController.getScore()`: remove the landlord permission check so only the tenant owner can access `GET /scoring/:applicationId` directly. ACCS-02 (landlord sees scoring only through evaluacion) is implemented by this same change — landlords are blocked from direct access now, and Phase 27 will add the evaluation endpoint where scoring data is embedded in the response. ACCS-03 (evaluations require active subscription) is a future enforcement in Phase 27; Phase 25 only sets the foundation by ensuring the tier model is correct.

**Primary recommendation:** Execute the enum rename as a raw SQL migration (ALTER TYPE ... RENAME VALUE), update the TypeScript enum and all references atomically, then update seed data. The access control change is a 3-line modification to the scoring controller.

## Current State Analysis

### Enum Current State (code-verified)

**Prisma schema:** `prisma/schema.prisma` line 46-50
```
enum SubscriptionPlan {
  FREE
  PRO
  BUSINESS
}
```

**TypeScript enum:** `src/common/enums/subscription-plan.enum.ts`
```typescript
export enum SubscriptionPlan {
  FREE = 'FREE',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
}
```

**User model:** `subscriptionPlan SubscriptionPlan @default(FREE)`

**SubscriptionPlanConfig:** Uses `tier SubscriptionPlan` field.

### Files That Reference SubscriptionPlan Enum Values

All files that need updating when enum values change (verified by grep):

| File | What Changes |
|------|-------------|
| `prisma/schema.prisma` | Enum definition: FREE→STARTER, BUSINESS→FLEX |
| `src/common/enums/subscription-plan.enum.ts` | TypeScript enum values |
| `src/subscriptions/services/subscriptions.service.ts` | `SubscriptionPlan.FREE` references (7 occurrences) |
| `prisma/seed-plans.ts` | Tier names in seed data (FREE/PRO/BUSINESS) + pricing |
| New Prisma migration SQL | Raw SQL to rename enum values |

**Note:** `SubscriptionPlan.PRO` stays unchanged — only FREE→STARTER and BUSINESS→FLEX.

### Current Scoring Controller Access Control (code-verified)

`src/scoring/scoring.controller.ts` lines 204-241 — `getScore()` method currently allows:
- Tenant who owns the application (`application.tenantId === user.id`)
- Landlord who owns the property (`application.property.landlordId === user.id`)

ACCS-01 requires removing the landlord permission so only `isTenantOwner` grants access.

### Current Seed Data (to be replaced)

Current plans in `prisma/seed-plans.ts`:
- TENANT FREE: $0/mo, 1 scoring view/mo
- TENANT PRO: $49,900/mo, unlimited scoring
- LANDLORD FREE: $0/mo, 1 property
- LANDLORD PRO: $149,900/mo, 10 properties
- LANDLORD BUSINESS: $499,900/mo, unlimited properties

New plans required (TIER-03):
- STARTER (was FREE): $0/mo — all plan types
- PRO: $149,000/mo — updated price
- FLEX (was BUSINESS): $0/mo — billing by canon

### ACCS-03 Interpretation

ACCS-03 says "Evaluaciones protegidas por tier: requiere suscripcion activa (STARTER/PRO/FLEX)." 

This is preparation for Phase 27. In Phase 25, the work is: ensure `SubscriptionsService.getUserPlanConfig()` still falls back to STARTER (not throwing) for users without active subscriptions, so Phase 27's evaluation endpoint can check `hasActiveSubscription()` cleanly. STARTER at $0 means even free-tier users have an "active" subscription — Phase 27 will clarify whether "active" means any plan or specifically PRO/FLEX.

The current fallback in `SubscriptionsService.getUserPlanConfig()` returns a hardcoded FREE config object when the DB doesn't have subscription tables. After the migration, this fallback must return STARTER tier.

## Architecture Patterns

### Pattern 1: Prisma Enum Value Rename (Raw SQL Migration)

PostgreSQL supports renaming enum values via `ALTER TYPE ... RENAME VALUE` since PostgreSQL 10. Prisma does not auto-generate this — you write it manually in the migration file.

**The safe pattern for this project (no real users):**
```sql
-- Migration: rename SubscriptionPlan enum values
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'FREE' TO 'STARTER';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'BUSINESS' TO 'FLEX';
```

This is a non-destructive rename — no data migration needed because the column values are updated in-place by PostgreSQL.

**After running this migration**, Prisma's generated client will reflect the new enum values automatically on next `prisma generate`.

### Pattern 2: Prisma Migration Creation for Manual SQL

```bash
# Create empty migration (do NOT run prisma migrate dev -- it generates SQL automatically)
npx prisma migrate dev --name rename_subscription_plan_enum --create-only
# Then edit the generated migration.sql to add the ALTER TYPE statements
# Then apply:
npx prisma migrate dev
```

OR create migration file manually:
```bash
# Create migration directory with timestamp
mkdir prisma/migrations/20260403000000_rename_subscription_plan_enum
# Write migration.sql manually
# Then mark as applied:
npx prisma migrate resolve --applied 20260403000000_rename_subscription_plan_enum
```

The `--create-only` flag is the cleanest approach for this case.

### Pattern 3: Prisma Schema Enum Change

After the SQL migration renames the DB enum values, update `schema.prisma`:

```prisma
enum SubscriptionPlan {
  STARTER   // was FREE
  PRO       // unchanged
  FLEX      // was BUSINESS
}
```

Also update the User model default:
```prisma
subscriptionPlan   SubscriptionPlan @default(STARTER) @map("subscription_plan")
```

Then run `npx prisma generate` to regenerate the client.

### Pattern 4: TypeScript Enum Update

```typescript
// src/common/enums/subscription-plan.enum.ts
export enum SubscriptionPlan {
  STARTER = 'STARTER',  // was FREE
  PRO = 'PRO',          // unchanged
  FLEX = 'FLEX',        // was BUSINESS
}
```

All `SubscriptionPlan.FREE` references in `subscriptions.service.ts` become `SubscriptionPlan.STARTER`.

### Pattern 5: Scoring Controller Tenant-Only Restriction (ACCS-01)

Current check (allows landlord):
```typescript
const isTenantOwner = application.tenantId === user.id;
const isLandlord = application.property.landlordId === user.id;

if (!isTenantOwner && !isLandlord) {
  throw new ForbiddenException('...');
}
```

After change (tenant-only):
```typescript
if (application.tenantId !== user.id) {
  throw new ForbiddenException(
    'Solo el inquilino dueno de esta solicitud puede ver el scoring directamente.',
  );
}
```

**Important:** The `getExplanation()` endpoint on the same controller (line 144-187) also allows both tenant and landlord. ACCS-01 requirements only mention `GET /scoring/:applicationId` — the explanation endpoint is a separate judgment call. The requirements do NOT explicitly restrict the explanation endpoint, but ACCS-02's spirit suggests it should also be restricted. The planner should confirm whether the explanation endpoint also gets restricted.

### Pattern 6: Downgrade Fallback Update

In `subscriptions.service.ts`, all locations that reference `SubscriptionPlan.FREE` for downgrade/fallback must change to `SubscriptionPlan.STARTER`:

```typescript
// Line 105: fallback when no active subscription
return this.plansService.findByTypeAndTier(planType, SubscriptionPlan.STARTER);

// Line 119: hardcoded fallback object
tier: SubscriptionPlan.STARTER,

// Lines 591, 652: downgrade to base tier
subscriptionPlan: SubscriptionPlan.STARTER,

// Lines 261, 460: free plan check
if ((plan.tier as string) === SubscriptionPlan.STARTER || finalPrice === 0) {
```

### Recommended File Change Order

1. Create and apply DB migration (rename enum values in PostgreSQL)
2. Update `prisma/schema.prisma` (enum definition + User.subscriptionPlan default)
3. Run `npx prisma generate` (regenerate Prisma client)
4. Update `src/common/enums/subscription-plan.enum.ts`
5. Update all `SubscriptionPlan.FREE` → `SubscriptionPlan.STARTER` in `subscriptions.service.ts`
6. Update `prisma/seed-plans.ts` (rename tiers + update pricing)
7. Modify `src/scoring/scoring.controller.ts` to tenant-only (ACCS-01)
8. Run seed: `npx ts-node prisma/seed-plans.ts`

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Enum value rename | Custom migration script | Raw SQL `ALTER TYPE ... RENAME VALUE` | PostgreSQL handles it in-place, no data migration needed |
| Access check | Custom middleware | Inline check in controller method | Already established pattern in this codebase |
| Subscription tier check | New guard class | Extend `PlanEnforcementService` or inline check | Existing service already has `getUserPlanConfig()` |

**Key insight:** PostgreSQL's `ALTER TYPE ... RENAME VALUE` is an atomic rename — it updates all column values in every table that uses the enum type simultaneously. No manual `UPDATE` queries needed.

## Common Pitfalls

### Pitfall 1: Prisma Auto-Generating Wrong Migration SQL
**What goes wrong:** Running `npx prisma migrate dev` directly when enum values have changed in schema.prisma — Prisma may generate `DROP TYPE` + `CREATE TYPE` instead of `RENAME VALUE`, which destroys data.
**Why it happens:** Prisma doesn't always detect renames vs. add/remove. It may see FREE missing and STARTER new, and generate a destructive migration.
**How to avoid:** Use `--create-only` flag, then manually write the `ALTER TYPE ... RENAME VALUE` SQL before applying.
**Warning signs:** Generated migration SQL contains `DROP TYPE "SubscriptionPlan"` — abort immediately.

### Pitfall 2: Enum Default Value Not Updated in Schema
**What goes wrong:** `subscriptionPlan SubscriptionPlan @default(FREE)` still references `FREE` after rename, causing Prisma client validation errors.
**Why it happens:** The default value in the model field isn't automatically updated when you rename the enum value.
**How to avoid:** Update the `@default(FREE)` to `@default(STARTER)` in schema.prisma when renaming.

### Pitfall 3: Seed Data Uses Old Tier String Literals
**What goes wrong:** `prisma/seed-plans.ts` uses string literals `'FREE' as const` and `'BUSINESS' as const` — these break after enum rename.
**Why it happens:** TypeScript type literals don't get renamed by find-replace if you miss one.
**How to avoid:** In the updated seed file, use `'STARTER' as const` and `'FLEX' as const`. Also update the `upsert where` clause — the unique constraint `planType_tier` will no longer match old `FREE`/`BUSINESS` records if the enum was renamed (they're now `STARTER`/`FLEX` in DB). The upsert will correctly update the existing records because the DB values are already renamed.

### Pitfall 4: Breaking the Explanation Endpoint
**What goes wrong:** Restricting `GET /scoring/:applicationId` to tenant-only but leaving `GET /scoring/:applicationId/explanation` still accessible to landlords — inconsistent access model.
**Why it happens:** ACCS-01 only explicitly mentions the main score endpoint.
**How to avoid:** Decide explicitly whether `getExplanation()` also needs the tenant-only restriction. Given ACCS-02's intent, both should probably be restricted identically. Confirm before implementation.

### Pitfall 5: Hardcoded Fallback Object Still Shows FREE
**What goes wrong:** The hardcoded fallback in `getUserPlanConfig()` at line 117-132 still shows `tier: SubscriptionPlan.FREE` after the TypeScript enum is updated. This compiles correctly (since FREE is no longer a valid value, it becomes a TS error), but can be missed in review.
**Why it happens:** The fallback is a defensive catch for DB connectivity issues — it's not exercised in normal flows.
**How to avoid:** Update the hardcoded object to use `SubscriptionPlan.STARTER`.

### Pitfall 6: ScoringUsage Table Becomes Irrelevant for Landlords
**What goes wrong:** `canViewScoring()` in `PlanEnforcementService` is currently called in `getScore()` for ALL users, including landlords. After the tenant-only restriction, this check only runs for tenants, which is correct. But if landlords previously had `ScoringUsage` records (they don't in this case), those would be orphaned.
**Why it happens:** The permission check runs before the role check currently.
**How to avoid:** In the new flow, the role check (tenant-only) runs first, then the plan enforcement check. No cleanup needed since there are no real users.

## Code Examples

### Enum Rename Migration SQL
```sql
-- prisma/migrations/20260403000000_rename_subscription_plan_enum/migration.sql
-- Rename SubscriptionPlan enum values to match new tier model
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'FREE' TO 'STARTER';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'BUSINESS' TO 'FLEX';
```

### Updated Scoring Controller (tenant-only)
```typescript
// src/scoring/scoring.controller.ts - getScore() method
async getScore(
  @CurrentUser() user: User,
  @Param('applicationId', ParseUUIDPipe) applicationId: string,
) {
  const application = await this.prisma.application.findUnique({
    where: { id: applicationId },
    include: { property: { select: { landlordId: true } } },
  });

  if (!application) {
    throw new NotFoundException('Application not found');
  }

  // ACCS-01: Only the tenant who owns this application can access scoring directly
  if (application.tenantId !== user.id) {
    throw new ForbiddenException(
      'Solo el inquilino dueno de esta solicitud puede ver el scoring. Los propietarios acceden al scoring a traves de la evaluacion.',
    );
  }

  // Plan enforcement: check scoring view limits (tenant-specific)
  const viewCheck = await this.planEnforcement.canViewScoring(user.id);
  if (!viewCheck.allowed) { ... }
  // ... rest of method unchanged
}
```

### Updated Seed Data Structure
```typescript
// prisma/seed-plans.ts - new tier names and pricing
const plans = [
  // TENANT plans (new model: STARTER free, PRO paid)
  {
    planType: 'TENANT' as const,
    tier: 'STARTER' as const,  // was FREE
    name: 'Tenant Starter',
    monthlyPrice: 0,
    // ... rest of config
  },
  {
    planType: 'TENANT' as const,
    tier: 'PRO' as const,
    name: 'Tenant Pro',
    monthlyPrice: 149000,  // updated from 49900
    // ...
  },
  // LANDLORD plans (new model: STARTER free, PRO paid, FLEX per-canon)
  {
    planType: 'LANDLORD' as const,
    tier: 'STARTER' as const,  // was FREE
    name: 'Landlord Starter',
    monthlyPrice: 0,
    // ...
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'PRO' as const,
    name: 'Landlord Pro',
    monthlyPrice: 149000,  // updated from 149900
    // ...
  },
  {
    planType: 'LANDLORD' as const,
    tier: 'FLEX' as const,  // was BUSINESS
    name: 'Landlord Flex',
    monthlyPrice: 0,  // billing by canon (FLEX billing), not monthly
    // ...
  },
];
```

### TypeScript Enum Update
```typescript
// src/common/enums/subscription-plan.enum.ts
export enum SubscriptionPlan {
  STARTER = 'STARTER',  // was FREE - $0/mo base tier
  PRO = 'PRO',          // unchanged - $149,000/mo
  FLEX = 'FLEX',        // was BUSINESS - $0/mo, billing by canon
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| FREE/PRO/BUSINESS tiers | STARTER/PRO/FLEX tiers | Phase 25 | Reflects FLEX billing model where FLEX is $0/mo with per-canon revenue |
| Scoring accessible to tenant AND landlord | Scoring direct access tenant-only | Phase 25 | Landlords must use evaluation endpoint (Phase 27) |

**Deprecated after this phase:**
- `SubscriptionPlan.FREE`: replaced by `SubscriptionPlan.STARTER`
- `SubscriptionPlan.BUSINESS`: replaced by `SubscriptionPlan.FLEX`
- Landlord access to `GET /scoring/:applicationId`: blocked, replaced by evaluation response

## Open Questions

1. **Should `GET /scoring/:applicationId/explanation` also be restricted to tenant-only?**
   - What we know: ACCS-01 explicitly names `GET /scoring/:applicationId`. The explanation endpoint uses identical landlord/tenant logic.
   - What's unclear: Whether restricting the explanation endpoint is in scope for Phase 25.
   - Recommendation: Restrict it too for consistency with ACCS-02's intent. The explanation is a superset of the score — if landlords can't see the score directly, they shouldn't see the explanation directly either.

2. **What are the STARTER plan limits for tenant vs landlord in Phase 25?**
   - What we know: TIER-03 says STARTER $0/mo for all. The current FREE plans have different limits (TENANT FREE: 1 scoring view/mo; LANDLORD FREE: 1 property).
   - What's unclear: Should the limits on STARTER exactly mirror the old FREE limits, or does the new tier model change them?
   - Recommendation: Keep limits identical to old FREE plans (just rename). Phase 27 will establish new per-evaluation pricing, which supersedes scoring view limits anyway.

3. **FLEX plan: what are the property/scoring limits?**
   - What we know: FLEX replaces BUSINESS ($0/mo, billing by canon). Old BUSINESS had unlimited properties and hasPremiumScoring=true.
   - What's unclear: Does FLEX inherit the same limits as BUSINESS?
   - Recommendation: Yes, FLEX keeps unlimited properties and premium scoring access. The billing model changes but the capability limits stay the same.

4. **Evaluaciones protegidas por tier (ACCS-03): does STARTER count as "active"?**
   - What we know: All three tiers (STARTER/PRO/FLEX) are valid. STARTER is $0.
   - What's unclear: Whether `getUserPlanConfig()` returning a STARTER config (no subscription row in DB) counts as "active subscription" for ACCS-03.
   - Recommendation: This is resolved in Phase 27. Phase 25 only needs the tier enum to be correct. Document the ambiguity for the Phase 27 planner.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `prisma/schema.prisma` — enum definition, model usage
- Direct codebase inspection: `src/common/enums/subscription-plan.enum.ts` — TypeScript enum
- Direct codebase inspection: `src/subscriptions/services/subscriptions.service.ts` — all SubscriptionPlan.FREE references
- Direct codebase inspection: `src/scoring/scoring.controller.ts` — current access control logic
- Direct codebase inspection: `prisma/seed-plans.ts` — current seed data
- Direct codebase inspection: `.planning/REQUIREMENTS.md` — requirements TIER-01 through ACCS-03

### Secondary (MEDIUM confidence)
- PostgreSQL docs: `ALTER TYPE ... RENAME VALUE` supported since PostgreSQL 10 (this project uses Prisma 7.x which targets PostgreSQL — confirmed by `@prisma/adapter-pg` in package.json)

### Tertiary (LOW confidence)
- Prisma migration behavior with enum renames: based on known Prisma patterns, not verified against Prisma 7.x changelog. The `--create-only` approach is the safe default regardless of version.

## Metadata

**Confidence breakdown:**
- Current state (existing code): HIGH — all files directly inspected
- Enum rename pattern (raw SQL): HIGH — PostgreSQL feature, well-established
- Prisma migration approach: MEDIUM — `--create-only` pattern is well-known but not verified against Prisma 7.x specifically
- Scoring controller change: HIGH — simple guard removal, pattern established in codebase
- Seed data structure: HIGH — directly inspected existing seed file

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain — Prisma and NestJS patterns are stable)
