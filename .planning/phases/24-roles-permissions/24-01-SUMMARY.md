---
phase: 24-roles-permissions
plan: "01"
subsystem: api
tags: [nestjs, prisma, guards, permissions, rbac, jsonb]

# Dependency graph
requires:
  - phase: 23-inmobiliaria-registration
    provides: AgencyMember model, AgencyMemberGuard, all 13 inmobiliaria controllers

provides:
  - Granular module+action permission system for all agency members
  - JSONB permissions field on AgencyMember (null = role defaults)
  - AgencyPermissionGuard enforcing module+action on every inmobiliaria endpoint
  - @RequirePermission decorator for endpoint-level permission metadata
  - AGENCY_ROLE_DEFAULTS matrix for AGENTE, CONTADOR, VIEWER roles
  - GET/PUT /members/:id/permissions endpoints for admin permission management

affects:
  - 24-02 (next plans in role/permission phase)
  - All inmobiliaria feature development (permissions required on new endpoints)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Permission guard pattern: AgencyMemberGuard injects permissions, AgencyPermissionGuard enforces them"
    - "Null-as-default: null permissions = use role defaults; only write when customized"
    - "Module inheritance: renovaciones + actas inherit portafolio module permissions"
    - "Smart null-clearing: permissions matching role defaults are stored as null"

key-files:
  created:
    - prisma/migrations/20260401000000_add_agency_member_permissions/migration.sql
    - src/inmobiliaria/agency/permissions/agency-permissions.ts
    - src/inmobiliaria/agency/permissions/role-defaults.ts
    - src/inmobiliaria/agency/decorators/require-permission.decorator.ts
    - src/inmobiliaria/agency/guards/agency-permission.guard.ts
    - src/inmobiliaria/agency/dto/update-permissions.dto.ts
  modified:
    - prisma/schema.prisma
    - src/inmobiliaria/agency/guards/agency-member.guard.ts
    - src/inmobiliaria/agency/agency.module.ts
    - src/inmobiliaria/agency/agency.service.ts
    - src/inmobiliaria/agency/agency.controller.ts
    - src/inmobiliaria/agency/dto/index.ts
    - src/inmobiliaria/dashboard/dashboard.controller.ts
    - src/inmobiliaria/propietarios/propietarios.controller.ts
    - src/inmobiliaria/consignaciones/consignaciones.controller.ts
    - src/inmobiliaria/pipeline/pipeline.controller.ts
    - src/inmobiliaria/agentes/agentes.controller.ts
    - src/inmobiliaria/cobros/cobros.controller.ts
    - src/inmobiliaria/dispersiones/dispersiones.controller.ts
    - src/inmobiliaria/mantenimiento/mantenimiento.controller.ts
    - src/inmobiliaria/reports/reports.controller.ts
    - src/inmobiliaria/analytics/analytics.controller.ts
    - src/inmobiliaria/documentos/documentos.controller.ts
    - src/inmobiliaria/renovaciones/renovaciones.controller.ts
    - src/inmobiliaria/actas/actas.controller.ts

key-decisions:
  - "JSONB field + null pattern: permissions=null means use role defaults, avoiding redundant storage"
  - "AgencyMemberGuard extended (not new guard) to select+inject permissions in same DB query"
  - "ADMIN role always bypasses permission checks in AgencyPermissionGuard — no lookup needed"
  - "renovaciones and actas inherit portafolio module (they manage property portfolio sub-items)"
  - "mantenimiento maps to operaciones module to match frontend menu naming"
  - "Smart null-clearing: when passed permissions == JSON(roleDefaults), store null not the object"

patterns-established:
  - "Permission enforcement: @UseGuards(AgencyMemberGuard, AgencyPermissionGuard) + @RequirePermission(module, action) at endpoint"
  - "New inmobiliaria endpoints MUST include @RequirePermission"
  - "New modules must be added to AGENCY_MODULES and AGENCY_ROLE_DEFAULTS"

# Metrics
duration: 20min
completed: 2026-04-01
---

# Phase 24 Plan 01: Permisos Granulares de Inmobiliaria Summary

**JSONB-based granular permission system (module+action) for agency members enforced across all 13 inmobiliaria controllers via NestJS guards, with role defaults for AGENTE/CONTADOR/VIEWER and admin customization endpoints**

## Performance

- **Duration:** 20 min
- **Started:** 2026-04-03T14:55:21Z
- **Completed:** 2026-04-03T15:15:00Z
- **Tasks:** 7
- **Files modified:** 25

## Accomplishments

- Closed critical security gap where VIEWER/AGENTE could execute any operation on all modules
- Implemented full granular permission system with 12 modules x 5 actions (view/create/edit/delete/export)
- Applied permissions enforcement to all 13 inmobiliaria controllers (dashboard, propietarios, portafolio, pipeline, agentes, cobros, dispersiones, operaciones, reportes, configuracion, documentos, analytics)
- ADMIN members bypass permission checks entirely; custom permissions stored only when different from role defaults

## Task Commits

1. **Task 1: Prisma migration — permissions field** - `68db916` (feat)
2. **Task 2: Permission types and role defaults matrix** - `35228d3` (feat)
3. **Task 3: @RequirePermission decorator** - `787cc39` (feat)
4. **Task 4: AgencyPermissionGuard + AgencyMemberGuard update** - `757fa4b` (feat)
5. **Task 5: Permission management endpoints** - `f00a29f` (feat)
6. **Task 6: Apply @RequirePermission to 13 controllers** - `36719f5` (feat)
7. **Task 7: Smart null-clearing in updateMemberPermissions** - `6f371e4` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added nullable JSONB `permissions` field to AgencyMember
- `prisma/migrations/20260401000000_add_agency_member_permissions/migration.sql` - Migration SQL
- `src/inmobiliaria/agency/permissions/agency-permissions.ts` - AgencyModule, AgencyAction, AgencyPermissions types
- `src/inmobiliaria/agency/permissions/role-defaults.ts` - AGENCY_ROLE_DEFAULTS matrix for AGENTE/CONTADOR/VIEWER
- `src/inmobiliaria/agency/decorators/require-permission.decorator.ts` - @RequirePermission(module, action) decorator
- `src/inmobiliaria/agency/guards/agency-permission.guard.ts` - Guard that enforces module+action permissions
- `src/inmobiliaria/agency/guards/agency-member.guard.ts` - Extended to select and inject member.permissions
- `src/inmobiliaria/agency/agency.module.ts` - Registered and exported AgencyPermissionGuard
- `src/inmobiliaria/agency/agency.service.ts` - getMemberPermissions, updateMemberPermissions service methods
- `src/inmobiliaria/agency/agency.controller.ts` - GET/PUT /members/:id/permissions endpoints
- `src/inmobiliaria/agency/dto/update-permissions.dto.ts` - UpdatePermissionsDto with nullable AgencyPermissions
- 13 controllers updated with AgencyPermissionGuard + @RequirePermission annotations

## Decisions Made

- JSONB + null pattern: `permissions=null` means role defaults, only write custom data when needed. Avoids storing redundant permission objects for most members.
- Extended `AgencyMemberGuard` (not a separate DB query) to include permissions select — avoids an extra query per request.
- ADMIN always bypasses checks — no permission lookup overhead for admins.
- `renovaciones` and `actas` inherit `portafolio` module — they manage property portfolio sub-items.
- `mantenimiento` maps to `operaciones` module to match frontend navigation naming conventions.
- Smart null-clearing: `JSON.stringify` comparison to detect when passed permissions match role defaults, storing `null` instead.

## Deviations from Plan

None - plan executed exactly as written. One minor implementation detail: the `Prisma.JsonValue` import was adjusted from `@prisma/client/runtime/library` (unavailable) to `Prisma.JsonValue` from `@prisma/client` (Rule 3 - auto-fixed during Task 4).

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed JsonValue import path**
- **Found during:** Task 4 (AgencyPermissionGuard implementation)
- **Issue:** `@prisma/client/runtime/library` module not resolvable in tsconfig
- **Fix:** Used `Prisma.JsonValue` from `@prisma/client` directly (same type, correct import)
- **Files modified:** agency-member.guard.ts, agency-permission.guard.ts
- **Committed in:** `757fa4b` (Task 4 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking import fix)
**Impact on plan:** Minor import path fix, no scope creep.

## Issues Encountered

None beyond the import fix above.

## User Setup Required

**Database migration required.** Run:

```bash
# Apply the migration to add the permissions column
npx prisma migrate deploy
# Or for development:
npx prisma migrate dev
```

The migration adds a nullable JSONB column — no existing data is affected. All existing members start with `null` permissions (role defaults apply automatically).

## Next Phase Readiness

- Permission system complete and enforced on all 13 inmobiliaria controllers
- Plan 24-02 and 24-03 can build on this foundation (e.g., UI for permission management, additional role configuration)
- Any new inmobiliaria endpoints must include `@RequirePermission(module, action)` to be properly secured

---
*Phase: 24-roles-permissions*
*Completed: 2026-04-01*
