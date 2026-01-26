---
phase: 02-auth-users
plan: 01
subsystem: database
tags: [prisma, postgresql, supabase, user-model, database-trigger]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Prisma 7.x setup with Supabase PostgreSQL connection
provides:
  - User model with Role enum (TENANT/LANDLORD/BOTH)
  - Environment validation for SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWKS_URL
  - Database trigger SQL for auth.users -> public.users sync
affects: [02-02 (auth guards), 03-properties (user relations), 04-applications (user relations)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma enum for Role type"
    - "UUID primary key matching Supabase auth.users.id"
    - "Database trigger for cross-schema user sync"
    - "Supabase migrations in separate directory (manual execution)"

key-files:
  created:
    - supabase/migrations/00001_user_sync_trigger.sql
    - supabase/migrations/README.md
  modified:
    - prisma/schema.prisma
    - prisma.config.ts
    - src/config/env.validation.ts

key-decisions:
  - "Use DIRECT_URL for prisma db push (pooler causes hangs)"
  - "Role enum in Prisma rather than TypeScript constant"
  - "activeRole field for BOTH users to track current context"
  - "SECURITY DEFINER on trigger function for cross-schema write"

patterns-established:
  - "Supabase migrations: separate directory, manual SQL execution"
  - "User sync: database trigger on auth.users INSERT"
  - "UUID matching: public.users.id == auth.users.id"

# Metrics
duration: 15min
completed: 2026-01-25
---

# Phase 2 Plan 1: User Model & Environment Summary

**Prisma User model with Role enum (TENANT/LANDLORD/BOTH) and database trigger SQL for Supabase auth.users sync**

## Performance

- **Duration:** 15 min
- **Started:** 2026-01-25T22:20:00Z
- **Completed:** 2026-01-25T22:40:00Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- User model in Prisma schema with id (UUID), email, role, activeRole, firstName, lastName, phone fields
- Role enum with TENANT, LANDLORD, BOTH values
- Environment validation requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWKS_URL on startup
- Database trigger SQL file ready for manual execution in Supabase
- Updated prisma.config.ts to use DIRECT_URL for schema operations

## Task Commits

Each task was committed atomically:

1. **Task 1: Add User model and Role enum to Prisma schema** - `1e33478` (feat)
2. **Task 2: Add Supabase environment variables to validation** - `0f0ae4c` (feat)
3. **Task 3: Create database trigger for user sync** - `6ba7c50` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added User model and Role enum
- `prisma.config.ts` - Updated to use DIRECT_URL for schema operations
- `src/config/env.validation.ts` - Added SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWKS_URL validation
- `supabase/migrations/00001_user_sync_trigger.sql` - User sync trigger and function
- `supabase/migrations/README.md` - Instructions for manual migration execution

## Decisions Made

1. **Use DIRECT_URL for Prisma schema operations** - The connection pooler (port 6543) caused prisma db push to hang; using direct connection (port 5432) works correctly
2. **Role as Prisma enum** - Type-safe, generates TypeScript types automatically
3. **activeRole field for BOTH users** - Allows users with BOTH role to track their current context (acting as TENANT or LANDLORD)
4. **SECURITY DEFINER on trigger function** - Required for the function to write to public.users when triggered from auth schema context

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed prisma.config.ts to use DIRECT_URL for schema operations**
- **Found during:** Task 1 (Prisma db push)
- **Issue:** Using pooled connection (DATABASE_URL) caused prisma db push to hang indefinitely
- **Fix:** Updated prisma.config.ts to use DIRECT_URL for datasource URL (direct connection bypasses pooler)
- **Files modified:** prisma.config.ts
- **Verification:** `npx prisma db push` completes in 6 seconds
- **Committed in:** 1e33478 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for Prisma to communicate with Supabase PostgreSQL. No scope creep.

## Issues Encountered

- Prisma 7.x no longer supports `url` and `directUrl` in schema.prisma file; must be configured in prisma.config.ts instead

## User Setup Required

**Database trigger requires manual configuration.** The SQL trigger must be executed manually in Supabase:

1. Go to Supabase Dashboard > SQL Editor
2. Paste contents of `supabase/migrations/00001_user_sync_trigger.sql`
3. Click Run
4. Verify trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

## Next Phase Readiness

- User model exists in database, ready for auth guards (02-02)
- Environment variables validated, ready for JWT verification
- Trigger SQL ready for manual execution (required before testing auth flow)
- No blockers for next plan

---
*Phase: 02-auth-users*
*Completed: 2026-01-25*
