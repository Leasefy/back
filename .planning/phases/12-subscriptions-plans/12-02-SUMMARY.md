---
phase: 12-subscriptions-plans
plan: 02
subsystem: subscriptions
tags: [nestjs, services, subscriptions, enforcement, pse-mock, billing, plans]

dependency-graph:
  requires:
    - "12-01 (subscription data models, enums, seed script)"
  provides:
    - "SubscriptionPlansService for admin-configurable plan CRUD"
    - "SubscriptionsService for full subscription lifecycle"
    - "PlanEnforcementService for property/scoring limit checks"
    - "SubscriptionsModule wiring with TenantPaymentsModule and NotificationsModule"
    - "DTOs for create subscription, change plan, update pricing, PSE payment"
  affects:
    - "12-03 (subscription controller endpoints)"
    - "12-04 (admin pricing endpoints)"
    - "Properties module (can use PlanEnforcementService.canPublishProperty)"
    - "Scoring module (can use PlanEnforcementService.canViewScoring)"

tech-stack:
  added: []
  patterns:
    - "Prisma enum to app enum casting for type compatibility"
    - "PSE mock service reuse across modules via module exports"
    - "Plan enforcement as injectable service for cross-module consumption"
    - "Optimistic subscription creation for PENDING PSE payments"

key-files:
  created:
    - "src/subscriptions/dto/create-subscription.dto.ts"
    - "src/subscriptions/dto/change-plan.dto.ts"
    - "src/subscriptions/dto/update-plan-pricing.dto.ts"
    - "src/subscriptions/dto/subscription-payment.dto.ts"
    - "src/subscriptions/dto/index.ts"
    - "src/subscriptions/services/subscription-plans.service.ts"
    - "src/subscriptions/services/subscriptions.service.ts"
    - "src/subscriptions/services/plan-enforcement.service.ts"
    - "src/subscriptions/services/index.ts"
    - "src/subscriptions/subscriptions.module.ts"
  modified:
    - "src/tenant-payments/tenant-payments.module.ts"
    - "src/app.module.ts"

decisions:
  - id: "12-02-01"
    decision: "Cast Prisma SubscriptionPlan enum to app enum at call sites"
    rationale: "Same string values, TypeScript requires explicit cast between Prisma-generated and app enums"
  - id: "12-02-02"
    decision: "PseMockService reuse via TenantPaymentsModule export"
    rationale: "Avoid code duplication - same PSE mock logic for subscription and tenant payments"
  - id: "12-02-03"
    decision: "Optimistic ACTIVE status for PENDING PSE payments"
    rationale: "Better UX - subscription starts immediately, payment confirmation can be verified later"
  - id: "12-02-04"
    decision: "Keep first property (by createdAt) on downgrade"
    rationale: "Deterministic behavior - oldest property stays published, rest become DRAFT"
  - id: "12-02-05"
    decision: "PseSubscriptionPaymentDto as separate reusable DTO"
    rationale: "Used as nested object in both CreateSubscriptionDto and ChangePlanDto"

metrics:
  duration: "~5 minutes"
  completed: "2026-02-04"
---

# Phase 12 Plan 02: Core Subscription Services Summary

**One-liner:** Three subscription services (plans CRUD, lifecycle management, plan enforcement) with PSE mock payment integration, property limit checks, and scoring view tracking.

## What Was Done

### Task 1: Create DTOs for subscription operations
- **PseSubscriptionPaymentDto**: Reusable PSE payment fields (documentType, documentNumber, bankCode, holderName, phoneNumber) with Colombian-specific validation
- **CreateSubscriptionDto**: planId (UUID), cycle (MONTHLY/ANNUAL), optional nested PSE payment data for paid plans
- **ChangePlanDto**: newPlanId (UUID), cycle, optional PSE payment data for upgrades
- **UpdatePlanPricingDto**: All-optional partial update DTO for admin pricing changes (monthlyPrice, annualPrice, scoringViewPrice, maxProperties, maxScoringViews, hasPremiumScoring, hasApiAccess, name, description)
- Barrel export index.ts

### Task 2: Create services, module, and cross-module wiring
**SubscriptionPlansService:**
- `findAll(planType?)` - List active plans, optional TENANT/LANDLORD filter
- `findById(id)` - Get single plan, throws NotFoundException
- `findByTypeAndTier(planType, tier)` - Look up plan by compound key
- `updatePricing(id, dto)` - Admin partial update of plan config

**SubscriptionsService:**
- `getActiveSubscription(userId)` - Get current active/trial subscription with plan relation
- `getUserPlanConfig(userId)` - Get plan config or default to FREE based on user role
- `startTrial(userId, planId)` - Create 7-day trial, update user.subscriptionPlan
- `subscribe(userId, dto)` - Full subscribe flow with PSE mock payment for paid plans
- `cancel(userId, reason?)` - Mark CANCELLED, disable auto-renew, remains active until endDate
- `changePlan(userId, dto)` - Expire current, create new subscription with payment
- `handleExpiredSubscriptions()` - Cron-ready: expire overdue subscriptions, downgrade to FREE, hide excess landlord properties

**PlanEnforcementService:**
- `canPublishProperty(userId)` - Check landlord property count vs maxProperties limit
- `canViewScoring(userId)` - Check tenant scoring views vs monthly limit, micropay option
- `recordScoringView(userId)` - Upsert monthly usage increment
- `recordPaidScoringView(userId)` - Upsert paid view count increment
- `getUsageSummary(userId)` - Dashboard data: plan, properties used/limit, scoring views used/limit

**Module and cross-module changes:**
- SubscriptionsModule imports TenantPaymentsModule (for PseMockService) and NotificationsModule
- SubscriptionsModule exports all 3 services for consumption by other modules
- Added PseMockService to TenantPaymentsModule exports
- Registered SubscriptionsModule in AppModule

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Prisma enum to app enum type mismatch**
- **Found during:** Task 2
- **Issue:** `plan.tier` returns Prisma-generated `SubscriptionPlan` enum which TypeScript treats as incompatible with app's `SubscriptionPlan` enum despite identical string values
- **Fix:** Cast `plan.tier as SubscriptionPlan` at call sites and `(plan.tier as string) === SubscriptionPlan.FREE` for comparisons
- **Files modified:** `src/subscriptions/services/subscriptions.service.ts`
- **Commit:** `1945e07`

**2. [Rule 2 - Missing Critical] SubscriptionsModule registration in AppModule**
- **Found during:** Task 2
- **Issue:** Plan mentioned creating the module but did not explicitly state adding it to AppModule imports
- **Fix:** Added SubscriptionsModule import to app.module.ts so the module is actually loaded
- **Files modified:** `src/app.module.ts`
- **Commit:** `1945e07`

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| SubscriptionsModule imports TenantPaymentsModule | Pass |
| SubscriptionsModule imports NotificationsModule | Pass |
| All 3 services exported from module | Pass |
| PseMockService exported from TenantPaymentsModule | Pass |
| SubscriptionsModule registered in AppModule | Pass |
| subscribe() processes PSE payment for paid plans | Pass |
| handleExpiredSubscriptions() downgrades and hides properties | Pass |
| canPublishProperty() checks limits from plan config | Pass |
| canViewScoring() returns limits and micropay flag | Pass |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `4f2dcbf` | Create DTOs for subscription operations |
| 2 | `1945e07` | Create subscription services, enforcement, and module |

## Next Phase Readiness

Plan 12-03 can proceed to create subscription controllers (endpoints) that wire to these services. All service methods are ready:
- SubscriptionPlansService: public plan listing + admin pricing
- SubscriptionsService: subscribe, cancel, change plan, trial
- PlanEnforcementService: limit checks for properties and scoring
