---
phase: 25-tier-migration-access-control
verified: 2026-04-04T17:28:11Z
status: gaps_found
score: 5/6 must-haves verified
gaps:
  - truth: "El seed data refleja PRO $149,000/mes para TODOS los plan types (TENANT y LANDLORD)"
    status: failed
    reason: "Tenant PRO sigue con monthlyPrice: 49900 (linea 37 de prisma/seed-plans.ts). Solo Landlord PRO fue actualizado a 149000. El plan 25-01 tarea 2 indicaba explicitamente actualizar Tenant PRO de 49900 a 149000, y el criterio DONE confirmaba 'PRO $149,000 for all plan types'."
    artifacts:
      - path: "prisma/seed-plans.ts"
        issue: "TENANT PRO monthlyPrice es 49900, debe ser 149000. annualPrice es 479000, debe ser 1430000."
    missing:
      - "Actualizar seed-plans.ts: TENANT PRO monthlyPrice de 49900 a 149000"
      - "Actualizar seed-plans.ts: TENANT PRO annualPrice de 479000 a 1430000"
      - "Volver a ejecutar npx ts-node prisma/seed-plans.ts para aplicar el cambio a la DB"
  - truth: "Solicitar una evaluacion sin suscripcion activa devuelve error de autorizacion"
    status: failed
    reason: "No existe ningun endpoint de evaluacion en el codebase. El modulo /evaluations no existe. Segun RESEARCH.md esto es trabajo de Phase 27, pero el ROADMAP lo lista como success criterion #6 de Phase 25. Los planes 25-01/02/03 no incluyen esta implementacion."
    artifacts: []
    missing:
      - "Definir si el success criterion #6 del ROADMAP debe moverse a Phase 27 (donde se crea POST /evaluations), o si Phase 25 debe agregar un guard en algun endpoint existente de applications."
      - "Si es Phase 25 responsabilidad: crear guard de suscripcion activa en el endpoint que solicita evaluacion"
---

# Phase 25: Tier Migration & Access Control — Verification Report

**Phase Goal:** Los tiers de suscripcion reflejan el nuevo modelo STARTER/PRO/FLEX, con pricing actualizado y acceso al scoring restringido segun rol.
**Verified:** 2026-04-04T17:28:11Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | El enum SubscriptionPlan tiene STARTER/PRO/FLEX (no FREE/BUSINESS) | VERIFIED | `prisma/schema.prisma` lines 46-50; `src/common/enums/subscription-plan.enum.ts` exports STARTER/PRO/FLEX; migration SQL `ALTER TYPE RENAME VALUE 'FREE' TO 'STARTER'` and `'BUSINESS' TO 'FLEX'` exists |
| 2 | El seed data refleja STARTER $0/mes, PRO $149,000/mes, FLEX $0/mes | FAILED | Tenant PRO `monthlyPrice: 49900` (line 37 seed-plans.ts). Landlord PRO is correctly $149,000 but Tenant PRO was not updated. |
| 3 | Todos los endpoints de suscripciones usan los nuevos nombres de tier | VERIFIED | Zero references to `SubscriptionPlan.FREE`, `SubscriptionPlan.BUSINESS`, `'FREE'`, or `'BUSINESS'` in any non-test `.ts` file under `src/`. `getUserPlanConfig()` fallback returns `SubscriptionPlan.STARTER`. All downgrade flows use `SubscriptionPlan.STARTER`. |
| 4 | GET /scoring/:applicationId devuelve 403 para landlord/inmobiliaria | VERIFIED | `scoring.controller.ts` line 218: `if (application.tenantId !== user.id) throw new ForbiddenException(...)`. `isLandlord` variable removed. 6 unit tests in `scoring.controller.spec.ts` confirm allow/deny behavior. |
| 5 | Landlord/inmobiliaria solo accede scoring via evaluacion (no directamente) | VERIFIED | Both `getScore()` and `getExplanation()` in `scoring.controller.ts` enforce `application.tenantId !== user.id`. Error messages direct landlords to evaluation endpoint. `property: { select: { landlordId: true } }` include removed from both queries. |
| 6 | Solicitar una evaluacion sin suscripcion activa devuelve error de autorizacion | FAILED | No evaluation endpoint exists in the codebase. `/evaluations` module does not exist. RESEARCH.md explicitly deferred this to Phase 27, but ROADMAP lists it as a Phase 25 success criterion. |

**Score:** 4/6 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/migrations/20260403000000_rename_subscription_plan_enum/migration.sql` | Raw SQL to rename enum values | VERIFIED | EXISTS (12 lines). Contains `ALTER TYPE "SubscriptionPlan" RENAME VALUE 'FREE' TO 'STARTER'` and `'BUSINESS' TO 'FLEX'`. Also resets column DEFAULT to 'STARTER'. |
| `prisma/schema.prisma` | STARTER/PRO/FLEX enum, `@default(STARTER)` | VERIFIED | Lines 46-50: enum has STARTER/PRO/FLEX. Line 296: `@default(STARTER)`. No FREE or BUSINESS values. |
| `src/common/enums/subscription-plan.enum.ts` | TypeScript enum STARTER/PRO/FLEX | VERIFIED | 17 lines, exports `SubscriptionPlan` with STARTER/PRO/FLEX values and tier documentation. |
| `prisma/seed-plans.ts` | STARTER $0, PRO $149000, FLEX $0 | PARTIAL | Landlord STARTER ($0), Landlord PRO ($149,000), Landlord FLEX ($0) correct. TENANT PRO has `monthlyPrice: 49900` — should be 149000. |
| `src/subscriptions/services/subscriptions.service.ts` | All FREE references -> STARTER | VERIFIED | 6 occurrences of `SubscriptionPlan.STARTER`. Zero `SubscriptionPlan.FREE` or `SubscriptionPlan.BUSINESS`. |
| `src/ai/ai.controller.ts` | STARTER tier check, PRO o FLEX message | VERIFIED | Line 293: `planConfig.tier === 'STARTER'`. Line 295: error message says "PRO o FLEX". |
| `src/scoring/scoring.controller.ts` | Tenant-only access on both endpoints | VERIFIED | 289 lines. Both `getScore()` and `getExplanation()` use `application.tenantId !== user.id`. No `isLandlord`. |
| `src/scoring/scoring.controller.spec.ts` | Tests for ACCS-01/ACCS-02 | VERIFIED | 192 lines. 6 unit tests covering tenant allow, landlord deny, unrelated user deny, 404, and explanation scenarios. |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `prisma/schema.prisma` | `migration.sql` | Non-destructive rename applied before schema change | VERIFIED | Migration uses `ALTER TYPE RENAME VALUE` (safe, no DROP/RECREATE). Schema then declares the renamed values. |
| `src/common/enums/subscription-plan.enum.ts` | `prisma/schema.prisma` | TypeScript enum mirrors Prisma enum values | VERIFIED | Both have STARTER/PRO/FLEX. No divergence. |
| `subscriptions.service.ts` | SubscriptionPlan enum | All enum usages reference new values | VERIFIED | `SubscriptionPlan.STARTER` used in 6 locations: fallback (lines 105, 119), subscribe check (261), changePlan check (460), two downgrade flows (591, 652). |
| `scoring.controller.ts` | `prisma.application` | Query to check tenantId ownership | VERIFIED | Both methods call `prisma.application.findUnique({ where: { id: applicationId } })` then check `application.tenantId !== user.id`. |
| `scoring.controller.ts` | Error message | Message references "evaluacion" for landlords | VERIFIED | Line 220: "Los propietarios e inmobiliarias acceden al scoring a traves de la evaluacion." |

---

## Requirements Coverage

| Requirement | Status | Blocking Issue |
|-------------|--------|----------------|
| TIER-01: Admin puede ver los 3 tiers actualizados (STARTER/PRO/FLEX) | SATISFIED | Tiers exist in schema, seed data present with correct names |
| TIER-02: Enum migra de FREE/PRO/BUSINESS a STARTER/PRO/FLEX | SATISFIED | Migration SQL + schema + TypeScript enum all updated |
| TIER-03: Seed data actualiza pricing | BLOCKED | Tenant PRO still $49,900, not $149,000 |
| TIER-04: Endpoints existentes siguen funcionando | SATISFIED | Zero stale FREE/BUSINESS references in source; build passes; 39+ tests pass |
| ACCS-01: GET /scoring/:applicationId restringido solo a tenant | SATISFIED | `application.tenantId !== user.id` check in `getScore()` |
| ACCS-02: Landlord accede scoring solo via evaluacion | SATISFIED | Landlord blocked from both score and explanation endpoints directly |
| ACCS-03: Evaluaciones protegidas por tier | BLOCKED | Evaluation endpoint does not exist (Phase 27 work); deferred per RESEARCH.md but ROADMAP SC #6 expects it here |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `prisma/seed-plans.ts` | 37 | `monthlyPrice: 49900` for Tenant PRO | Blocker | Seed data inconsistent with ROADMAP success criterion. Database will have wrong pricing if seed is applied. |

No TODO/FIXME/placeholder stub patterns found in modified files.

---

## Human Verification Required

### 1. Migration Applied to Database

**Test:** Run `npx prisma migrate status` against the connected database.
**Expected:** Migration `20260403000000_rename_subscription_plan_enum` shows as applied. Querying `SELECT unnest(enum_range(NULL::"SubscriptionPlan"))` returns STARTER, PRO, FLEX (not FREE or BUSINESS).
**Why human:** Database not reachable from WSL2 environment per SUMMARY.md. Cannot verify migration was actually applied.

### 2. Seed Applied to Database

**Test:** Run `npx ts-node prisma/seed-plans.ts` and verify DB rows.
**Expected:** 5 plans upserted. Landlord PRO shows $149,000. (Note: Tenant PRO will show $49,900 which is the gap — this confirms gap #1 before fixing.)
**Why human:** Cannot query live database from verification environment.

### 3. Subscription Endpoints Runtime Behavior

**Test:** Call `GET /subscriptions/plans` and `GET /subscriptions/my-plan` with a valid token after migration is applied.
**Expected:** Plans are named Starter/Pro/Flex (not Free/Business). No 500 errors from enum mismatches.
**Why human:** Requires live database with migration applied and seed data loaded.

---

## Gaps Summary

Two gaps block full goal achievement:

**Gap 1 (TIER-03) — Tenant PRO pricing not updated.**
The PLAN explicitly instructed updating Tenant PRO `monthlyPrice` from 49900 to 149000 and `annualPrice` from 479000 to 1430000. The SUMMARY claims this was done, but `prisma/seed-plans.ts` line 37 still shows `monthlyPrice: 49900`. Only Landlord PRO was updated. The fix is a 2-line change in `seed-plans.ts` followed by re-running the seed against the database.

**Gap 2 (ACCS-03 / SC #6) — Evaluation subscription guard not implemented.**
Success criterion #6 ("Solicitar una evaluacion sin suscripcion activa devuelve error de autorizacion") requires an evaluation endpoint that doesn't exist until Phase 27. The RESEARCH.md acknowledges this is Phase 27 work. The gap is a ROADMAP inconsistency — either SC #6 should be moved to Phase 27's criteria, or Phase 25 needs to add the guard. This needs a human decision on scope.

Gap 1 is a concrete code fix. Gap 2 is either a scope clarification or a new implementation depending on intent.

---

_Verified: 2026-04-04T17:28:11Z_
_Verifier: Claude (gsd-verifier)_
