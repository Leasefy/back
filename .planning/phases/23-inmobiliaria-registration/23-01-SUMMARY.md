---
phase: 23
plan: "01"
subsystem: inmobiliaria-registration
tags: [prisma, onboarding, agency, inmobiliaria, migration]
dependency_graph:
  requires: []
  provides: [agency-member-invitation-fields, inmobiliaria-onboarding-endpoint]
  affects: [users-service, agency-service, prisma-schema]
tech_stack:
  added: []
  patterns: [conditional-validation, union-return-type, module-composition]
key_files:
  created:
    - prisma/migrations/20260309000000_add_agency_member_invitation_fields/migration.sql
    - scripts/run-migration-23-01.mjs
  modified:
    - prisma/schema.prisma
    - src/users/dto/complete-onboarding.dto.ts
    - src/users/users.service.ts
    - src/users/users.module.ts
    - src/users/users.controller.ts
decisions:
  - "AgencyService injected into UsersService via AgencyModule import in UsersModule"
  - "completeOnboarding returns union type: User | { user, agency, onboardingStep } to preserve backward compatibility"
  - "Migration file uses snake_case column names matching @@map conventions in Prisma schema"
  - "Migration script is idempotent (IF NOT EXISTS guards) for safe re-execution in Supabase"
metrics:
  duration: "12 minutes"
  completed: "2026-03-09"
---

# Phase 23 Plan 01: Prisma Migration + Onboarding INMOBILIARIA Summary

**One-liner:** Prisma schema extended with AgencyMember invitation fields and CompleteOnboarding endpoint upgraded to create agencies for INMOBILIARIA users automatically.

## What Was Built

This plan establishes the foundation for Phase 23 (Inmobiliaria Registration & Onboarding). It enables users to register as `INMOBILIARIA` during onboarding — triggering automatic agency creation — and extends the `AgencyMember` model with invitation token fields required by Plans 23-02 and 23-03.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Prisma schema: invitation fields on AgencyMember | `bd0510e` | schema.prisma, migration.sql |
| 2 | CompleteOnboardingDto: add INMOBILIARIA type + agency DTO | `f3c77a3` | complete-onboarding.dto.ts |
| 3 | UsersService: INMOBILIARIA onboarding logic + AgencyService injection | `38717ce` | users.service.ts, users.module.ts |
| 4 | UsersController: update return type for onboarding endpoint | `38717ce` | users.controller.ts |
| 5 | Migration script for Supabase manual execution | `7ca5279` | scripts/run-migration-23-01.mjs |

## Key Implementation Details

### Schema Changes

Three new columns on `agency_members` table:
- `invitation_token TEXT UNIQUE` — secure one-time token for invite link
- `invitation_expires_at TIMESTAMP(3)` — token expiry (supports Plan 23-02)
- `invited_email TEXT` — email for inviting users not yet registered

### Onboarding Flow for INMOBILIARIA

```
POST /users/me/onboarding
{ userType: 'INMOBILIARIA', agency: { name: 'ABC Inmobiliaria', city: 'Bogota' } }

→ 1. Update user (role = INMOBILIARIA... mapped to existing Role enum)
→ 2. agencyService.createAgency(userId, dto.agency)
     - Creates Agency record
     - Creates AgencyMember with role = ADMIN
→ 3. Returns { user, agency, onboardingStep: 'agency_created' }
```

### Backward Compatibility

- `POST /users/me/onboarding { userType: 'TENANT' | 'LANDLORD' | 'AGENT' }` returns `User` object unchanged
- INMOBILIARIA adds new response shape without modifying existing ones

### Module Wiring

`UsersModule` now imports `AgencyModule`, which exports `AgencyService`. This avoids circular dependencies since `AgencyModule` does not import `UsersModule`.

## Validation Behavior

- `userType: 'INMOBILIARIA'` without `agency` field → HTTP 400 (class-validator `ValidateIf` + `IsNotEmpty`)
- `agency.name` is required (IsNotEmpty)
- `agency.email` is optional but validated as email format when provided

## Migration Execution

The Supabase cloud DB requires manual migration. Two options:
1. Run `scripts/run-migration-23-01.mjs` and copy the SQL to Supabase SQL Editor
2. Apply `prisma/migrations/20260309000000_add_agency_member_invitation_fields/migration.sql` directly

`npx prisma generate` was run and client reflects the new schema fields.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files Verified
- [x] `prisma/migrations/20260309000000_add_agency_member_invitation_fields/migration.sql` — FOUND
- [x] `scripts/run-migration-23-01.mjs` — FOUND
- [x] `src/users/dto/complete-onboarding.dto.ts` — FOUND (UserType.INMOBILIARIA, CreateAgencyInOnboardingDto)
- [x] `src/users/users.service.ts` — FOUND (AgencyService injected, INMOBILIARIA branch)
- [x] `src/users/users.module.ts` — FOUND (AgencyModule imported)

### Commits Verified
- [x] `bd0510e` — feat(23-01): add invitation fields to AgencyMember schema
- [x] `f3c77a3` — feat(23-01): add INMOBILIARIA to UserType enum and CreateAgencyInOnboardingDto
- [x] `38717ce` — feat(23-01): implement INMOBILIARIA onboarding in UsersService and UsersController
- [x] `7ca5279` — chore(23-01): add migration helper script for agency_members invitation fields

### TypeScript
- [x] `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED
