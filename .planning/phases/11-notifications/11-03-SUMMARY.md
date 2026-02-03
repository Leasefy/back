---
phase: 11-notifications
plan: 03
subsystem: notifications
tags: [bullmq, templates, markdown, async-processing, notification-orchestration]
dependency-graph:
  requires: [11-01, 11-02]
  provides:
    - TemplateService for Markdown to HTML rendering
    - NotificationsService as main notification interface
    - NotificationsProcessor for async BullMQ processing
    - NotificationJobData DTO for queue jobs
  affects:
    - 11-04 (event listeners will use NotificationsService)
    - Future phases that need notifications
tech-stack:
  added: []
  patterns:
    - BullMQ queue for async notification processing
    - Template-based notification rendering
    - User preference filtering at send time
    - Audit logging for all notification attempts
key-files:
  created:
    - src/notifications/services/template.service.ts
    - src/notifications/services/notifications.service.ts
    - src/notifications/processors/notifications.processor.ts
    - src/notifications/dto/notification-job.dto.ts
    - src/notifications/dto/index.ts
    - src/notifications/processors/index.ts
  modified:
    - src/notifications/services/index.ts
    - src/notifications/notifications.module.ts
decisions:
  - id: markdown-templates
    choice: "Markdown email body converted to HTML at render time"
    rationale: "Easy editing for admins, consistent branding via email layout wrapper"
  - id: single-queue
    choice: "Single 'notifications' queue for all notification types"
    rationale: "Simpler architecture, adequate for MVP volume"
  - id: user-preference-check
    choice: "Check user preferences in processor, not service"
    rationale: "Job is already queued, processor can skip delivery channels gracefully"
  - id: retry-strategy
    choice: "2 attempts with exponential backoff (10s, 20s)"
    rationale: "Less aggressive than scoring - transient failures should resolve quickly"
metrics:
  duration: 4m
  completed: 2026-02-03
---

# Phase 11 Plan 03: Notification Orchestration Summary

Core notification system: template rendering, orchestration service, and BullMQ async processing.

## What Was Built

### 1. TemplateService (src/notifications/services/template.service.ts)

Handles notification template loading and rendering:
- Loads templates from database by code
- Substitutes `{{variables}}` with actual values
- Converts Markdown email body to HTML
- Wraps HTML in branded email layout

**Template Variables:**
| Variable | Description | Example |
|----------|-------------|---------|
| `{{userName}}` | Recipient's name | "Carlos Perez" |
| `{{userEmail}}` | Recipient's email | "carlos@email.com" |
| `{{propertyTitle}}` | Property title | "Apartamento en Chapinero" |
| `{{propertyAddress}}` | Property address | "Cra 7 #45-12" |
| `{{amount}}` | Formatted currency | "$1,500,000" |
| `{{date}}` | Formatted date | "15 de febrero, 2026" |
| `{{otherPartyName}}` | Other party name | "Juan Lopez" |

**Email Layout:**
- Branded header with Arriendo Facil logo
- Clean content area with template-rendered HTML
- Footer with unsubscribe note and copyright

### 2. NotificationJobData (src/notifications/dto/notification-job.dto.ts)

Queue job interface for BullMQ:
```typescript
interface NotificationJobData {
  userId: string;
  templateCode: string;
  variables: TemplateVariables;
  triggeredBy?: string;
}
```

### 3. NotificationsProcessor (src/notifications/processors/notifications.processor.ts)

BullMQ worker that processes notification jobs asynchronously:

**Workflow:**
1. Load user with preferences from database
2. Render template with variables (adds userName, userEmail automatically)
3. Send email via EmailService (if emailNotificationsEnabled)
4. Send push via PushService (if pushNotificationsEnabled and fcmToken exists)
5. Log all attempts to NotificationLog table

**Preference Handling:**
- Email skipped if `emailNotificationsEnabled = false`
- Push skipped if `pushNotificationsEnabled = false` OR `fcmToken = null`
- Logs created for both sent and skipped notifications

**Error Handling:**
- Template errors logged and job skipped gracefully
- Delivery errors logged but don't fail the job
- Failed jobs logged via @OnWorkerEvent('failed')

### 4. NotificationsService (src/notifications/services/notifications.service.ts)

Main interface for sending notifications:

```typescript
// Single user
await notificationsService.send({
  userId: landlordId,
  templateCode: 'APPLICATION_RECEIVED',
  variables: { propertyTitle, otherPartyName },
  triggeredBy: 'application-submission',
});

// Multiple users
await notificationsService.sendBulk(
  [landlordId, tenantId],
  'CONTRACT_COMPLETED',
  { propertyTitle, date },
);
```

**Features:**
- Generates unique job IDs: `notif-{templateCode}-{userId}-{timestamp}`
- 2 retry attempts with exponential backoff (10s, 20s)
- Logs job queuing for debugging

### 5. NotificationsModule Updates

Complete notification infrastructure:
- BullMQ 'notifications' queue registered
- All services wired: Email, Push, Template, Notifications
- NotificationsProcessor as queue consumer
- Exports NotificationsService as primary interface

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 7e2b2e7 | feat | Create TemplateService for notification rendering |
| a348613 | feat | Create notification job DTO and BullMQ processor |
| 5df2d06 | feat | Create NotificationsService and update module |

## Deviations from Plan

None - plan executed exactly as written.

## API Reference

### NotificationsService.send()

```typescript
send(data: {
  userId: string;
  templateCode: string;
  variables?: TemplateVariables;
  triggeredBy?: string;
}): Promise<string>  // Returns job ID
```

### NotificationsService.sendBulk()

```typescript
sendBulk(
  userIds: string[],
  templateCode: string,
  variables?: TemplateVariables,
  triggeredBy?: string,
): Promise<string[]>  // Returns array of job IDs
```

### TemplateService.render()

```typescript
render(
  code: string,
  variables: TemplateVariables
): Promise<RenderedTemplate>

interface RenderedTemplate {
  emailSubject: string;
  emailHtml: string;
  pushTitle: string;
  pushBody: string;
}
```

## Verification Results

- TypeScript compiles without errors
- Project builds successfully
- Module imports resolve correctly
- Queue registration syntax is valid

## Next Phase Readiness

**Blockers:** None

**Ready for:** Plan 04 - Event listeners to trigger notifications

Prerequisites satisfied:
- NotificationsService available for injection
- All 19 template codes can be used
- User preferences respected automatically
- NotificationLog audit trail in place

---
*Generated: 2026-02-03*
