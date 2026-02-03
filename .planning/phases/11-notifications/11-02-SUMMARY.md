---
phase: 11-notifications
plan: 02
subsystem: notifications
tags: [resend, firebase, fcm, email, push]
dependencies:
  requires: [11-01]
  provides: [email-service, push-service, notifications-module]
  affects: [11-03, 11-04]
tech-stack:
  added: [resend@6.9.1, firebase-admin@13.6.0, marked@17.0.1]
  patterns: [service-layer, graceful-degradation, external-api-integration]
key-files:
  created:
    - src/notifications/services/email.service.ts
    - src/notifications/services/push.service.ts
    - src/notifications/notifications.module.ts
    - src/notifications/services/index.ts
  modified:
    - package.json
    - src/config/env.validation.ts
    - src/users/users.service.ts
decisions:
  - id: resend-api
    choice: "Resend for email delivery"
    why: "Simple API, reliable delivery, good developer experience"
  - id: firebase-fcm
    choice: "Firebase Admin SDK for push notifications"
    why: "Industry standard, supports both Android and iOS"
  - id: graceful-init
    choice: "Graceful Firebase initialization failure"
    why: "App can start even if Firebase credentials missing, push will fail gracefully"
  - id: definite-assignment
    choice: "Use definite assignment operator for services"
    why: "TypeScript strict mode requires ! for properties initialized in onModuleInit"
metrics:
  duration: 7m
  completed: 2026-02-03
---

# Phase 11 Plan 02: External Services Setup Summary

Resend email + Firebase FCM push notification services configured with graceful error handling.

## What Was Built

### EmailService (src/notifications/services/email.service.ts)
- Resend API integration via `resend` npm package
- `send()` method returns `EmailResult` with success/failure status
- Automatic HTML to plain text conversion for email body fallback
- Configurable from address via `EMAIL_FROM_ADDRESS` env var

### PushService (src/notifications/services/push.service.ts)
- Firebase Admin SDK integration for FCM
- `send()` and `sendMultiple()` methods return `PushResult`
- Android and iOS platform-specific notification configs
- Invalid FCM token detection and graceful handling
- Graceful initialization - app starts even without valid credentials

### NotificationsModule (src/notifications/notifications.module.ts)
- Exports EmailService and PushService
- Ready for template/orchestration integration in Plan 03

### Environment Validation
Added required environment variables to `env.validation.ts`:
- `RESEND_API_KEY` - Resend API key for email delivery
- `EMAIL_FROM_ADDRESS` - Optional, defaults to notificaciones@arriendofacil.co
- `FIREBASE_PROJECT_ID` - Firebase project identifier
- `FIREBASE_PRIVATE_KEY` - Firebase service account private key
- `FIREBASE_CLIENT_EMAIL` - Firebase service account email

## Commits

| Commit | Type | Description |
|--------|------|-------------|
| 236bef0 | chore | Install dependencies and add env validation |
| 6a980fb | feat | Create EmailService with Resend API integration |
| 7c078ea | feat | Create PushService with Firebase FCM integration |
| 78e465f | feat | Create NotificationsModule with service exports |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Role enum type mismatch in UsersService**
- **Found during:** Task 1 (build verification)
- **Issue:** TypeScript strict mode flagged incompatible Role enum types between app enum and Prisma enum
- **Fix:** Added `Role as PrismaRole` import and cast in completeOnboarding method
- **Files modified:** src/users/users.service.ts
- **Commit:** 236bef0

**2. [Rule 1 - Bug] Fixed definite assignment for service properties**
- **Found during:** Task 2 (TypeScript compilation)
- **Issue:** Properties initialized in onModuleInit() not recognized by strict mode
- **Fix:** Added `!` definite assignment operator for resend and fromAddress
- **Files modified:** src/notifications/services/email.service.ts
- **Commit:** 6a980fb

**3. [Rule 1 - Bug] Fixed isolated modules type export**
- **Found during:** Task 4 (barrel file creation)
- **Issue:** Re-exporting types without `export type` violates isolatedModules
- **Fix:** Separated type exports from value exports
- **Files modified:** src/notifications/services/index.ts
- **Commit:** 78e465f

## API Reference

### EmailService

```typescript
interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Usage
const result = await emailService.send({
  to: 'user@example.com',
  subject: 'Welcome',
  html: '<p>Hello</p>'
});
```

### PushService

```typescript
interface PushPayload {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface PushResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Usage
const result = await pushService.send({
  token: 'fcm-device-token',
  title: 'New message',
  body: 'You have a new notification'
});
```

## Next Phase Readiness

**Blockers:** None

**User Setup Required:**
1. Create Resend account at https://resend.com/signup
2. Verify domain for email sending
3. Create Firebase project at https://console.firebase.google.com/
4. Enable Cloud Messaging in Firebase Console
5. Generate service account private key
6. Add environment variables to `.env`:
   - RESEND_API_KEY
   - FIREBASE_PROJECT_ID
   - FIREBASE_PRIVATE_KEY
   - FIREBASE_CLIENT_EMAIL

**Ready for:** Plan 03 - Notification orchestration and templates

---
*Generated: 2026-02-03*
