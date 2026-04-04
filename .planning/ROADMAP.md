# Roadmap: Arriendo Facil Backend

## Overview

Backend API en NestJS para el marketplace de arriendos "Arriendo Facil". Provee las APIs REST, Risk Score Engine con analisis de documentos por IA (Cohere), y toda la logica de negocio que consume el frontend Next.js existente.

## Milestones

- **v1.0 Backend MVP** - Phases 1-22 (SHIPPED 2026-02-16) — [ver archivo](milestones/v1.0-ROADMAP.md)
- **v1.1 Inmobiliaria Registration** - Phase 23 (SHIPPED 2026-03-10)
- **v1.2 Roles & Permissions** - Phase 24 (SHIPPED 2026-04-03)
- **v1.3 Subscription Restructuring & Unified Evaluations** - Phases 25-28 (In Progress)

## Phases

### v1.1 Inmobiliaria Registration Flow

- [x] Phase 23: Inmobiliaria Registration & Onboarding Flow (3/3 plans) — 2026-03-10

### v1.2 Roles & Permissions

- [x] Phase 24: Granular Permissions & Team Role Enforcement (3/3 plans) — 2026-04-03 COMPLETE

### v1.3 Subscription Restructuring & Unified Evaluations

**Milestone Goal:** Reestructurar suscripciones (STARTER/PRO/FLEX) con modelo pay-per-evaluation, endpoint unificado que consume el microservicio de agentes, sistema de creditos, y billing FLEX por canon.

#### Phase 25: Tier Migration & Access Control

**Goal:** Los tiers de suscripcion reflejan el nuevo modelo STARTER/PRO/FLEX, con pricing actualizado y acceso al scoring restringido segun rol.
**Depends on:** Phase 24
**Requirements:** TIER-01, TIER-02, TIER-03, TIER-04, ACCS-01, ACCS-02, ACCS-03
**Success Criteria** (what must be TRUE):
  1. El enum SubscriptionPlan tiene los valores STARTER/PRO/FLEX y las suscripciones activas no se rompen
  2. El seed data refleja: STARTER $0/mes, PRO $149,000/mes, FLEX $0/mes (billing por canon)
  3. Todos los endpoints existentes de suscripciones responden correctamente con los nuevos nombres de tier
  4. GET /scoring/:applicationId devuelve 403 cuando lo llama un landlord o inmobiliaria
  5. Landlord/inmobiliaria solo puede ver resultados de scoring a traves de la evaluacion (no directamente)

**Plans:** 3 plans
Plans:
- [x] 25-01-PLAN.md — Rename enum FREE/PRO/BUSINESS to STARTER/PRO/FLEX (DB migration, Prisma schema, TS enum, seed data)
- [x] 25-02-PLAN.md — Update all source code references from FREE/BUSINESS to STARTER/FLEX (subscriptions service, AI controller)
- [x] 25-03-PLAN.md — Restrict scoring endpoints to tenant-only access (ACCS-01, ACCS-02)

#### Phase 26: Agent Credits System

**Goal:** Landlords e inmobiliarias pueden comprar creditos de evaluacion por adelantado, consultar su saldo, y ver el historial de transacciones.
**Depends on:** Phase 25
**Requirements:** CRED-01, CRED-02, CRED-03, CRED-04
**Success Criteria** (what must be TRUE):
  1. Existe una tabla AgentCredit con saldo por usuario/agencia; el saldo se actualiza correctamente al comprar o usar creditos
  2. Landlord/inmobiliaria puede comprar packs de creditos via endpoint y el saldo aumenta
  3. deductCredits() service method descuenta creditos atomicamente (conditional updateMany con balance >= amount); la orquestacion "pago al momento O creditos" es responsabilidad de Phase 27
  4. El historial de transacciones lista compras y usos con fecha, monto, y saldo resultante

**Plans:** 3 plans
Plans:
- [ ] 26-01-PLAN.md — Prisma schema: AgentCredit + AgentCreditTransaction models, enum, evaluationCreditPrice on SubscriptionPlanConfig, migration + seed
- [ ] 26-02-PLAN.md — AgentCreditsModule: purchase endpoint (PSE mock), balance query, atomic deductCredits service method
- [ ] 26-03-PLAN.md — Transaction history endpoint with pagination, end-to-end verification

#### Phase 27: Unified Evaluation Endpoint

**Goal:** Landlord/inmobiliaria puede solicitar una evaluacion unificada de un aplicante; el backend orquesta la llamada al microservicio de agentes, almacena el resultado, y aplica las reglas de precio y limite por tier.
**Depends on:** Phase 25, Phase 26
**Requirements:** EVAL-01, EVAL-02, EVAL-03, EVAL-04, EVAL-05, EVAL-06, EVAL-07
**Success Criteria** (what must be TRUE):
  1. POST /evaluations/:applicationId inicia una evaluacion y devuelve 202 con runId
  2. El backend llama a POST /tenant-scoring del microservicio (localhost:4000) con los documentos y datos del aplicante
  3. El backend puede hacer polling de GET /tenant-scoring/:runId hasta recibir el resultado y lo almacena en DB vinculado a la aplicacion
  4. STARTER paga $42,000 COP por evaluacion; PRO paga $21,000; FLEX no paga (ilimitado)
  5. PRO recibe error 429 al superar 30 evaluaciones en el mes calendario
  6. Solicitar una evaluacion sin suscripcion activa devuelve error de autorizacion

**Plans:** 4 plans
Plans:
- [ ] 27-01: Schema (EvaluationResult table, EvaluationTransaction table, migrations)
- [ ] 27-02: Agent microservice client (HTTP client para localhost:4000, POST /tenant-scoring, polling GET /tenant-scoring/:runId)
- [ ] 27-03: Evaluation orchestration (valida plan/creditos, llama micro, guarda resultado, emite evento)
- [ ] 27-04: Pricing enforcement (STARTER/PRO/FLEX pricing logic, PRO monthly limit, integration tests)

#### Phase 28: FLEX Billing

**Goal:** Agencias FLEX pueden trackear el canon total que administran, el sistema aplica el split del 1% en pagos PSE, y el dashboard muestra el cobro estimado.
**Depends on:** Phase 25
**Requirements:** FLEX-01, FLEX-02, FLEX-03, FLEX-04
**Success Criteria** (what must be TRUE):
  1. Existe una tabla CanonTracking que registra el canon administrado por agencia; el total se puede consultar
  2. Al procesar un pago de arriendo via PSE (mock), el sistema registra automaticamente el 1% como cobro Leasify
  3. Si el pago no es via PSE, la agencia puede reportar el canon manualmente via endpoint
  4. El dashboard FLEX muestra canon total administrado y el cobro estimado del 1%

**Plans:** 3 plans
Plans:
- [ ] 28-01: Schema (CanonTracking table, migrations)
- [ ] 28-02: PSE split logic (1% capture en mock PSE, reporte manual de canon)
- [ ] 28-03: FLEX dashboard endpoint (canon total, cobro estimado, historial)

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
| v1.2 Roles & Permissions | 1 | 3/3 | Complete | 2026-04-03 |
| v1.3 Subscription Restructuring & Unified Evaluations | 4 | 3/13 | In Progress | - |

## External Services

| Service | Purpose | Env Var | Tier |
|---------|---------|---------|------|
| Supabase | DB + Auth + Storage | DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY | All |
| Upstash Redis | BullMQ queues | REDIS_URL | All |
| Cohere | Document analysis (Command R+) | COHERE_API_KEY | PRO+ |
| Resend | Email | RESEND_API_KEY | All |
| Firebase | Push notifications | FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL | All |
| Micro Agentes | Tenant scoring AI | AGENTS_BASE_URL (localhost:4000) | STARTER/PRO/FLEX |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-04-03 — v1.3 roadmap added (Phases 25-28). Phase 26 revised (SC-3 scoped to deductCredits only).*
