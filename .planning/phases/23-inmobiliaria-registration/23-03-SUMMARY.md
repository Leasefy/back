---
phase: 23
plan: "03"
subsystem: inmobiliaria-registration
tags: [testing, documentation, integration, html-test-files]
dependency_graph:
  requires: [23-01, 23-02]
  provides: [phase-23-complete]
  affects: [integracionFront]
tech_stack:
  added: []
  patterns: [public-decorator-bypass, invitation-token-flow]
key_files:
  created:
    - integracionFront is updated (not created)
  modified:
    - integracionFront/pruebaInmobiliaria.html
    - integracionFront/FRONTEND-INTEGRATION.md
    - integracionFront/BACKEND-ARCHITECTURE.md
decisions:
  - "No code changes to agency.service.ts — all 6 edge cases from plan were already correctly handled"
  - "pruebaInmobiliaria.html extended with 9 new sub-sections (12.1–12.9) covering full registration flow"
  - "Public invitation endpoints use raw fetch() without Authorization header to properly simulate unauthenticated callers"
metrics:
  duration: "~20 minutes"
  completed_date: "2026-03-10"
---

# Phase 23 Plan 03: Testing & Integration Verification Summary

## One-liner

HTML test file extended with complete inmobiliaria registration flow, FRONTEND-INTEGRATION.md and BACKEND-ARCHITECTURE.md updated with Phase 23 endpoints and error reference table.

---

## What Was Done

### Task 1: Updated `integracionFront/pruebaInmobiliaria.html`

Added section 12 "Registro e Incorporacion Inmobiliaria" with 9 subsections:

| Subsection | Endpoint | Auth |
|------------|----------|------|
| 12.1 Onboarding INMOBILIARIA | POST /users/me/onboarding | Yes |
| 12.2 Invitar Miembro | POST /inmobiliaria/agency/members | Yes (ADMIN) |
| 12.3 Info Invitacion | GET /inmobiliaria/agency/invitations/:token | No (public) |
| 12.4 Aceptar Invitacion | POST /inmobiliaria/agency/invitations/:token/accept | Yes |
| 12.5 Rechazar Invitacion | POST /inmobiliaria/agency/invitations/:token/decline | No (public) |
| 12.6 Reenviar Invitacion | POST /inmobiliaria/agency/members/:id/resend-invitation | Yes (ADMIN) |
| 12.7 Onboarding Status | GET /inmobiliaria/agency/onboarding-status | Yes |
| 12.8 Ver Mi Agencia | GET /inmobiliaria/agency | Yes |
| 12.9 Ver Miembros | GET /inmobiliaria/agency/members | Yes |

Public endpoints (12.3 and 12.5) use raw `fetch()` without `Authorization` header to correctly test the public contract.

### Task 2: Auth Guard Integration Verification (no code changes)

Reviewed three files and confirmed correctness:

- `src/auth/guards/supabase-auth.guard.ts` — Uses `Reflector.getAllAndOverride(IS_PUBLIC_KEY)` to check both handler and class metadata. Returns `true` immediately if public, skipping JWT validation. Correct.
- `src/auth/decorators/public.decorator.ts` — Exists. `@Public()` calls `SetMetadata(IS_PUBLIC_KEY, true)`. Correct.
- `src/inmobiliaria/agency/agency.controller.ts` — `@Public()` applied to `GET /invitations/:token` (line 147) and `POST /invitations/:token/decline` (line 182). `POST /invitations/:token/accept` has no `@Public()` — correctly requires auth. Admin-only operations use `ensureAdmin()` helper with `ForbiddenException`. Correct.

### Task 3: Updated `integracionFront/FRONTEND-INTEGRATION.md`

Added section "Flujo de Registro Inmobiliaria" with:
- Step-by-step TypeScript code examples for all 5 flow steps
- Full endpoint reference table with auth requirements
- Error codes table with HTTP status and message for all edge cases

### Task 4: Updated `integracionFront/BACKEND-ARCHITECTURE.md`

- Added section 4.5 InmobiliariaModule documenting all endpoints, guards, and authorization patterns
- Updated Phase Progress table (Appendix A) with all completed phases through Phase 23

### Task 5: Edge Case Verification in `agency.service.ts` (no code changes)

All 6 edge cases from the plan were already correctly handled:

| Edge Case | Where Handled | Response |
|-----------|---------------|----------|
| Expired token | `getInvitationByToken()` line 203 | 400 BadRequestException "Invitation token has expired" |
| Invalid/not found token | `getInvitationByToken()` line 199 | 404 NotFoundException "Invitation token not found or already used" |
| Token already consumed (null) | `findUnique({ where: { invitationToken: token } })` returns null | 404 via same NotFoundException |
| Double-accept prevention | `getInvitationByToken()` line 207 checks `status !== INVITED` | 400 "This invitation has already been used or is no longer valid" |
| User already member of same agency | `acceptInvitation()` lines 224-236 explicit check | 409 ConflictException "You are already a member of this agency" |
| Inviting user already member | `inviteMember()` lines 131-155 checks existing + status | 409 ConflictException "User X is already a member of this agency" |

---

## Deviations from Plan

None — plan executed exactly as written. No code fixes were needed. All edge cases were pre-existing in the service implementation from Plan 23-02.

---

## Self-Check

**Files modified exist:**
- `integracionFront/pruebaInmobiliaria.html` — verified
- `integracionFront/FRONTEND-INTEGRATION.md` — verified
- `integracionFront/BACKEND-ARCHITECTURE.md` — verified

**Source files verified (read-only):**
- `src/auth/guards/supabase-auth.guard.ts` — correct
- `src/auth/decorators/public.decorator.ts` — correct
- `src/inmobiliaria/agency/agency.controller.ts` — correct
- `src/inmobiliaria/agency/agency.service.ts` — all edge cases covered

## Self-Check: PASSED
