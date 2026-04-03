---
phase: 24-roles-permissions
plan: "02"
subsystem: auth
tags: [nestjs, guards, rbac, team-roles, prisma, decorators]

requires:
  - phase: 24-01
    provides: AgencyPermissionGuard pattern (agency member role enforcement reference)
  - phase: 02-auth-users
    provides: SupabaseAuthGuard, RolesGuard, TeamMember model

provides:
  - TeamAccessGuard: enforces TEAM_ROLE_PERMISSIONS for landlord team members
  - "@RequireTeamPermission decorator: marks endpoints with required resource+action"
  - "@TeamOwner decorator: extracts teamOwnerId from request for data scoping"
  - TEAM_ROLE_PERMISSIONS: fixed permission matrix for admin/manager/accountant/viewer roles
  - @@index([email, status]) on TeamMember for guard query performance
  - Guard applied to: LandlordController, PropertiesController, ContractsController, LeasesController, VisitsController, UsersController (team endpoints)

affects: [landlord, properties, contracts, leases, visits, users, 24-03]

tech-stack:
  added: []
  patterns:
    - "TeamAccessGuard: email-based lookup (TeamMember.email = User.email) with status=accepted check"
    - "Direct owner detection: property count > 0 means direct landlord, bypass team permission check"
    - "teamOwnerId propagation: guard sets request.teamOwnerId for downstream data scoping"
    - "@UseGuards(TeamAccessGuard) per-endpoint or at class level, after SupabaseAuthGuard"
    - "TeamAccessGuard provided in each feature module's providers array (PrismaModule is @Global)"

key-files:
  created:
    - src/auth/permissions/team-role-permissions.ts
    - src/auth/guards/team-access.guard.ts
    - src/auth/decorators/require-team-permission.decorator.ts
    - src/auth/decorators/team-owner.decorator.ts
  modified:
    - src/auth/guards/index.ts
    - src/auth/decorators/index.ts
    - src/auth/auth.module.ts
    - src/landlord/landlord.controller.ts
    - src/landlord/landlord.module.ts
    - src/properties/properties.controller.ts
    - src/properties/properties.module.ts
    - src/contracts/contracts.controller.ts
    - src/contracts/contracts.module.ts
    - src/leases/leases.controller.ts
    - src/leases/leases.module.ts
    - src/visits/visits.controller.ts
    - src/visits/visits.module.ts
    - src/users/users.controller.ts
    - src/users/users.module.ts
    - prisma/schema.prisma

key-decisions:
  - "TeamMember has no userId field — guard matches by User.email against TeamMember.email (email is unique per owner+email pair)"
  - "Direct owner detection uses property count (landlordId = user.id) rather than a separate flag — any landlord with own properties is treated as direct owner"
  - "MVP scope: LANDLORD users with own properties always pass, no context-switching between own and team-member roles. That requires a future explicit context-switch feature."
  - "TENANT users pass through TeamAccessGuard without any check — different flow entirely"
  - "AGENT users pass through with teamOwnerId = user.id — they use agency flow"
  - "TeamAccessGuard exported from AuthModule and provided individually in each feature module's providers array"

patterns-established:
  - "Pattern: @UseGuards(TeamAccessGuard) + @RequireTeamPermission('resource', 'action') pair on LANDLORD endpoints"
  - "Pattern: teamOwnerId on request object for downstream data scoping (future service updates will consume this)"
  - "Pattern: Guard does two DB queries on team-member path: property count + TeamMember lookup — both covered by indexes"

duration: 32min
completed: 2026-04-03
---

# Phase 24 Plan 02: Team Role Enforcement Summary

**Role-based access control for landlord team members (admin/manager/accountant/viewer) via TeamAccessGuard, permission matrix, and decorators applied to 6 landlord controllers**

## Performance

- **Duration:** 32 min
- **Started:** 2026-04-03T15:19:14Z
- **Completed:** 2026-04-03T15:51:34Z
- **Tasks:** 6
- **Files modified:** 16

## Accomplishments

- `TeamAccessGuard` enforces the TEAM_ROLE_PERMISSIONS matrix for team members invited by email — direct landlord owners (with own properties) always pass
- `@RequireTeamPermission('resource', 'action')` decorator applied to 30+ endpoints across 6 controllers (landlord, properties, contracts, leases, visits, users)
- `@TeamOwner()` param decorator extracts `teamOwnerId` from request, providing the data scoping primitive for future service-level context isolation
- Fixed TeamMember schema: added `@@index([email, status])` for the guard's lookup query performance

## Task Commits

1. **Task 1: Team role permissions constant** - `76fc7b7` (feat)
2. **Task 2: TeamAccessGuard** - `0ff2c64` (feat)
3. **Task 3: @RequireTeamPermission decorator** - `ea5834c` (feat)
4. **Task 4: TeamMember schema index** - `d08a5d3` (feat)
5. **Task 5: Apply guard to controllers** - `2124a6b` (feat)
6. **Task 6: @TeamOwner decorator** - `fe89e1c` (feat)

## Files Created/Modified

- `src/auth/permissions/team-role-permissions.ts` - Fixed permission matrix: admin/manager/accountant/viewer × 10 resources × 4 actions
- `src/auth/guards/team-access.guard.ts` - Guard: email lookup, owner detection, permission enforcement, teamOwnerId injection
- `src/auth/decorators/require-team-permission.decorator.ts` - `@RequireTeamPermission(resource, action)` via SetMetadata
- `src/auth/decorators/team-owner.decorator.ts` - `@TeamOwner()` param decorator for extracting scoped owner id
- `src/auth/guards/index.ts` - Added TeamAccessGuard export
- `src/auth/decorators/index.ts` - Added RequireTeamPermission and TeamOwner exports
- `src/auth/auth.module.ts` - Added TeamAccessGuard to providers + exports
- `src/landlord/landlord.controller.ts` - @UseGuards(TeamAccessGuard) at class level + permissions on all 11 endpoints
- `src/properties/properties.controller.ts` - permissions on 7 LANDLORD endpoints
- `src/contracts/contracts.controller.ts` - permissions on 5 LANDLORD/shared endpoints
- `src/leases/leases.controller.ts` - permissions on 5 endpoints
- `src/visits/visits.controller.ts` - permissions on 8 LANDLORD endpoints
- `src/users/users.controller.ts` - permissions on 4 team management endpoints
- `prisma/schema.prisma` - @@index([email, status]) on TeamMember

## Decisions Made

- **Email-based team member lookup**: `TeamMember` model has no `userId` field — only `email`. Guard queries by `User.email` matching `TeamMember.email`. This is architecturally sound because team invitations use email addresses.

- **Direct owner detection via property count**: Rather than adding a flag to User, the guard counts properties with `landlordId = user.id`. Zero properties AND an accepted TeamMember entry → user is a pure team member. Any properties → direct owner, always passes.

- **MVP scope limitation**: A landlord-role user with their own properties always bypasses team permission checks. True "context switching" (acting as a team member of another landlord while having your own account) requires a future explicit switch feature. This was the correct call for MVP.

- **Guard provided per module**: Since `@UseGuards(TeamAccessGuard)` requires the guard to be in the DI container of the calling module, `TeamAccessGuard` is added to `providers` in each feature module. `PrismaService` is globally available via `@Global() PrismaModule`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Guard design adapted for email-based TeamMember lookup**
- **Found during:** Task 2 (TeamAccessGuard implementation)
- **Issue:** Plan spec assumed `TeamMember.userId` field exists, but the actual schema uses `email` as the link between User and TeamMember
- **Fix:** Guard queries `teamMember.findFirst({ where: { email: user.email, status: 'accepted' } })` instead of `{ userId: user.id }`
- **Files modified:** src/auth/guards/team-access.guard.ts
- **Committed in:** 0ff2c64

**2. [Rule 2 - Missing Critical] Added TeamMember index for guard performance**
- **Found during:** Task 4 (schema review)
- **Issue:** Plan specified `@@index([userId, status])` but the actual query is `{ email, status }`. Existing indexes only covered `ownerId`. Guard runs on every protected request without an index → full table scan.
- **Fix:** Added `@@index([email, status])` instead of `@@index([userId, status])`
- **Files modified:** prisma/schema.prisma
- **Committed in:** d08a5d3

---

**Total deviations:** 2 auto-fixed (1 schema-mismatch bug, 1 missing performance index)
**Impact on plan:** Both fixes required for correctness. No scope creep.

## Issues Encountered

- TeamMember model only stores `email` (not `userId`), so the guard can't directly join on User.id. The email-based lookup is slightly less efficient than a userId lookup but still O(1) with the new index.

## Next Phase Readiness

- Guard infrastructure is complete and enforced on all main landlord endpoints
- `teamOwnerId` is set on every request passing through TeamAccessGuard — services can be updated incrementally to filter by `teamOwnerId` instead of `user.id`
- Phase 24-03 (if it addresses service-level data scoping) can consume `request.teamOwnerId` via `@TeamOwner()` decorator directly

---
*Phase: 24-roles-permissions*
*Completed: 2026-04-03*

## Self-Check: PASSED

- src/auth/permissions/team-role-permissions.ts: FOUND
- src/auth/guards/team-access.guard.ts: FOUND
- src/auth/decorators/require-team-permission.decorator.ts: FOUND
- src/auth/decorators/team-owner.decorator.ts: FOUND
- All 6 task commits verified: 76fc7b7, 0ff2c64, ea5834c, d08a5d3, 2124a6b, fe89e1c
