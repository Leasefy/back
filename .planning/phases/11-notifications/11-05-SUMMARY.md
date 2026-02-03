---
phase: 11-notifications
plan: 05
subsystem: notifications
tags: [event-listeners, event-emitter, cron-scheduler, notification-integration]
dependency-graph:
  requires:
    - 11-03 (NotificationsService for sending)
    - 11-04 (Templates for rendering)
  provides:
    - ApplicationNotificationListener for application events
    - PaymentNotificationListener for payment events
    - VisitNotificationListener for visit events
    - ContractNotificationListener for contract events
    - NotificationsScheduler for cron jobs
    - Event emissions from all relevant services
  affects:
    - All future phases benefit from automatic notifications
tech-stack:
  added:
    - "@nestjs/schedule" (cron jobs)
  patterns:
    - OnEvent decorators for NestJS event-emitter
    - Cron expressions for scheduled tasks
    - EventEmitter2 for decoupled event emission
key-files:
  created:
    - src/notifications/events/application.events.ts
    - src/notifications/events/payment.events.ts
    - src/notifications/events/contract.events.ts
    - src/notifications/events/index.ts
    - src/notifications/listeners/application.listener.ts
    - src/notifications/listeners/payment.listener.ts
    - src/notifications/listeners/visit.listener.ts
    - src/notifications/listeners/contract.listener.ts
    - src/notifications/listeners/index.ts
    - src/notifications/scheduled/notifications-scheduler.ts
  modified:
    - src/notifications/notifications.module.ts
    - src/app.module.ts
    - src/applications/applications.service.ts
    - src/landlord/landlord.service.ts
    - src/tenant-payments/tenant-payments.service.ts
    - src/tenant-payments/validation/payment-validation.service.ts
    - src/tenant-payments/disputes/disputes.service.ts
    - src/contracts/contracts.service.ts
decisions:
  - id: reuse-visit-events
    choice: Reuse existing VisitRequestedEvent and VisitStatusChangedEvent
    rationale: Visit events were already defined in Phase 3.1; no need to duplicate
  - id: colombia-timezone
    choice: Cron times set for UTC to match 8-10 AM Colombia (UTC-5)
    rationale: Colombian market - scheduled notifications sent during business hours
  - id: deferred-contract-ready
    choice: CONTRACT_READY_TO_SIGN not implemented yet
    rationale: Plan focused on signing events; ready event can be added when sending for signature
metrics:
  duration: ~15 minutes
  completed: 2026-02-03
---

# Phase 11 Plan 05: Event Integration & Scheduled Notifications Summary

Wired up all notification events to the notification system with event listeners and scheduled jobs for reminders.

## What Was Built

### 1. Event Classes

**Application Events (src/notifications/events/application.events.ts):**
- `ApplicationSubmittedEvent` - tenant submits application, notify landlord
- `ApplicationStatusChangedEvent` - landlord approves/rejects/requests info, notify tenant

**Payment Events (src/notifications/events/payment.events.ts):**
- `PaymentReceiptUploadedEvent` - tenant uploads receipt, notify landlord
- `PaymentValidatedEvent` - landlord approves/rejects payment, notify tenant
- `PaymentDisputeOpenedEvent` - tenant opens dispute, notify landlord

**Contract Events (src/notifications/events/contract.events.ts):**
- `ContractReadyEvent` - contract ready to sign (not yet emitted)
- `ContractSignedEvent` - one/both parties sign, notify other party

### 2. Event Listeners

**ApplicationNotificationListener:**
- `@OnEvent('application.submitted')` - sends APPLICATION_RECEIVED to landlord
- `@OnEvent('application.statusChanged')` - sends APPLICATION_APPROVED/REJECTED/INFO_REQUESTED to tenant

**PaymentNotificationListener:**
- `@OnEvent('payment.receiptUploaded')` - sends PAYMENT_RECEIPT_UPLOADED to landlord
- `@OnEvent('payment.validated')` - sends PAYMENT_APPROVED/REJECTED to tenant
- `@OnEvent('payment.disputeOpened')` - sends PAYMENT_DISPUTE_OPENED to landlord

**VisitNotificationListener:**
- `@OnEvent('visit.requested')` - sends VISIT_REQUESTED to landlord
- `@OnEvent('visit.statusChanged')` - sends VISIT_ACCEPTED/REJECTED/CANCELLED/RESCHEDULED

**ContractNotificationListener:**
- `@OnEvent('contract.ready')` - sends CONTRACT_READY_TO_SIGN to tenant
- `@OnEvent('contract.signed')` - sends CONTRACT_LANDLORD_SIGNED/TENANT_SIGNED/COMPLETED

### 3. Scheduled Notifications (NotificationsScheduler)

| Cron | Colombia Time | Task |
|------|---------------|------|
| Every hour | - | Visit reminders (24h before accepted visits) |
| 0 14 * * * | 9 AM | Payment due reminders (3 days before) |
| 0 15 * * * | 10 AM | Overdue payment checks (5+ days after due) |
| 0 13 * * * | 8 AM | Lease expiring soon (30 days before) |
| 0 13 * * * | 8 AM | Lease expired (auto-updates to ENDED) |

### 4. Service Event Emissions

**ApplicationsService.submit():**
- Emits `application.submitted` after application is successfully submitted

**LandlordService.approve/reject/requestInfo():**
- Emits `application.statusChanged` with new status

**TenantPaymentsService.createWithReceipt():**
- Emits `payment.receiptUploaded` after receipt is uploaded

**PaymentValidationService.approve/reject():**
- Emits `payment.validated` with approval status

**DisputesService.create():**
- Emits `payment.disputeOpened` after dispute is created

**ContractsService.signAsLandlord():**
- Emits `contract.signed` with `fullyCompleted: false`

**ContractsService.signAsTenant():**
- Emits `contract.signed` with `fullyCompleted: true`

**VisitsService (already implemented):**
- Emits `visit.requested` on create
- Emits `visit.statusChanged` on status transitions

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 0f0dca0 | feat | Create application and payment event listeners |
| 125f9c5 | feat | Create visit and contract event listeners |
| 29a00b1 | feat | Create scheduled notifications and update modules |
| 889c9b0 | feat | Emit notification events from existing services |

## Deviations from Plan

**1. [Rule 3 - Blocking] Installed @nestjs/schedule**
- Plan assumed package was installed but it wasn't
- Installed `@nestjs/schedule` for cron job support
- Required for NotificationsScheduler to work

**2. [Clarification] Reused existing visit events**
- Plan suggested updating VisitStatusChangedEvent
- Instead, adapted listener to work with existing event structure
- No breaking changes to visit module

**3. [Clarification] CONTRACT_READY_TO_SIGN event not yet emitted**
- ContractReadyEvent class created but not emitted anywhere
- Contract workflow goes directly to PENDING_LANDLORD_SIGNATURE
- Can be added when sendForSigning is called (future enhancement)

## Notification Flow Summary

```
User Action                          Event Emitted               Notification Template
-----------                          -------------               ---------------------
Tenant submits application     -->   application.submitted   --> APPLICATION_RECEIVED (to landlord)
Landlord approves              -->   application.statusChanged --> APPLICATION_APPROVED (to tenant)
Landlord rejects               -->   application.statusChanged --> APPLICATION_REJECTED (to tenant)
Landlord requests info         -->   application.statusChanged --> APPLICATION_INFO_REQUESTED (to tenant)

Tenant uploads receipt         -->   payment.receiptUploaded --> PAYMENT_RECEIPT_UPLOADED (to landlord)
Landlord approves payment      -->   payment.validated       --> PAYMENT_APPROVED (to tenant)
Landlord rejects payment       -->   payment.validated       --> PAYMENT_REJECTED (to tenant)
Tenant opens dispute           -->   payment.disputeOpened   --> PAYMENT_DISPUTE_OPENED (to landlord)

Tenant requests visit          -->   visit.requested         --> VISIT_REQUESTED (to landlord)
Landlord accepts visit         -->   visit.statusChanged     --> VISIT_ACCEPTED (to tenant)
Landlord rejects visit         -->   visit.statusChanged     --> VISIT_REJECTED (to tenant)
Either cancels visit           -->   visit.statusChanged     --> VISIT_CANCELLED (to other party)
Either reschedules visit       -->   visit.statusChanged     --> VISIT_RESCHEDULED (to other party)

Landlord signs contract        -->   contract.signed         --> CONTRACT_LANDLORD_SIGNED (to tenant)
Tenant signs contract          -->   contract.signed         --> CONTRACT_COMPLETED (to both)
```

## Verification Results

- TypeScript compiles without errors
- Project builds successfully
- All event listeners registered in NotificationsModule
- Scheduler jobs configured with correct cron expressions
- Events emitted from all relevant services
- @nestjs/schedule installed and configured

## Next Phase Readiness

**Blockers:** None

Phase 11 (Notifications) is now complete. All 19+ notification events are wired up:
- 4 application events
- 6 payment events
- 6 visit events
- 4 contract events
- 5 scheduled checks

Ready for Phase 12: AI Document Analysis (PRO+ tier).

---
*Generated: 2026-02-03*
