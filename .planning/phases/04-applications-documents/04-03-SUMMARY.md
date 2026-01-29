---
phase: 04-applications-documents
plan: 03
subsystem: applications
tags: [applications, wizard, dto, validation, nestjs]

dependency-graph:
  requires:
    - 04-01 (Application data models and enums)
    - 04-02 (State machine and event service)
  provides:
    - ApplicationsService with create and updateStep methods
    - ApplicationsController with REST endpoints
    - DTOs for wizard steps 1-4
    - EmploymentType enum
  affects:
    - 04-04 (Document upload will use this module)
    - Phase 5 (Scoring will process applications)

tech-stack:
  added: []
  patterns:
    - Wizard step-by-step data collection
    - JSON fields for flexible step data storage
    - Ownership validation pattern
    - Status-based operation guards

key-files:
  created:
    - src/applications/dto/create-application.dto.ts
    - src/applications/dto/personal-info.dto.ts
    - src/applications/dto/employment-info.dto.ts
    - src/applications/dto/income-info.dto.ts
    - src/applications/dto/references.dto.ts
    - src/applications/dto/index.ts
    - src/applications/applications.service.ts
    - src/applications/applications.controller.ts
  modified:
    - src/applications/applications.module.ts
    - src/app.module.ts

decisions:
  - id: dto-step-validation
    choice: Separate DTO per wizard step
    rationale: Strong typing and validation per step, clear API contracts
  - id: json-persistence
    choice: Persist each step to its own JSON field
    rationale: Flexibility for schema evolution, validated in app layer
  - id: step-advancement
    choice: Auto-advance currentStep on updateStep
    rationale: Track wizard progress automatically

metrics:
  duration: 5m
  completed: 2026-01-29
---

# Phase 4 Plan 3: Core Applications Module Summary

**One-liner:** REST endpoints for application creation and wizard steps 1-4 with Colombian validation (cedula, mobile phone)

## What Was Built

### DTOs for Wizard Steps

**create-application.dto.ts**
- `propertyId` (UUID) - Property to apply for

**personal-info.dto.ts** (Step 1)
- `fullName` (3-100 chars)
- `cedula` (6-10 digits, Colombian ID)
- `dateOfBirth` (ISO date)
- `email` (valid email)
- `phone` (Colombian mobile: +573XXXXXXXXX)
- `currentAddress` (optional)

**employment-info.dto.ts** (Step 2)
- `employmentType` (EMPLOYED|SELF_EMPLOYED|CONTRACTOR|UNEMPLOYED|RETIRED|STUDENT)
- `companyName`, `jobTitle`, `startDate`, `workAddress` (optional)
- `hrContactPhone`, `hrContactEmail` (optional)

**income-info.dto.ts** (Step 3)
- `monthlySalary` (COP, required)
- `additionalIncome`, `additionalIncomeSource` (optional)
- `monthlyDebtPayments`, `debtDescription` (optional)

**references.dto.ts** (Step 4)
- `landlordReference` (optional, nested ReferenceDto)
- `employmentReference` (required, nested ReferenceDto)
- `personalReferences` (array, min 1, nested ReferenceDto)

### ApplicationsService

```typescript
class ApplicationsService {
  create(tenantId, dto)          // Create application, validate property available
  updateStep(appId, tenantId, step, data)  // Update step 1-4, validate ownership/DRAFT
  findById(appId)                // Basic retrieval
  findByIdOrThrow(appId)         // With NotFoundException
  findByIdWithDetails(appId, userId)  // Full details, validates access
}
```

**Key validations:**
- Property must exist and be AVAILABLE
- No duplicate active applications per tenant per property
- Only owner can update steps
- Only DRAFT applications can have steps updated

### ApplicationsController

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /applications | Create application for property |
| PATCH | /applications/:id/steps/1 | Update personal info |
| PATCH | /applications/:id/steps/2 | Update employment info |
| PATCH | /applications/:id/steps/3 | Update income info |
| PATCH | /applications/:id/steps/4 | Update references |
| GET | /applications/:id | Get application details |

All endpoints require authentication and TENANT or BOTH role.

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

1. **Colombian phone validation**: Uses regex `/^(\+57)?3[0-9]{9}$/` for mobile numbers
2. **Cedula validation**: Uses regex `/^\d{6,10}$/` for Colombian ID
3. **Reference phone validation**: More permissive `/^(\+57)?[0-9]{7,10}$/` for landlines
4. **Step advancement**: `currentStep` auto-increments to `max(current, step+1)`

## Next Phase Readiness

**Ready for 04-04:** Document upload endpoints can now be added to the applications module.

**Requirements for next plan:**
- Supabase Storage bucket for application documents
- SUPABASE_SERVICE_KEY in environment
