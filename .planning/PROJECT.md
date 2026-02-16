# Arriendo Facil - Backend API

## What This Is

API backend completo en NestJS para el marketplace de arriendos "Arriendo Facil" en Colombia. Proporciona APIs REST, Risk Score Engine con analisis de documentos por IA (Cohere Command R+), autenticacion via Supabase, flujo contractual con firmas digitales, sistema de pagos simulado, subscripciones, y persistencia ML. Consume el frontend Next.js existente.

## Core Value

**Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.**

El scoring es asincrono (BullMQ), explicable (drivers, flags, condiciones, narrativa IA), y preciso (IA analiza documentos reales via OCR + Cohere, no solo datos self-reported).

## Current State (v1.0 SHIPPED)

**v1.0 Backend MVP** — Shipped 2026-02-16

- 416 archivos TypeScript, 37,537 LOC + 2,140 Prisma schema
- 26 fases, 81 plans, 364 commits, 25 dias
- 176/176 requisitos satisfechos
- Stack: NestJS 11 + Prisma 7 + Supabase (PostgreSQL + Auth + Storage) + BullMQ + Cohere + Tesseract.js
- Tier system: FREE (Phases 1-19), PRO+ (Phases 20-22)

### Capacidades Implementadas

| Dominio | Descripcion |
|---------|-------------|
| Auth & Roles | Supabase OAuth, JWT JWKS, TENANT/LANDLORD/AGENT/ADMIN, PropertyAccessService |
| Propiedades | CRUD, imagenes, busqueda con NLP, visitas con scheduling |
| Aplicaciones | Wizard 6 pasos, documentos, state machine, chat |
| Scoring | 4 modelos + payment history bonus + document verification bonus |
| IA (PRO+) | OCR (Tesseract.js) + Cohere Command R+ para 4 tipos de documento |
| Explicabilidad (PRO+) | Drivers, flags, condiciones, narrativa IA en espanol |
| ML Persistence (PRO+) | Feature snapshots, prediction logs, outcome tracking, CSV export |
| Contratos | Templates Handlebars, firmas digitales Ley 527, PDF |
| Leases & Pagos | Creacion automatica, pagos simulados, validacion, disputas, PSE mock |
| Notificaciones | Email (Resend) + Push (Firebase), 22+ templates, event-driven |
| Subscripciones | FREE/PRO/BUSINESS, cupones, micropagos, enforcement |
| Inmobiliaria | Agencias, propietarios, consignaciones, pipeline, cobros, dispersiones |
| Frontend Parity | Wishlist, document vault, preferences, coupons, dashboard, recommendations |

## Requirements

### Validated (v1.0)

- FUND-01 to FUND-06 — v1.0 (Foundation)
- AUTH-01 to AUTH-06 — v1.0 (Authentication)
- USER-01 to USER-04 — v1.0 (Users)
- PROP-01 to PROP-16 — v1.0 (Properties)
- ROLE-01 to ROLE-05 — v1.0 (User Roles)
- AGENT-01 to AGENT-06 — v1.0 (Property Agents)
- CHAT-01 to CHAT-05 — v1.0 (Application Chat)
- VISIT-01 to VISIT-12 — v1.0 (Property Visits)
- APPL-01 to APPL-13 — v1.0 (Applications)
- DOCS-01 to DOCS-08 — v1.0 (Documents)
- SCOR-01 to SCOR-09 — v1.0 (Scoring Engine)
- AIDOC-01 to AIDOC-08 — v1.0 (AI Document Analysis)
- EXPL-01 to EXPL-05 — v1.0 (Explainability)
- LAND-01 to LAND-10 — v1.0 (Landlord Features)
- NOTF-01 to NOTF-11 — v1.0 (Notifications)
- MLPR-01 to MLPR-04 — v1.0 (ML Persistence)
- SUBS-01 to SUBS-08 — v1.0 (Subscriptions)
- CONT-01 to CONT-10 — v1.0 (Contracts)
- LEAS-01 to LEAS-08 — v1.0 (Leases & Payments)
- PHSC-01 to PHSC-06 — v1.0 (Payment History Scoring)
- TPAY-01 to TPAY-12 — v1.0 (Tenant Payment Simulation)
- INSU-01 to INSU-04 — v1.0 (Insurance)

**Total validated: 176 requirements**

### Active

(Pending — defined with next milestone via `/gsd:new-milestone`)

### Out of Scope

- **Pagos reales** — MVP valida flujo con PSE mock, integracion real despues
- **Integraciones buro (Datacredito)** — Solo scoring interno + IA
- **Multi-pais** — Solo Colombia (COP, documentos colombianos)
- **Frontend changes** — Solo backend, frontend se adapta despues
- **ML real para scoring** — Reglas + IA, datos guardados para futuro ML

## Context

### Tech Stack (v1.0)

- **Framework:** NestJS 11 + TypeScript strict
- **ORM:** Prisma 7 con adapter-pg
- **Database:** PostgreSQL via Supabase
- **Auth:** Supabase Auth (Google OAuth → JWT → JWKS validation)
- **Storage:** Supabase Storage (property-images, application-documents, contracts)
- **Queue:** BullMQ con Upstash Redis
- **AI:** Cohere Command R+ (analisis documentos, narrativas)
- **OCR:** Tesseract.js (local, gratis) + pdf-parse
- **Email:** Resend
- **Push:** Firebase Cloud Messaging
- **PDF:** Puppeteer + Handlebars templates

### Known Tech Debt (v1.0)

- BullMQ forRootAsync() duplicado en ScoringModule y AiModule
- No hay E2E integration tests para flujos cross-phase
- No hay catalogo de eventos documentado
- 4 fases sin VERIFICATION.md formal (2.2, 3.2, 12, 20)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS sobre Express puro | Estructura, DI, decoradores, ecosystem maduro | Good |
| Supabase todo-en-uno | Simplifica infra: DB + Auth + Storage + Realtime | Good |
| Prisma 7 sobre TypeORM | Type-safe, consistente con frontend, mejor DX | Good |
| Cohere sobre Claude/GPT | Free tier, suficiente para MVP, pagos reservados para futuro | Good |
| REST sobre GraphQL | Simplicidad para MVP, frontend ya espera REST | Good |
| BullMQ para scoring async | Industry standard, retries, Redis-backed | Good |
| Event-driven architecture | Desacopla modulos, multiple listeners por evento | Good |
| Tier system FREE/PRO+ | IA features solo para pagos, reglas gratis para todos | Good |
| PropertyAccessService | Punto unico de autorizacion para landlord/agent | Good |
| Firmas digitales Ley 527 | Compliance colombiano para contratos | Good |

---
*Created: 2026-01-22*
*Last updated: 2026-02-16 after v1.0 milestone*
