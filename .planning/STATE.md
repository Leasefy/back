# Project State: Arriendo Facil Backend

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-04)

**Core value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

**Current focus:** Phase 25 — Tier Migration & Access Control (v1.3 first phase)

## Current Position

Phase: 25 of 28 (Tier Migration & Access Control)
Plan: 0 of 3 in current phase
Status: Ready to plan
Last activity: 2026-04-03 — v1.3 roadmap created (Phases 25-28, 22 requirements mapped)

Progress: [████████████████░░░░] ~80% (v1.0+v1.1+v1.2 complete, v1.3 starting)

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1-22 | COMPLETE | v1.0 Backend MVP — 81/81 plans |
| 23. Inmobiliaria Registration | COMPLETE | 3/3 plans |
| 24. Roles & Permissions | COMPLETE | 3/3 plans — effective permissions, invitation expiry |
| 25. Tier Migration & Access Control | NOT STARTED | STARTER/PRO/FLEX, pricing, scoring access control |
| 26. Agent Credits System | NOT STARTED | Credit table, purchase packs, balance, history |
| 27. Unified Evaluation Endpoint | NOT STARTED | Micro agentes integration, orchestration, result storage |
| 28. FLEX Billing | NOT STARTED | Canon tracking, PSE 1% split, manual reporting |

## Accumulated Context

### Key Decisions (recent)

- 2026-04-03 | 24-03: Effective permissions endpoint collapses role hierarchy into flat permission set
- 2026-04-03 | 24-03: Invitation expiry via NestJS scheduler (cron), not BullMQ
- 2026-04-03 | Roadmap: ACCS requirements grouped with Phase 25 (tier defines access, not evaluation flow)
- 2026-04-03 | Roadmap: Micro agentes at localhost:4000 — backend calls it, never the reverse

### Architecture Context (v1.3)

- Current tiers in DB: FREE/PRO/BUSINESS (SubscriptionPlan enum + SubscriptionPlanConfig table)
- PlanEnforcementService handles tier limits — needs update for STARTER/PRO/FLEX
- Micro agentes API: POST /tenant-scoring (202 async), GET /tenant-scoring/:runId (poll)
- PSE is mock — split is simulated, not real

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-04-03
Stopped at: v1.3 roadmap created — ready to plan Phase 25
Resume file: None
