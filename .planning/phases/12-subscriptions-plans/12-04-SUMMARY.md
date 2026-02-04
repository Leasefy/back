---
phase: 12-subscriptions-plans
plan: 04
subsystem: subscriptions
tags: [nestjs, enforcement, micropayment, cron, notifications, scoring]

dependency-graph:
  requires:
    - "12-02 (PlanEnforcementService, SubscriptionsService)"
    - "12-03 (SubscriptionsController for micropayment endpoint)"
  provides:
    - "Property publish enforcement in PropertiesService"
    - "Scoring view enforcement in ScoringController (premium vs basic)"
    - "Micropayment endpoint for extra scoring views"
    - "SubscriptionScheduler for trial/subscription expiry cron"
    - "Subscription notification templates (4 templates)"

key-files:
  created:
    - "src/subscriptions/dto/micropayment.dto.ts"
    - "src/subscriptions/scheduled/subscription-scheduler.ts"
  modified:
    - "src/properties/properties.module.ts"
    - "src/properties/properties.service.ts"
    - "src/scoring/scoring.module.ts"
    - "src/scoring/scoring.controller.ts"
    - "src/subscriptions/controllers/subscriptions.controller.ts"
    - "src/subscriptions/services/subscriptions.service.ts"
    - "src/subscriptions/subscriptions.module.ts"
    - "prisma/seed-plans.ts"

decisions:
  - id: "12-04-01"
    decision: "SubscriptionScheduler in subscriptions module, not notifications"
    rationale: "Avoids circular dependency - subscriptions -> notifications is one-directional"
  - id: "12-04-02"
    decision: "Premium scoring gate at ScoringController.getScore()"
    rationale: "Gate at VIEW point, not computation point - scoring engine always computes"
  - id: "12-04-03"
    decision: "MicropaymentDto extends PseSubscriptionPaymentDto"
    rationale: "Same PSE fields, just different usage context"

metrics:
  completed: "2026-02-04"
---

# Phase 12 Plan 04: Enforcement, Micropayment, Cron Summary

**One-liner:** Plan enforcement wired into Properties and Scoring modules, micropayment endpoint for extra scoring views, daily cron for trial/subscription expiry with auto-downgrade and notifications.

## What Was Done

### Task 1: Enforce Limits
**PropertiesService:**
- `create()` checks `canPublishProperty()` before creating with AVAILABLE/PENDING status
- `update()` checks limit when changing from DRAFT to AVAILABLE/PENDING
- ForbiddenException with Spanish message including current count and max allowed
- PropertiesModule imports SubscriptionsModule

**ScoringController:**
- `getScore()` checks `canViewScoring()` before returning score data
- Records scoring view after successful retrieval
- Premium vs basic response: basic hides drivers, flags, conditions
- ForbiddenException includes `canMicropay` and `micropayPrice` for client
- ScoringModule imports SubscriptionsModule

### Task 2: Micropayment, Cron, Notifications
**Micropayment:**
- `POST /subscriptions/micropayment/scoring-view` endpoint
- `purchaseScoringView()` in SubscriptionsService processes PSE payment
- Records paid view count on success

**SubscriptionScheduler:**
- `checkTrialExpiry()` at 9 AM Colombia: notify expiring trials, auto-expire past trials
- `checkSubscriptionExpiry()` at 8 AM Colombia: bulk expire overdue subscriptions
- `handleSingleExpiry()` added to SubscriptionsService

**Notification Templates (seeded):**
- TRIAL_EXPIRING, TRIAL_EXPIRED, SUBSCRIPTION_EXPIRED, SUBSCRIPTION_DOWNGRADED

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| PropertiesService checks canPublishProperty | Pass |
| ScoringController checks canViewScoring | Pass |
| Micropayment endpoint exists | Pass |
| SubscriptionScheduler has 2 @Cron methods | Pass |
| No circular dependency | Pass |
| Seed includes 4 notification templates | Pass |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1+2 | `38725a7` | Wire enforcement, micropayment, cron, and notifications |
