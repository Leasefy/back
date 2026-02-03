---
phase: 11-notifications
plan: 01
subsystem: notifications
tags: [prisma, enums, database, admin-role, notification-templates]
dependency-graph:
  requires: []
  provides:
    - ADMIN role in Role enum
    - NotificationChannel enum (EMAIL, PUSH)
    - NotificationStatus enum (PENDING, SENT, FAILED)
    - User notification preferences (emailNotificationsEnabled, pushNotificationsEnabled, fcmToken)
    - NotificationTemplate model for admin-managed templates
    - NotificationLog model for delivery tracking
  affects:
    - 11-02 (notification services)
    - 11-03 (template CRUD)
    - 11-04 (email/push integration)
tech-stack:
  added: []
  patterns:
    - Prisma enums mirror TypeScript enums
    - Notification preferences as User model fields
    - Template-based notification system
key-files:
  created:
    - src/common/enums/notification-channel.enum.ts
    - src/common/enums/notification-status.enum.ts
  modified:
    - src/common/enums/role.enum.ts
    - src/common/enums/index.ts
    - prisma/schema.prisma
decisions:
  - id: admin-role
    choice: Add ADMIN to Role enum
    rationale: System administrators need dedicated role for template management
  - id: dual-channel
    choice: NotificationChannel enum with EMAIL and PUSH
    rationale: All notifications sent via both channels simultaneously
  - id: delivery-status
    choice: NotificationStatus enum with PENDING, SENT, FAILED
    rationale: Track delivery state for debugging and retry logic
  - id: user-preferences
    choice: Global toggle fields on User model
    rationale: Simple approach - users can disable email or push globally
  - id: fcm-token
    choice: Store FCM device token on User model
    rationale: Firebase Cloud Messaging requires device token for push notifications
metrics:
  duration: ~5 minutes
  completed: 2026-02-03
---

# Phase 11 Plan 01: Notification Data Models Summary

Database models and enums for the notifications system - ADMIN role, user preferences, templates, and logs.

## What Was Built

### 1. Notification Enums (TypeScript + Prisma)

**NotificationChannel** - Delivery channel for notifications:
- `EMAIL` - Email via Resend
- `PUSH` - Push via Firebase Cloud Messaging

**NotificationStatus** - Delivery tracking state:
- `PENDING` - Queued for delivery
- `SENT` - Successfully delivered
- `FAILED` - Delivery failed (with error message)

### 2. ADMIN Role

Added `ADMIN` to the existing Role enum:
- System administrators only
- Can manage notification templates
- Cannot be TENANT or LANDLORD (exclusive role)

### 3. User Notification Preferences

Added to User model:
- `emailNotificationsEnabled` - Boolean, default true
- `pushNotificationsEnabled` - Boolean, default true
- `fcmToken` - Optional Firebase device token for push delivery

### 4. NotificationTemplate Model

Admin-managed templates for all 19 notification events:

```prisma
model NotificationTemplate {
  id            String   @id @default(uuid())
  code          String   @unique  // e.g., "APPLICATION_RECEIVED"
  name          String             // Human-readable name
  description   String?            // Admin notes

  // Email (Markdown converted to HTML at send time)
  emailSubject  String
  emailBody     String   // Markdown content

  // Push notification
  pushTitle     String
  pushBody      String

  isActive      Boolean  @default(true)
  createdAt     DateTime
  updatedAt     DateTime
}
```

### 5. NotificationLog Model

Audit trail for sent notifications:

```prisma
model NotificationLog {
  id           String              @id @default(uuid())
  userId       String              // Recipient
  templateCode String              // Which template was used
  channel      NotificationChannel // EMAIL or PUSH
  status       NotificationStatus  // PENDING, SENT, FAILED

  recipient    String              // Email address or FCM token
  subject      String?             // For email only
  errorMessage String?             // If failed

  sentAt       DateTime?
  createdAt    DateTime

  user         User                // Relation to recipient
}
```

Indexed on: userId, templateCode, status, createdAt for efficient querying.

## Files Changed

| File | Change |
|------|--------|
| `src/common/enums/notification-channel.enum.ts` | Created - NotificationChannel enum |
| `src/common/enums/notification-status.enum.ts` | Created - NotificationStatus enum |
| `src/common/enums/role.enum.ts` | Added ADMIN value |
| `src/common/enums/index.ts` | Export new enums |
| `prisma/schema.prisma` | All enum and model additions |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- TypeScript compiles without errors
- Prisma schema validates successfully
- Database tables created via `prisma db push`

## Next Phase Readiness

Ready for 11-02: Notification services implementation.

Prerequisites satisfied:
- ADMIN role available for template management guards
- User preferences fields exist for delivery filtering
- NotificationTemplate model ready for seeding
- NotificationLog model ready for delivery tracking
