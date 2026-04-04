# Project State: Arriendo Facil Backend

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

**Current focus:** Phase 25 — Tier Migration & Access Control (v1.3 first phase)

## Current Position

Phase: 25 of 28 (Tier Migration & Access Control)
Plan: 2 of 3 in current phase
Status: In progress
Last activity: 2026-04-04 — Completed 25-02-PLAN.md (source code FREE/BUSINESS cleanup)

Progress: [█████████████████░░░] ~85% (v1.0+v1.1+v1.2 complete, v1.3 plans 1-2/3 done)

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1-22 | COMPLETE | v1.0 Backend MVP — 81/81 plans |
| 23. Inmobiliaria Registration | COMPLETE | 3/3 plans |
| 24. Roles & Permissions | COMPLETE | 3/3 plans — effective permissions, invitation expiry |
| 25. Tier Migration & Access Control | IN PROGRESS (2/3) | 25-01: enum+seed; 25-02: source code cleanup done |
| 26. Agent Credits System | NOT STARTED | Credit table, purchase packs, balance, history |
| 27. Unified Evaluation Endpoint | NOT STARTED | Micro agentes integration, orchestration, result storage |
| 28. FLEX Billing | NOT STARTED | Canon tracking, PSE 1% split, manual reporting |

## Accumulated Context

### Key Decisions (recent)

- 2026-04-03 | 24-03: Effective permissions endpoint collapses role hierarchy into flat permission set
- 2026-04-03 | 24-03: Invitation expiry via NestJS scheduler (cron), not BullMQ
- 2026-04-03 | Roadmap: ACCS requirements grouped with Phase 25 (tier defines access, not evaluation flow)
- 2026-04-03 | Roadmap: Micro agentes at localhost:4000 — backend calls it, never the reverse
- 2026-04-03 | 25-01: ALTER TYPE RENAME VALUE (non-destructive) over DROP+RECREATE for enum migration
- 2026-04-03 | 25-01: FLEX tier = $0/mo subscription, credits-based billing (Phase 26 handles credits)
- 2026-04-03 | 25-01: Landlord PRO = $149,000/mo with unlimited properties (changed from $149,900 + max 10)
- 2026-04-04 | 25-02: Prisma.DbNull must be used (not null literal) for nullable JSON fields in Prisma update ops

### Architecture Context (v1.3)

- Current tiers in DB: STARTER/PRO/FLEX (SubscriptionPlan enum renamed from FREE/PRO/BUSINESS — migration ready to apply)
- All source code references updated: SubscriptionPlan.STARTER/FLEX used throughout, build clean
- PlanEnforcementService handles tier limits — 25-03 will update it for STARTER/PRO/FLEX access control
- Micro agentes API: POST /tenant-scoring (202 async), GET /tenant-scoring/:runId (poll)
- PSE is mock — split is simulated, not real

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-04
Stopped at: 25-02 complete — source code FREE/BUSINESS cleanup done, build passes
Resume file: .planning/phases/25-tier-migration-access-control/25-03-PLAN.md
