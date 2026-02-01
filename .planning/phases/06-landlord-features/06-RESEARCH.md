# Phase 6: Landlord Features - Research

**Researched:** 2026-02-01
**Domain:** Landlord candidate management, application decisions, private notes
**Confidence:** HIGH

## Summary

Phase 6 implements the landlord's view of candidates - the ability to see all applicants for their properties, view their scores and documents, and make decisions (pre-approve, approve, reject, request info). The phase also adds private notes that only landlords can see.

The existing codebase already has most of the infrastructure:
- **ApplicationStateMachine** defines valid transitions including UNDER_REVIEW -> NEEDS_INFO, PREAPPROVED, APPROVED, REJECTED
- **ApplicationEventService** logs all status changes with actor and metadata
- **ScoringService.getScoreResult()** retrieves computed scores
- **DocumentsService.getSignedUrl()** provides secure document access (already checks landlord authorization)

The main work is creating landlord-specific endpoints that:
1. Query applications filtered by landlord's properties
2. Sort by risk score (RiskScoreResult.totalScore)
3. Execute status transitions with proper validation
4. Add a LandlordNote model for private notes

**Primary recommendation:** Create a `LandlordModule` with `LandlordService` and `LandlordController` that orchestrates the existing services. Add a new `LandlordNote` model for private notes. Reuse `ApplicationStateMachine`, `ApplicationEventService`, `ScoringService`, and `DocumentsService` - do NOT duplicate logic.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | 11.x | Controllers, services, decorators | Already in project |
| @prisma/client | 7.x | Database queries | Already in project |
| class-validator | 0.14.x | DTO validation | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/swagger | 11.x | API documentation | Endpoint documentation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| New LandlordModule | Extend ApplicationsModule | Separation of concerns - landlord actions are distinct from tenant actions |
| LandlordNote model | JSON field on Application | Notes are landlord-only data, separate model is cleaner |
| Query by property | Query by landlord | Already have Property.landlordId, natural join |

**No new installations required** - all dependencies already in project.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── landlord/
│   ├── landlord.module.ts         # Module definition
│   ├── landlord.controller.ts     # Landlord-facing endpoints
│   ├── landlord.service.ts        # Business logic orchestration
│   └── dto/
│       ├── index.ts
│       ├── preapprove-candidate.dto.ts
│       ├── approve-candidate.dto.ts
│       ├── reject-candidate.dto.ts
│       ├── request-info.dto.ts
│       ├── create-note.dto.ts
│       └── update-note.dto.ts
│
└── common/
    └── enums/
        └── application-event-type.enum.ts  # Add NOTE_ADDED, NOTE_UPDATED
```

### Pattern 1: Module Orchestration (Not Duplication)
**What:** LandlordService imports and uses existing services, doesn't duplicate logic
**When to use:** When business logic already exists in other modules
**Example:**
```typescript
// Source: NestJS module composition pattern
@Module({
  imports: [
    ApplicationsModule,  // Re-export ApplicationStateMachine, EventService
    ScoringModule,       // Re-export ScoringService
    DocumentsModule,     // Re-export DocumentsService
  ],
  controllers: [LandlordController],
  providers: [LandlordService],
})
export class LandlordModule {}

@Injectable()
export class LandlordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ApplicationStateMachine,
    private readonly eventService: ApplicationEventService,
    private readonly scoringService: ScoringService,
    private readonly documentsService: DocumentsService,
  ) {}

  // Uses stateMachine.validateTransition() - doesn't re-implement
  // Uses eventService.logStatusChanged() - doesn't re-implement
}
```

### Pattern 2: Property-Based Authorization
**What:** Verify landlord owns the property before allowing access to its applications
**When to use:** All landlord endpoints that access applications
**Example:**
```typescript
// Source: Existing pattern from DocumentsService.getSignedUrl()
private async verifyLandlordOwnership(
  applicationId: string,
  landlordId: string,
): Promise<Application> {
  const application = await this.prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      property: { select: { landlordId: true } },
    },
  });

  if (!application) {
    throw new NotFoundException(`Application not found`);
  }

  if (application.property.landlordId !== landlordId) {
    throw new ForbiddenException('You do not own this property');
  }

  return application;
}
```

### Pattern 3: Score-Based Sorting
**What:** Sort candidates by their risk score (higher is better)
**When to use:** Listing candidates for a property
**Example:**
```typescript
// Source: Prisma orderBy on relation
async getCandidates(propertyId: string, landlordId: string) {
  // Verify ownership first
  const property = await this.prisma.property.findUnique({
    where: { id: propertyId },
  });

  if (!property || property.landlordId !== landlordId) {
    throw new ForbiddenException('You do not own this property');
  }

  return this.prisma.application.findMany({
    where: {
      propertyId,
      status: {
        in: ['UNDER_REVIEW', 'NEEDS_INFO', 'PREAPPROVED'],
      },
    },
    include: {
      tenant: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      riskScore: true,  // Include score for display and sort
    },
    orderBy: {
      riskScore: { totalScore: 'desc' },  // Highest score first
    },
  });
}
```

### Pattern 4: Status Transition with Event Logging
**What:** Validate transition, update status, log event atomically
**When to use:** All status change actions (preapprove, approve, reject, request info)
**Example:**
```typescript
// Source: Existing pattern from ApplicationsService.submit()
async preapprove(
  applicationId: string,
  landlordId: string,
  dto: PreapproveCandidateDto,
): Promise<Application> {
  const application = await this.verifyLandlordOwnership(applicationId, landlordId);

  // Validate transition
  this.stateMachine.validateTransition(
    application.status as ApplicationStatus,
    ApplicationStatus.PREAPPROVED,
  );

  // Update status
  const updated = await this.prisma.application.update({
    where: { id: applicationId },
    data: { status: ApplicationStatus.PREAPPROVED },
    include: { property: true, riskScore: true },
  });

  // Log event
  await this.eventService.logStatusChanged(
    applicationId,
    landlordId,
    application.status as ApplicationStatus,
    ApplicationStatus.PREAPPROVED,
    dto.message,
  );

  return updated;
}
```

### Anti-Patterns to Avoid
- **Duplicating state machine logic:** Use ApplicationStateMachine.validateTransition(), don't re-implement
- **Duplicating event logging:** Use ApplicationEventService methods, don't create new logging
- **Direct database updates without validation:** Always validate transition before update
- **Exposing tenant-only fields to landlord:** Don't include sensitive personal data in candidate list
- **Skipping authorization checks:** Every endpoint MUST verify landlord ownership

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State validation | Custom if/else chains | ApplicationStateMachine.validateTransition() | Already handles all edge cases |
| Event logging | Direct insert | ApplicationEventService methods | Consistent event format |
| Document access | Direct URL | DocumentsService.getSignedUrl() | Already has authorization, signed URLs |
| Score retrieval | Direct query | ScoringService.getScoreResult() | Encapsulates score access |

**Key insight:** Phase 4 and 5 built reusable services. Phase 6 should compose them, not duplicate.

## Common Pitfalls

### Pitfall 1: Missing Authorization Check
**What goes wrong:** Landlord can access other landlords' applications
**Why it happens:** Forgot to verify property ownership
**How to avoid:** Every method must start with verifyLandlordOwnership()
**Warning signs:** Tests pass without ownership fixtures

### Pitfall 2: Invalid State Transition Allowed
**What goes wrong:** Can reject an already-approved application
**Why it happens:** Bypassed state machine validation
**How to avoid:** Always call stateMachine.validateTransition() before update
**Warning signs:** BadRequestException not thrown for invalid transitions

### Pitfall 3: Incomplete Event Logging
**What goes wrong:** Decision history incomplete, can't audit
**Why it happens:** Forgot to log event after status change
**How to avoid:** Every status change must call eventService.logStatusChanged()
**Warning signs:** Timeline missing entries

### Pitfall 4: Exposing Sensitive Tenant Data
**What goes wrong:** Landlord sees full cedula, bank details
**Why it happens:** Included full application JSON in response
**How to avoid:** Use select/omit to limit exposed fields
**Warning signs:** Full personalInfo JSON in response

### Pitfall 5: Missing Score for Sorting
**What goes wrong:** Applications without scores crash the sort
**Why it happens:** Score not yet computed (async), null handling missing
**How to avoid:** Filter to status >= UNDER_REVIEW, use nulls last sorting
**Warning signs:** TypeError: Cannot read property 'totalScore' of null

### Pitfall 6: Notes Visible to Tenant
**What goes wrong:** Tenant sees landlord's private notes
**Why it happens:** Notes included in tenant-facing endpoints
**How to avoid:** Never include notes in ApplicationsService responses, only LandlordService
**Warning signs:** Notes appear in GET /applications/:id for tenant

## Code Examples

Verified patterns for this implementation:

### LandlordNote Model (New)
```prisma
// Add to schema.prisma

/// Private note from landlord about a candidate
/// Only visible to the landlord, not the tenant
model LandlordNote {
  id            String      @id @default(uuid()) @db.Uuid
  applicationId String      @map("application_id") @db.Uuid
  landlordId    String      @map("landlord_id") @db.Uuid
  content       String      @db.Text
  createdAt     DateTime    @default(now()) @map("created_at")
  updatedAt     DateTime    @updatedAt @map("updated_at")

  // Relations
  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  landlord      User        @relation("LandlordNotes", fields: [landlordId], references: [id])

  // One note per landlord per application
  @@unique([applicationId, landlordId])
  @@index([applicationId])
  @@index([landlordId])
  @@map("landlord_notes")
}
```

### Application Model Update (Add relation)
```prisma
// Update Application model to add relation
model Application {
  // ... existing fields ...

  // Add this relation
  notes         LandlordNote[]
}
```

### User Model Update (Add relation)
```prisma
// Update User model to add relation
model User {
  // ... existing fields ...

  // Add this relation
  landlordNotes LandlordNote[] @relation("LandlordNotes")
}
```

### Candidate Card DTO (Response Shape)
```typescript
// Source: Frontend component contract
export class CandidateCardDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenantName!: string;

  @ApiProperty()
  status!: ApplicationStatus;

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty({ required: false })
  riskScore?: {
    totalScore: number;
    level: RiskLevel;
  };

  @ApiProperty({ required: false })
  note?: {
    id: string;
    content: string;
    updatedAt: Date;
  };
}
```

### Candidate Detail DTO (Full Score Breakdown)
```typescript
// Source: Frontend score display requirements
export class CandidateDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  tenant!: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };

  @ApiProperty()
  status!: ApplicationStatus;

  @ApiProperty()
  property!: {
    id: string;
    title: string;
    monthlyRent: number;
  };

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty({ required: false })
  riskScore?: {
    totalScore: number;
    level: RiskLevel;
    financialScore: number;
    stabilityScore: number;
    historyScore: number;
    integrityScore: number;
    drivers: Array<{ text: string; positive: boolean }>;
    flags: Array<{ code: string; severity: string; message: string }>;
    conditions: Array<{ type: string; message: string; required: boolean }>;
  };

  @ApiProperty()
  documents!: Array<{
    id: string;
    type: DocumentType;
    originalName: string;
    createdAt: Date;
  }>;

  @ApiProperty({ required: false })
  note?: {
    id: string;
    content: string;
    updatedAt: Date;
  };

  @ApiProperty()
  timeline!: ApplicationEvent[];
}
```

### LandlordController Endpoints
```typescript
// Source: REST API patterns, existing controller patterns
@ApiTags('Landlord')
@ApiBearerAuth()
@Controller('landlord')
@Roles(Role.LANDLORD, Role.BOTH)
export class LandlordController {
  constructor(private readonly landlordService: LandlordService) {}

  @Get('properties/:propertyId/candidates')
  @ApiOperation({ summary: 'Get candidates for a property' })
  async getCandidates(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.landlordService.getCandidates(propertyId, user.id);
  }

  @Get('applications/:applicationId')
  @ApiOperation({ summary: 'Get candidate detail with full score' })
  async getCandidateDetail(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.landlordService.getCandidateDetail(applicationId, user.id);
  }

  @Post('applications/:applicationId/preapprove')
  @ApiOperation({ summary: 'Pre-approve a candidate' })
  async preapprove(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: PreapproveCandidateDto,
  ) {
    return this.landlordService.preapprove(applicationId, user.id, dto);
  }

  @Post('applications/:applicationId/approve')
  @ApiOperation({ summary: 'Approve a candidate' })
  async approve(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: ApproveCandidateDto,
  ) {
    return this.landlordService.approve(applicationId, user.id, dto);
  }

  @Post('applications/:applicationId/reject')
  @ApiOperation({ summary: 'Reject a candidate' })
  async reject(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: RejectCandidateDto,
  ) {
    return this.landlordService.reject(applicationId, user.id, dto);
  }

  @Post('applications/:applicationId/request-info')
  @ApiOperation({ summary: 'Request additional info from candidate' })
  async requestInfo(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: RequestInfoDto,
  ) {
    return this.landlordService.requestInfo(applicationId, user.id, dto);
  }

  @Get('applications/:applicationId/documents/:documentId/url')
  @ApiOperation({ summary: 'Get signed URL for candidate document' })
  async getDocumentUrl(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Param('documentId', ParseUUIDPipe) documentId: string,
  ) {
    // DocumentsService.getSignedUrl already verifies landlord access
    return this.landlordService.getDocumentUrl(applicationId, documentId, user.id);
  }

  // Notes
  @Post('applications/:applicationId/notes')
  @ApiOperation({ summary: 'Create or update private note' })
  async upsertNote(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.landlordService.upsertNote(applicationId, user.id, dto);
  }

  @Delete('applications/:applicationId/notes')
  @ApiOperation({ summary: 'Delete private note' })
  async deleteNote(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    return this.landlordService.deleteNote(applicationId, user.id);
  }
}
```

### Status Transition Methods
```typescript
// Source: ApplicationStateMachine transitions + existing patterns
@Injectable()
export class LandlordService {
  async preapprove(
    applicationId: string,
    landlordId: string,
    dto: PreapproveCandidateDto,
  ): Promise<Application> {
    const application = await this.verifyLandlordOwnership(applicationId, landlordId);

    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.PREAPPROVED,
    );

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PREAPPROVED },
    });

    await this.eventService.logStatusChanged(
      applicationId,
      landlordId,
      application.status as ApplicationStatus,
      ApplicationStatus.PREAPPROVED,
      dto.message,
    );

    return updated;
  }

  async approve(
    applicationId: string,
    landlordId: string,
    dto: ApproveCandidateDto,
  ): Promise<Application> {
    const application = await this.verifyLandlordOwnership(applicationId, landlordId);

    // Can approve from UNDER_REVIEW or PREAPPROVED
    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.APPROVED,
    );

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED },
    });

    await this.eventService.logStatusChanged(
      applicationId,
      landlordId,
      application.status as ApplicationStatus,
      ApplicationStatus.APPROVED,
      dto.message,
    );

    return updated;
  }

  async reject(
    applicationId: string,
    landlordId: string,
    dto: RejectCandidateDto,
  ): Promise<Application> {
    const application = await this.verifyLandlordOwnership(applicationId, landlordId);

    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.REJECTED,
    );

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REJECTED },
    });

    await this.eventService.logStatusChanged(
      applicationId,
      landlordId,
      application.status as ApplicationStatus,
      ApplicationStatus.REJECTED,
      dto.reason,
    );

    return updated;
  }

  async requestInfo(
    applicationId: string,
    landlordId: string,
    dto: RequestInfoDto,
  ): Promise<Application> {
    const application = await this.verifyLandlordOwnership(applicationId, landlordId);

    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.NEEDS_INFO,
    );

    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.NEEDS_INFO },
    });

    // Log INFO_REQUESTED event with the specific request
    await this.eventService.logInfoRequested(
      applicationId,
      landlordId,
      dto.message,
    );

    await this.eventService.logStatusChanged(
      applicationId,
      landlordId,
      application.status as ApplicationStatus,
      ApplicationStatus.NEEDS_INFO,
      dto.message,
    );

    return updated;
  }
}
```

### Note Upsert (Create or Update)
```typescript
// Source: Prisma upsert pattern
async upsertNote(
  applicationId: string,
  landlordId: string,
  dto: CreateNoteDto,
): Promise<LandlordNote> {
  await this.verifyLandlordOwnership(applicationId, landlordId);

  return this.prisma.landlordNote.upsert({
    where: {
      applicationId_landlordId: {
        applicationId,
        landlordId,
      },
    },
    update: {
      content: dto.content,
    },
    create: {
      applicationId,
      landlordId,
      content: dto.content,
    },
  });
}

async deleteNote(
  applicationId: string,
  landlordId: string,
): Promise<void> {
  await this.verifyLandlordOwnership(applicationId, landlordId);

  await this.prisma.landlordNote.deleteMany({
    where: {
      applicationId,
      landlordId,
    },
  });
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic ApplicationsService | Separate LandlordService | Phase 6 | Clear separation of tenant vs landlord actions |
| Comments on application | Separate LandlordNote model | Phase 6 | Private notes visible only to landlord |
| Manual authorization | Property ownership check | Existing | Consistent authorization pattern |

**Existing patterns to preserve:**
- State machine for transitions (ApplicationStateMachine)
- Event logging for audit trail (ApplicationEventService)
- Signed URLs for documents (DocumentsService)
- Score retrieval (ScoringService)

## Open Questions

Things that couldn't be fully resolved:

1. **Notification on status change**
   - What we know: Phase 12 will handle notifications
   - What's unclear: Should status changes emit events for future notification system?
   - Recommendation: Events already logged, notification system can read events

2. **Bulk actions**
   - What we know: Requirements are single-candidate actions
   - What's unclear: Will landlords want to reject multiple candidates at once?
   - Recommendation: Implement single actions first, bulk can be added later

3. **Candidate filtering**
   - What we know: Sort by score required
   - What's unclear: Filter by status? Date range?
   - Recommendation: Start with status-based filtering (active candidates), add more filters later

4. **Note visibility in timeline**
   - What we know: Notes are private to landlord
   - What's unclear: Should note creation appear in timeline?
   - Recommendation: Do NOT add to timeline (tenant can see timeline), just track updatedAt

## Sources

### Primary (HIGH confidence)
- Existing codebase: ApplicationsService, ApplicationStateMachine, ApplicationEventService
- Existing codebase: DocumentsService.getSignedUrl() authorization pattern
- Existing codebase: ScoringService.getScoreResult()
- Prisma documentation: upsert, orderBy relation

### Secondary (MEDIUM confidence)
- NestJS module composition patterns
- REST API design patterns for resource actions

### Tertiary (LOW confidence)
- None identified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Uses existing project dependencies
- Architecture: HIGH - Follows existing patterns in codebase
- Authorization: HIGH - Pattern exists in DocumentsService
- State transitions: HIGH - State machine already defines allowed transitions
- Notes model: HIGH - Simple Prisma pattern

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - stable domain)

## Key Decisions for Planning

1. **Module name:** `LandlordModule` - separate from ApplicationsModule
2. **Route prefix:** `/landlord` - landlord-specific namespace
3. **Authorization:** Property ownership via Property.landlordId
4. **Notes storage:** Separate LandlordNote model, not JSON on Application
5. **Score access:** Via riskScore relation, not separate API call
6. **Document access:** Delegate to existing DocumentsService
7. **Event logging:** Use existing ApplicationEventService
8. **State validation:** Use existing ApplicationStateMachine

## Requirements Mapping

| Requirement | Implementation |
|-------------|---------------|
| LAND-01: View candidates per property | GET /landlord/properties/:id/candidates |
| LAND-02: Ranked by score | orderBy: { riskScore: { totalScore: 'desc' } } |
| LAND-03: Cards with score, level, metrics | CandidateCardDto with riskScore relation |
| LAND-04: Detail with full score | GET /landlord/applications/:id with full RiskScoreResult |
| LAND-05: Pre-approve | POST /landlord/applications/:id/preapprove |
| LAND-06: Approve | POST /landlord/applications/:id/approve |
| LAND-07: Reject | POST /landlord/applications/:id/reject |
| LAND-08: Request info | POST /landlord/applications/:id/request-info |
| LAND-09: Private notes | LandlordNote model + CRUD endpoints |
| LAND-10: View documents | GET /landlord/applications/:id/documents/:docId/url |
