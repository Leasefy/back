---
phase: 02-auth-users
plan: 02
subsystem: authentication
tags: [nestjs, passport, jwt, supabase, jwks, guards, rbac]

# Dependency graph
requires:
  - phase: 02-01
    provides: User model with Role enum, SUPABASE_JWKS_URL validation
provides:
  - Supabase JWT authentication via passport-jwt
  - Global auth guard protecting all routes by default
  - @Public() decorator for open routes
  - @Roles() decorator for role-based access control
  - @CurrentUser() decorator for user extraction
affects: [02-03 (user CRUD), 03-properties (auth for endpoints), 04-applications (auth for endpoints)]

# Tech tracking
tech-stack:
  added:
    - "@nestjs/passport@^11.0.0"
    - "passport@^0.7.0"
    - "passport-jwt@^4.0.1"
    - "jwks-rsa@^3.1.0"
    - "@types/passport-jwt@^4.0.1 (dev)"
  patterns:
    - "JWKS-based JWT verification (no hardcoded secrets)"
    - "Global guards via APP_GUARD providers"
    - "Guard order: auth first, roles second"
    - "Public route bypass via Reflector metadata"

key-files:
  created:
    - src/auth/auth.module.ts
    - src/auth/strategies/supabase.strategy.ts
    - src/auth/guards/supabase-auth.guard.ts
    - src/auth/guards/roles.guard.ts
    - src/auth/decorators/public.decorator.ts
    - src/auth/decorators/roles.decorator.ts
    - src/auth/decorators/current-user.decorator.ts
    - src/common/enums/role.enum.ts
  modified:
    - src/app.module.ts
    - src/health/health.controller.ts
    - package.json

key-decisions:
  - "JWKS-based verification via jwks-rsa (future-proof, no secret rotation needed)"
  - "Global guards with APP_GUARD provider pattern"
  - "Auth guard before roles guard (user must be populated for role check)"
  - "BOTH role grants access to any role-restricted route"

patterns-established:
  - "Public routes: @Public() decorator on controller/method"
  - "Role restriction: @Roles(Role.LANDLORD) decorator"
  - "User access: @CurrentUser() param decorator"
  - "Protected by default: all routes require valid JWT unless @Public()"

# Metrics
duration: 12min
completed: 2026-01-26
---

# Phase 2 Plan 2: Supabase JWT Auth & Guards Summary

**Passport-JWT authentication with JWKS verification, global guards protecting all routes, @Public/@Roles/@CurrentUser decorators**

## Performance

- **Duration:** 12 min
- **Started:** 2026-01-26T15:47:00Z
- **Completed:** 2026-01-26T15:59:00Z
- **Tasks:** 3
- **Files created/modified:** 12

## Accomplishments

- Installed @nestjs/passport, passport, passport-jwt, jwks-rsa for JWT authentication
- Created SupabaseStrategy using JWKS-based JWT verification (no hardcoded secrets)
- Created SupabaseAuthGuard that enforces authentication with @Public() bypass
- Created RolesGuard that restricts routes by user role, with BOTH role having full access
- Created @Public(), @Roles(), @CurrentUser() decorators for route configuration
- Registered guards globally via APP_GUARD (auth first, roles second)
- Marked HealthController as @Public() for unauthenticated access
- All routes now protected by default (return 401 without valid JWT)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install auth dependencies and create decorators** - `b05e303` (feat)
2. **Task 2: Create Supabase JWT strategy and guards** - `9c630d3` (feat)
3. **Task 3: Create AuthModule and register global guards** - `b1778dd` (feat)

## Files Created/Modified

**Created:**
- `src/auth/auth.module.ts` - Auth module with PassportModule and strategy
- `src/auth/strategies/supabase.strategy.ts` - JWKS-based JWT validation
- `src/auth/guards/supabase-auth.guard.ts` - Global auth guard with @Public() bypass
- `src/auth/guards/roles.guard.ts` - Role-based access control
- `src/auth/decorators/public.decorator.ts` - @Public() for open routes
- `src/auth/decorators/roles.decorator.ts` - @Roles() for role restriction
- `src/auth/decorators/current-user.decorator.ts` - @CurrentUser() param decorator
- `src/common/enums/role.enum.ts` - Role enum matching Prisma schema
- `src/auth/decorators/index.ts` - Barrel export for decorators
- `src/auth/guards/index.ts` - Barrel export for guards
- `src/auth/strategies/index.ts` - Barrel export for strategies

**Modified:**
- `src/app.module.ts` - Import AuthModule, register global guards
- `src/health/health.controller.ts` - Add @Public() decorator
- `package.json` - Add auth dependencies

## Decisions Made

1. **JWKS-based JWT verification** - Uses jwks-rsa with SUPABASE_JWKS_URL instead of hardcoded secret. Future-proof, automatic key rotation support.

2. **Global guards via APP_GUARD** - All routes protected by default. More secure than requiring decoration on every route.

3. **Guard order: auth before roles** - Auth guard populates request.user, roles guard reads it. Prevents undefined user in role check.

4. **BOTH role full access** - Users with BOTH role can access any @Roles() restricted route. Simplifies logic for dual-role users.

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All success criteria verified:

| Criterion | Status | Evidence |
|-----------|--------|----------|
| passport-jwt and jwks-rsa installed | PASS | package.json dependencies |
| Supabase strategy validates JWTs using JWKS | PASS | passportJwtSecret with jwksUri |
| All routes protected by default | PASS | GET / returns 401 |
| @Public() bypasses auth | PASS | GET /health returns 200 |
| @Roles() restricts by role | PASS | RolesGuard implementation |
| BOTH role has full access | PASS | roles.guard.ts line 61 |
| Health endpoint accessible | PASS | curl /health returns 200 |
| Swagger accessible | PASS | curl /api returns 200 |

## Next Phase Readiness

- Auth infrastructure complete, ready for user CRUD endpoints (02-03)
- All future routes will be protected by default
- Decorators available for public routes and role restrictions
- No blockers for next plan

---
*Phase: 02-auth-users*
*Completed: 2026-01-26*
