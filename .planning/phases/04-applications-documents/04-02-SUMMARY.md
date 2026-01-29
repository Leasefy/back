---
phase: 04-applications-documents
plan: 02
subsystem: applications
tags: [state-machine, events, audit-trail, nestjs, typescript]

dependency_graph:
  requires: ["04-01"]
  provides: ["ApplicationStateMachine", "ApplicationEventService", "ApplicationsModule"]
  affects: ["04-03", "04-04"]

tech_stack:
  added: []
  patterns: ["state-machine", "event-sourcing-lite", "audit-trail"]

file_tracking:
  key_files:
    created:
      - src/applications/state-machine/application-state-machine.ts
      - src/applications/events/application-event.service.ts
      - src/applications/applications.module.ts
    modified: []

decisions:
  - id: "prisma-json-cast"
    description: "Cast metadata to Prisma.InputJsonValue for JSON field compatibility"
    rationale: "Prisma 7.x has strict JSON typing that requires explicit casts"

metrics:
  duration: "~10 minutes"
  completed: "2026-01-29"
---

# Phase 04 Plan 02: State Machine and Events Summary

State machine for application lifecycle with event sourcing for audit trail.

## What Was Built

### ApplicationStateMachine Service

Created `src/applications/state-machine/application-state-machine.ts` (81 lines):

- **transitions map**: Defines valid state transitions from each ApplicationStatus
- **canTransition()**: Returns boolean for transition validity
- **getAvailableTransitions()**: Returns array of valid next states
- **validateTransition()**: Throws BadRequestException if invalid
- **isTerminal()**: Returns true for APPROVED, REJECTED, WITHDRAWN

**State Flow:**
```
DRAFT -> SUBMITTED -> UNDER_REVIEW -> NEEDS_INFO -> UNDER_REVIEW (loop)
                   -> PREAPPROVED -> APPROVED (terminal)
                                  -> REJECTED (terminal)
Any non-terminal -> WITHDRAWN (terminal)
```

### ApplicationEventService

Created `src/applications/events/application-event.service.ts` (159 lines):

- **logEvent()**: Generic event logging with metadata
- **logCreated()**: Application creation
- **logStepCompleted()**: Wizard step completion with step number
- **logSubmitted()**: Application submission
- **logStatusChanged()**: Status change with from/to/reason
- **logInfoRequested()**: Landlord info request with message
- **logInfoProvided()**: Tenant info response
- **logDocumentUploaded()**: Document upload with type and ID
- **logDocumentDeleted()**: Document deletion
- **logWithdrawn()**: Application withdrawal with reason
- **getTimeline()**: Get all events ordered by createdAt with actor info

### ApplicationsModule

Created `src/applications/applications.module.ts` (9 lines):

- Registers both services as providers
- Exports both services for use by other modules
- Ready for controller and main service in plan 04-03

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Cast metadata to Prisma.InputJsonValue | Prisma 7.x strict JSON typing requires explicit type assertion |
| Terminal states have empty transition arrays | Clear pattern for identifying terminal states via isTerminal() |
| Event methods return ApplicationEvent | Enables chaining and immediate access to created event |
| getTimeline includes actor select | Provides user context (name, role) without full user object |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma JSON type incompatibility**

- **Found during:** Task 2
- **Issue:** `Record<string, unknown>` not assignable to Prisma's InputJsonValue type
- **Fix:** Added type assertion `(metadata ?? {}) as Prisma.InputJsonValue`
- **Files modified:** `src/applications/events/application-event.service.ts`
- **Commit:** 6e8fdca

## Commits

| Hash | Message |
|------|---------|
| d23af81 | feat(04-02): create ApplicationStateMachine service |
| 6e8fdca | feat(04-02): create ApplicationEventService for audit logging |
| c270da0 | feat(04-02): create ApplicationsModule with foundation services |

## Verification Results

- [x] TypeScript compiles without errors
- [x] Directory structure exists: src/applications/, state-machine/, events/
- [x] ApplicationStateMachine has 81 lines (min 40)
- [x] ApplicationEventService has 159 lines (min 30)
- [x] ApplicationStatus. pattern found in state machine
- [x] prisma.applicationEvent.create pattern found in event service

## Success Criteria Met

- [x] ApplicationStateMachine validates transitions according to defined flow
- [x] ApplicationStateMachine.canTransition returns true for valid, false for invalid
- [x] ApplicationStateMachine.validateTransition throws BadRequestException for invalid
- [x] ApplicationStateMachine.isTerminal returns true for APPROVED, REJECTED, WITHDRAWN
- [x] ApplicationEventService logs events with applicationId, type, actorId, metadata
- [x] ApplicationEventService.getTimeline returns events ordered by createdAt
- [x] ApplicationsModule exports both services
- [x] TypeScript compiles without errors

## Next Phase Readiness

**Ready for 04-03:** Main ApplicationService and Controller

The foundation services are in place:
- State machine validates all status transitions
- Event service logs all application lifecycle events
- Module exports services for use by main ApplicationService
