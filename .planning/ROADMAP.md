# Roadmap: Arriendo Facil Backend

## Overview

Backend API en NestJS para el marketplace de arriendos "Arriendo Facil". Provee las APIs REST, Risk Score Engine con analisis de documentos por IA (Cohere), y toda la logica de negocio que consume el frontend Next.js existente.

## Milestones

- **v1.0 Backend MVP** - Phases 1-22 (SHIPPED 2026-02-16) — [ver archivo](milestones/v1.0-ROADMAP.md)

## Phases

### v1.1 Inmobiliaria Registration Flow

- [x] Phase 23: Inmobiliaria Registration & Onboarding Flow (3/3 plans) — 2026-03-10

<details>
<summary>v1.0 Backend MVP (Phases 1-22) — SHIPPED 2026-02-16</summary>

- [x] Phase 1: Foundation (3/3 plans) — 2026-01-25
- [x] Phase 2: Auth & Users (3/3 plans) — 2026-01-26
- [x] Phase 2.1: User Roles & Agents (4/4 plans) — 2026-02-05 [INSERTED]
- [x] Phase 2.2: Inmobiliaria Backend (8/8 plans) — 2026-02-13 [INSERTED]
- [x] Phase 3: Properties (4/4 plans) — 2026-01-29
- [x] Phase 3.1: Property Visits (4/4 plans) — 2026-02-03 [INSERTED]
- [x] Phase 3.2: Natural Search (1/1 plan) — 2026-02-03 [INSERTED]
- [x] Phase 4: Applications & Documents (5/5 plans) — 2026-01-29
- [x] Phase 5: Scoring Engine (3/3 plans) — 2026-01-30
- [x] Phase 6: Landlord Features (3/3 plans) — 2026-02-01
- [x] Phase 7: Contracts (4/4 plans) — 2026-02-01
- [x] Phase 8: Leases & Payments (3/3 plans) — 2026-02-02
- [x] Phase 9: Payment History Scoring (2/2 plans) — 2026-02-02
- [x] Phase 10: Tenant Payment Simulation (6/6 plans) — 2026-02-02
- [x] Phase 11: Notifications (5/5 plans) — 2026-02-03
- [x] Phase 12: Subscriptions & Plans (4/4 plans) — 2026-02-04
- [x] Phase 13: Insurance (2/2 plans) — 2026-02-04
- [x] Phase 14: Wishlist & Favorites (1/1 plan) — 2026-02-07
- [x] Phase 15: Tenant Documents Vault (2/2 plans) — 2026-02-08
- [x] Phase 16: Tenant Preferences & Profile (2/2 plans) — 2026-02-07
- [x] Phase 17: Coupons & Discounts (2/2 plans) — 2026-02-08
- [x] Phase 18: Dashboard & Activity Log (3/3 plans) — 2026-02-08
- [x] Phase 19: Property Recommendations (2/2 plans) — 2026-02-08
- [x] Phase 20: AI Document Analysis (1/1 plan) — 2026-02-15 [PRO+]
- [x] Phase 21: Explainability (2/2 plans) — 2026-02-15 [PRO+]
- [x] Phase 22: ML Persistence (2/2 plans) — 2026-02-16 [PRO+]

</details>

## Progress

| Milestone | Phases | Plans | Status | Shipped |
|-----------|--------|-------|--------|---------|
| v1.0 Backend MVP | 26 | 81/81 | Complete | 2026-02-16 |
| v1.1 Inmobiliaria Registration | 1 | 3/3 | Complete | 2026-03-10 |

## External Services

| Service | Purpose | Env Var | Tier |
|---------|---------|---------|------|
| Supabase | DB + Auth + Storage | DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY | All |
| Upstash Redis | BullMQ queues | REDIS_URL | All |
| Cohere | Document analysis (Command R+) | COHERE_API_KEY | PRO+ |
| Resend | Email | RESEND_API_KEY | All |
| Firebase | Push notifications | FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL | All |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-03-10 — v1.1 Inmobiliaria Registration SHIPPED. Phase 23 complete.*
