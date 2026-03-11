---
phase: 23
plan: "02"
subsystem: inmobiliaria-registration
tags: [agency, invitations, token, email, onboarding]
dependency_graph:
  requires: [23-01-agency-member-invitation-fields]
  provides: [agency-invitation-token-system, onboarding-checklist-endpoint]
  affects: [agency-service, agency-controller, email-service, agency-module]
tech_stack:
  added: []
  patterns: [token-based-invitation, public-endpoints, fire-and-forget-email]
key_files:
  created:
    - src/inmobiliaria/agency/dto/invitation-info-response.dto.ts
  modified:
    - src/inmobiliaria/agency/agency.service.ts
    - src/inmobiliaria/agency/agency.controller.ts
    - src/inmobiliaria/agency/agency.module.ts
    - src/inmobiliaria/agency/dto/index.ts
    - src/notifications/services/email.service.ts
decisions:
  - "userId remains required (not nullable) — inviting non-registered users deferred; existing NotFoundException behavior preserved"
  - "Email sending wrapped in try/catch in AgencyService — email failure never breaks invitation creation"
  - "resendInvitation email only sent when invitedEmail field is populated on the member record"
  - "getOnboardingStatus included in Task 1 service + Task 3 controller commit rather than separate task"
  - "NotificationsModule imported into AgencyModule to provide EmailService without circular deps"
metrics:
  duration: "18 minutes"
  completed: "2026-03-10"
---

# Phase 23 Plan 02: Sistema de Invitaciones por Token Summary

**One-liner:** Token-based invitation system with accept/decline endpoints, email notifications via Brevo, and onboarding checklist — members can now activate from INVITED to ACTIVE via secure UUID token links.

## What Was Built

Complete invitation lifecycle for agency members: generate UUID token on invite, validate/accept/decline via token, resend with regenerated token, and fire-and-forget HTML email via existing Brevo SMTP transport. Also added a 5-step onboarding checklist endpoint for the agency dashboard.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | AgencyService: token methods + email injection + onboarding status | `395d502` | agency.service.ts, agency.module.ts |
| 2 | InvitationInfoResponseDto + export | `31a16b8` | invitation-info-response.dto.ts, dto/index.ts |
| 3 | AgencyController: 4 invitation endpoints + onboarding-status | `f2d0601` | agency.controller.ts |
| 4 | Onboarding status endpoint (included in Tasks 1 + 3) | — | — |
| 5 | EmailService: sendAgencyInvitationEmail method | `267ddc2` | email.service.ts |

## Key Implementation Details

### Invitation Flow

```
POST /inmobiliaria/agency/members  (admin, authenticated)
→ agencyService.inviteMember()
  → crypto.randomUUID() → token, 7-day expiry stored in AgencyMember
  → emailService.sendAgencyInvitationEmail() (fire-and-forget)
  → returns AgencyMember with invitationToken

GET /inmobiliaria/agency/invitations/:token  (@Public)
→ agencyService.getInvitationByToken()
  → validates: exists, not expired, status === INVITED
  → returns InvitationInfoResponseDto { agencyName, agencyCity, role, invitedEmail, expiresAt }

POST /inmobiliaria/agency/invitations/:token/accept  (auth required)
→ agencyService.acceptInvitation(token, userId)
  → links userId, status = ACTIVE, token = null, expiresAt = null

POST /inmobiliaria/agency/invitations/:token/decline  (@Public)
→ agencyService.declineInvitation(token)
  → status = INACTIVE, token = null, expiresAt = null

POST /inmobiliaria/agency/members/:memberId/resend-invitation  (admin, authenticated)
→ agencyService.resendInvitation(memberId, agencyId)
  → new randomUUID token, new 7-day expiry
  → re-sends email if invitedEmail is set
```

### Token Lifecycle

- Generated: `crypto.randomUUID()` (native Node.js, no dependency)
- Stored: `invitationToken` field (unique) on `AgencyMember`
- Consumed: set to `null` on accept OR decline — prevents reuse
- Expiry: `invitationExpiresAt` field — checked on every token validation

### Onboarding Checklist (5 Steps)

```typescript
steps: [
  { key: 'agency_created',  complete: true },                         // always
  { key: 'agency_profile',  complete: address && nit },               // profile filled
  { key: 'first_member',    complete: activeMembers.length > 1 },     // 1+ invited
  { key: 'logo_uploaded',   complete: Boolean(logoUrl) },             // logo exists
  { key: 'first_property',  complete: consignaciones._count > 0 },    // first listing
]
// + completedCount, completionPercent (0-100), isComplete
```

### Email Template

HTML email via Brevo SMTP — styled CTA button, agency name, role, expiry date in Spanish locale, plain-text fallback. Invitation link: `${FRONTEND_URL}/invitacion/${token}` with fallback to `http://localhost:3001`.

### Route Ordering (No Shadowing)

New routes placed before `:memberId` param routes in controller:
1. `GET members` — list members
2. `POST members` — invite member
3. `GET onboarding-status` — checklist (new)
4. `GET invitations/:token` — token info (new, @Public)
5. `POST invitations/:token/accept` — accept (new)
6. `POST invitations/:token/decline` — decline (new, @Public)
7. `POST members/:memberId/resend-invitation` — resend (new)
8. `PUT members/:memberId/role` — change role
9. `DELETE members/:memberId` — remove

## Deviations from Plan

### Auto-handled: userId remains required (not nullable)

**Found during:** Task 1 analysis

**Issue:** The plan mentioned "if user doesn't exist: create AgencyMember without userId" but `userId` is `String` (not `String?`) in the Prisma schema — making it NOT NULL at the DB level. Making it nullable would require a schema migration (Rule 4: architectural change).

**Decision:** Kept existing behavior — `inviteMember()` still throws `NotFoundException` when email not found on platform. The `invitedEmail` field is still populated for found users (enables email resend). Inviting non-registered users deferred to a future plan if needed.

**Impact:** No schema migration required; no breaking change.

### Auto-included: getOnboardingStatus in same commit as invitation methods

**Found during:** Task 4 planning

**Decision:** The onboarding-status service method and controller endpoint were naturally grouped with the other new AgencyService methods and controller endpoints rather than separate commits, since they shared the same files and had no independent verification step.

## Self-Check

### Files Verified
- [x] `src/inmobiliaria/agency/agency.service.ts` — FOUND (token methods, email injection, onboarding status)
- [x] `src/inmobiliaria/agency/agency.controller.ts` — FOUND (5 new endpoints)
- [x] `src/inmobiliaria/agency/agency.module.ts` — FOUND (NotificationsModule import)
- [x] `src/inmobiliaria/agency/dto/invitation-info-response.dto.ts` — FOUND
- [x] `src/inmobiliaria/agency/dto/index.ts` — FOUND (InvitationInfoResponseDto exported)
- [x] `src/notifications/services/email.service.ts` — FOUND (sendAgencyInvitationEmail method)

### Commits Verified
- [x] `395d502` — feat(23-02): add token-based invitation methods to AgencyService
- [x] `31a16b8` — feat(23-02): add InvitationInfoResponseDto for public invitation endpoint
- [x] `f2d0601` — feat(23-02): add invitation and onboarding-status endpoints to AgencyController
- [x] `267ddc2` — feat(23-02): add sendAgencyInvitationEmail to EmailService

### TypeScript
- [x] `npx tsc --noEmit` passes with zero errors

## Self-Check: PASSED
