# Phase 4: Applications & Documents - Research

**Researched:** 2026-01-29
**Domain:** State machines, multi-step wizard persistence, document uploads
**Confidence:** HIGH

## Summary

Phase 4 implements the complete application submission flow with a 6-step wizard, document uploads, and state machine for application lifecycle. Research evaluated XState vs custom state machines vs NestJS-specific libraries, determining that a **custom lightweight state machine** is the best fit for this use case.

The application workflow has well-defined states (DRAFT -> SUBMITTED -> UNDER_REVIEW -> NEEDS_INFO -> PREAPPROVED -> APPROVED/REJECTED/WITHDRAWN) with simple transitions that don't require hierarchical states or parallel states. XState would be overkill; a custom implementation provides type safety, testability, and no external dependencies.

For document uploads, the existing Supabase Storage pattern from Phase 3 (property images) should be reused with a dedicated `application-documents` bucket. Signed URLs will be used for private document access (unlike public property images).

**Primary recommendation:** Implement a custom TypeScript state machine with enum-based states, guard functions for transitions, and event logging for audit trail. Use separate Prisma models for each wizard step to ensure data integrity and type safety.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 7.x | ORM with JSON fields | Already in use, handles wizard data |
| @supabase/supabase-js | 2.x | Storage uploads | Already configured with service key |
| class-validator | 0.14+ | DTO validation | NestJS standard |
| file-type | 19.x | Magic number MIME detection | Secure file validation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | 11.x | Generate document paths | Already available via Prisma |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom state machine | XState | XState is powerful but overkill for simple linear workflows; adds 50KB+ |
| Custom state machine | @depthlabs/nestjs-state-machine | Library approach but limited adoption (900 weekly downloads); custom gives full control |
| Separate models per step | Single JSON field | JSON loses type safety; separate models enable partial validation |

**Installation:**
```bash
npm install file-type
```

Note: Most dependencies already installed from previous phases.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── applications/
│   ├── applications.module.ts
│   ├── applications.controller.ts
│   ├── applications.service.ts
│   ├── dto/
│   │   ├── create-application.dto.ts
│   │   ├── personal-info.dto.ts
│   │   ├── employment-info.dto.ts
│   │   ├── income-info.dto.ts
│   │   ├── references.dto.ts
│   │   └── index.ts
│   ├── state-machine/
│   │   ├── application-state.ts          # Enum + transitions
│   │   ├── application-state-machine.ts  # Core logic
│   │   └── guards/                        # Transition guards
│   └── events/
│       └── application-event.service.ts  # Event logging
├── documents/
│   ├── documents.module.ts
│   ├── documents.controller.ts
│   ├── documents.service.ts
│   └── dto/
│       ├── upload-document.dto.ts
│       └── index.ts
└── common/
    └── enums/
        ├── application-status.ts
        └── document-type.ts
```

### Pattern 1: Enum-Based State Machine
**What:** Define states and valid transitions using TypeScript enums and a transition map
**When to use:** When states are finite, transitions are predictable, and you need type safety
**Example:**
```typescript
// Source: Custom implementation based on TypeScript best practices
export enum ApplicationStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  NEEDS_INFO = 'NEEDS_INFO',
  PREAPPROVED = 'PREAPPROVED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

// Define valid transitions as a map
const VALID_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.UNDER_REVIEW]: [
    ApplicationStatus.NEEDS_INFO,
    ApplicationStatus.PREAPPROVED,
    ApplicationStatus.APPROVED,
    ApplicationStatus.REJECTED,
  ],
  [ApplicationStatus.NEEDS_INFO]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN],
  [ApplicationStatus.PREAPPROVED]: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
  [ApplicationStatus.APPROVED]: [], // Terminal state
  [ApplicationStatus.REJECTED]: [], // Terminal state
  [ApplicationStatus.WITHDRAWN]: [], // Terminal state
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}
```

### Pattern 2: Wizard Step Persistence with Separate Fields
**What:** Store each wizard step's data in a separate JSON field rather than one combined field
**When to use:** When steps are validated independently and you need partial updates
**Example:**
```prisma
// Source: Prisma JSON field documentation + PROJECT.md data model
model Application {
  id              String            @id @default(uuid()) @db.Uuid
  propertyId      String            @map("property_id") @db.Uuid
  tenantId        String            @map("tenant_id") @db.Uuid
  status          ApplicationStatus @default(DRAFT)
  currentStep     Int               @default(1) @map("current_step")

  // Wizard steps as separate JSON fields
  personalInfo    Json?             @map("personal_info")    // Step 1
  employmentInfo  Json?             @map("employment_info")  // Step 2
  incomeInfo      Json?             @map("income_info")      // Step 3
  referencesInfo  Json?             @map("references_info")  // Step 4
  // Step 5: Documents (separate table)
  // Step 6: Review (no data, just submit)

  submittedAt     DateTime?         @map("submitted_at")
  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")

  // Relations
  property        Property          @relation(fields: [propertyId], references: [id])
  tenant          User              @relation(fields: [tenantId], references: [id])
  documents       ApplicationDocument[]
  events          ApplicationEvent[]
}
```

### Pattern 3: Event Sourcing Lite (Event Logging)
**What:** Log all state transitions to an events table for audit trail and timeline
**When to use:** When you need history/timeline of changes without full event sourcing complexity
**Example:**
```typescript
// Source: Event sourcing patterns simplified for audit logging
export enum ApplicationEventType {
  CREATED = 'CREATED',
  STEP_COMPLETED = 'STEP_COMPLETED',
  SUBMITTED = 'SUBMITTED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  INFO_REQUESTED = 'INFO_REQUESTED',
  INFO_PROVIDED = 'INFO_PROVIDED',
  DOCUMENT_UPLOADED = 'DOCUMENT_UPLOADED',
  WITHDRAWN = 'WITHDRAWN',
}

// Service method
async logEvent(
  applicationId: string,
  type: ApplicationEventType,
  actorId: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await this.prisma.applicationEvent.create({
    data: {
      applicationId,
      type,
      actorId,
      metadata: metadata ?? {},
    },
  });
}
```

### Anti-Patterns to Avoid
- **Single mega JSON field:** Don't store all wizard data in one field. Makes partial validation impossible and loses type safety.
- **String-based state checks:** Don't use `if (status === 'SUBMITTED')`. Use enums for compile-time safety.
- **Direct state mutation:** Don't update status without going through the state machine. Always validate transitions.
- **Public document URLs:** Unlike property images, application documents must use signed URLs with expiration.
- **Skipping MIME validation:** Don't trust file extensions. Always check magic numbers with `file-type`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MIME type detection | Extension checking | `file-type` library | Extensions can be spoofed; magic numbers are reliable |
| File upload handling | Custom multipart parser | Multer (NestJS built-in) | Handles streams, limits, temp files properly |
| UUID generation | Custom random strings | Prisma's @default(uuid()) | Cryptographically secure, standard format |
| Signed URL generation | Manual token creation | Supabase createSignedUrl() | Handles expiration, security, path encoding |

**Key insight:** File validation and storage have security implications. Use battle-tested libraries rather than custom implementations.

## Common Pitfalls

### Pitfall 1: Race Conditions in Wizard Updates
**What goes wrong:** Two requests update different wizard steps simultaneously, one overwrites the other
**Why it happens:** Fetch-modify-write pattern without locking
**How to avoid:** Use separate JSON fields per step; each step update only touches its own field
**Warning signs:** Lost data when user navigates quickly or has multiple tabs open

### Pitfall 2: Invalid State Transitions
**What goes wrong:** Application ends up in impossible state (e.g., DRAFT after APPROVED)
**Why it happens:** State updated directly without validation
**How to avoid:** Always route through state machine service that validates transitions
**Warning signs:** Database contains applications with status that shouldn't exist

### Pitfall 3: Documents Without Applications
**What goes wrong:** Orphaned documents in storage when application is deleted/abandoned
**Why it happens:** No cascade delete or cleanup job
**How to avoid:** Use Prisma onDelete: Cascade AND storage cleanup; implement abandoned application cleanup job
**Warning signs:** Storage usage grows unboundedly; orphaned files accumulate

### Pitfall 4: Trusting File Extensions
**What goes wrong:** User uploads executable as .pdf; system accepts it
**Why it happens:** Only checking file extension, not actual content
**How to avoid:** Use `file-type` library to check magic numbers from file buffer
**Warning signs:** Storage contains files that don't match their extension

### Pitfall 5: Public Document Access
**What goes wrong:** Anyone with URL can download sensitive tenant documents
**Why it happens:** Using public bucket or public URLs like property images
**How to avoid:** Use private bucket with signed URLs that expire (e.g., 1 hour)
**Warning signs:** Documents accessible without authentication

### Pitfall 6: Missing Event Actor
**What goes wrong:** Timeline shows events without knowing who performed them
**Why it happens:** Not capturing actorId when logging events
**How to avoid:** Always pass user ID to event logging; include both tenant and landlord actions
**Warning signs:** Events have null actorId; can't determine who did what

## Code Examples

Verified patterns for this implementation:

### State Machine Service
```typescript
// Source: Custom pattern based on TypeScript FSM best practices
import { Injectable, BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '../common/enums/application-status';

@Injectable()
export class ApplicationStateMachine {
  private readonly transitions: Record<ApplicationStatus, ApplicationStatus[]> = {
    [ApplicationStatus.DRAFT]: [ApplicationStatus.SUBMITTED, ApplicationStatus.WITHDRAWN],
    [ApplicationStatus.SUBMITTED]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN],
    [ApplicationStatus.UNDER_REVIEW]: [
      ApplicationStatus.NEEDS_INFO,
      ApplicationStatus.PREAPPROVED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ],
    [ApplicationStatus.NEEDS_INFO]: [ApplicationStatus.UNDER_REVIEW, ApplicationStatus.WITHDRAWN],
    [ApplicationStatus.PREAPPROVED]: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
    [ApplicationStatus.APPROVED]: [],
    [ApplicationStatus.REJECTED]: [],
    [ApplicationStatus.WITHDRAWN]: [],
  };

  canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
    return this.transitions[from]?.includes(to) ?? false;
  }

  getAvailableTransitions(current: ApplicationStatus): ApplicationStatus[] {
    return this.transitions[current] ?? [];
  }

  validateTransition(from: ApplicationStatus, to: ApplicationStatus): void {
    if (!this.canTransition(from, to)) {
      throw new BadRequestException(
        `Invalid transition from ${from} to ${to}. Valid transitions: ${this.getAvailableTransitions(from).join(', ') || 'none'}`,
      );
    }
  }
}
```

### Document Upload with MIME Validation
```typescript
// Source: NestJS file upload + file-type library patterns
import { fileTypeFromBuffer } from 'file-type';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

async validateFile(file: Express.Multer.File): Promise<void> {
  // Check magic number, not just extension
  const fileType = await fileTypeFromBuffer(file.buffer);

  if (!fileType || !ALLOWED_MIME_TYPES.includes(fileType.mime)) {
    throw new BadRequestException(
      `Invalid file type. Allowed: PDF, JPEG, PNG, WebP. Detected: ${fileType?.mime ?? 'unknown'}`,
    );
  }
}
```

### Signed URL Generation for Private Documents
```typescript
// Source: Supabase Storage documentation
async getDocumentUrl(document: ApplicationDocument): Promise<string> {
  const { data, error } = await this.supabase.storage
    .from('application-documents')
    .createSignedUrl(document.storagePath, 3600); // 1 hour expiry

  if (error) {
    throw new BadRequestException(`Failed to generate document URL: ${error.message}`);
  }

  return data.signedUrl;
}
```

### Wizard Step Update
```typescript
// Source: Prisma documentation + NestJS patterns
async updateStep(
  applicationId: string,
  tenantId: string,
  step: number,
  data: StepDto,
): Promise<Application> {
  const application = await this.findByIdOrThrow(applicationId);
  this.ensureOwnership(application, tenantId);
  this.ensureStatus(application, ApplicationStatus.DRAFT);

  // Map step to field name
  const fieldMap: Record<number, string> = {
    1: 'personalInfo',
    2: 'employmentInfo',
    3: 'incomeInfo',
    4: 'referencesInfo',
  };

  const field = fieldMap[step];
  if (!field) {
    throw new BadRequestException(`Invalid step: ${step}`);
  }

  return this.prisma.application.update({
    where: { id: applicationId },
    data: {
      [field]: data,
      currentStep: Math.max(application.currentStep, step),
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XState for all FSMs | XState for complex, custom for simple | XState v5 (2023) | XState v5 is heavier; simple cases better served by custom |
| Single JSON wizard field | Separate JSON per step | 2024 best practice | Better partial updates, cleaner validation |
| Extension-based file check | Magic number validation | Security evolution | Required for any file upload handling |
| Public document storage | Private + signed URLs | Always for sensitive docs | Standard for PII documents |

**Deprecated/outdated:**
- `multer` alone without validation: Always pair with `file-type` for security
- `XState v4`: If using XState, use v5 (requires TS 5.0+)

## Open Questions

Things that couldn't be fully resolved:

1. **Document size limits for Colombian documents**
   - What we know: Typical PDFs are 1-5MB, bank statements can be larger
   - What's unclear: Maximum practical size for cedulas, cartas laborales
   - Recommendation: Start with 10MB limit, monitor and adjust

2. **Abandoned application cleanup**
   - What we know: Applications in DRAFT with no activity should be cleaned up
   - What's unclear: How long to wait before cleanup (7 days? 30 days?)
   - Recommendation: Start with 30 days, implement background job in Phase 9 (Notifications/Jobs)

3. **Concurrent applications per property**
   - What we know: System should allow multiple tenants to apply
   - What's unclear: Should we limit concurrent applications? First-come-first-served?
   - Recommendation: Allow unlimited, landlord chooses from pool (defer to UX decision)

## Sources

### Primary (HIGH confidence)
- Prisma documentation - JSON fields, relations, enums
- Supabase Storage docs - Signed URLs, upload patterns
- NestJS documentation - File upload, validation pipes
- TypeScript patterns - Discriminated unions, enums

### Secondary (MEDIUM confidence)
- [NestJS State Machine library](https://github.com/tomaszfelczyk/nestjs-state-machine) - Patterns reference
- [XState documentation](https://stately.ai/docs/xstate) - When to use vs custom
- [file-type npm](https://www.npmjs.com/package/file-type) - MIME validation approach

### Tertiary (LOW confidence)
- Community patterns for multi-step wizards (needs validation in implementation)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries already in use or well-documented NestJS patterns
- Architecture: HIGH - Patterns proven in existing codebase (properties module)
- State machine: HIGH - Simple use case, custom implementation well-supported
- Pitfalls: MEDIUM - Based on research and common patterns, validate in implementation

**Research date:** 2026-01-29
**Valid until:** 2026-02-28 (30 days - stable domain, no fast-moving dependencies)
