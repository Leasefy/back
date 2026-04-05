# Project Milestones: Arriendo Facil Backend

## v1.0 Backend MVP (Shipped: 2026-02-16)

**Delivered:** Backend completo para marketplace de arriendos en Colombia con scoring de riesgo IA, analisis de documentos, explicabilidad, y persistencia ML.

**Phases completed:** 1-22 (81 plans total, 26 fases incluyendo 4 insertadas)

**Key accomplishments:**
- Risk Score Engine completo: 4 modelos base (financiero, estabilidad, historial, integridad) + bonus de historial de pagos + verificacion de documentos IA
- Pipeline IA: OCR (Tesseract.js) + Cohere Command R+ para analisis de documentos (cedula, carta laboral, nomina, extracto bancario) con cross-validation
- Explicabilidad: Drivers, flags, condiciones sugeridas, narrativa IA en espanol para usuarios PRO+
- ML Persistence: Feature snapshots inmutables, prediction logs, outcome tracking automatizado, exportacion CSV para entrenamiento
- Flujo contractual completo: Templates, firmas digitales (Ley 527/1999), generacion PDF, creacion automatica de lease
- Sistema de pagos simulado: Metodos de pago del landlord, requests del tenant, validacion, disputas, mock PSE
- Subscripciones y planes: FREE/PRO/BUSINESS con gating, cupones, micropagos
- Backend inmobiliaria completo: Agencias, propietarios, consignaciones, pipeline, cobros, dispersiones, mantenimiento, renovaciones, actas, reportes, analytics

**Stats:**
- 416 archivos TypeScript en src/
- 37,537 lineas de TypeScript + 2,140 lineas Prisma schema
- 26 fases, 81 plans, 364 commits
- 25 dias (22 Ene → 16 Feb 2026)

**Git range:** `6c5248e` (first commit) → `678714d` (22-02 summary)

**What's next:** Pendiente — Frontend integration, E2E tests, o v1.1 con mejoras basadas en feedback de usuarios.

## v1.3 Subscription Restructuring & Unified Evaluations (Shipped: 2026-04-04)

**Delivered:** Reestructuracion de suscripciones con modelo pay-per-evaluation y billing FLEX.

**Phases completed:** 25-28 (13 plans total, 4 fases)

**Key accomplishments:**
- Tier migration: FREE/PRO/BUSINESS → STARTER/PRO/FLEX con pricing actualizado y enum rename non-destructivo
- Agent Credits System: wallet con compra de packs via PSE mock, saldo atomico, historial paginado, deduccion anti-double-spend
- Unified Evaluation Endpoint: POST /evaluations (202 async) con orquestacion micro agentes, client-driven polling, tier-based pricing (STARTER $42k, PRO $21k, FLEX free), PRO 30/mes limit
- FLEX Billing: auto-tracking 1% canon en pagos PSE (non-blocking), reporte manual de canon, dashboard con aggregacion paralela
- Access Control: scoring basico restringido a tenant, landlord accede via evaluacion

**Stats:**
- 18 archivos TypeScript nuevos, ~963 LOC en 3 modulos nuevos
- 42,651 LOC TypeScript total + 2,363 lineas Prisma schema
- 4 fases, 13 plans
- 1 dia (04 Abr 2026)

**What's next:** Pendiente — v1.4 planning (agent integrations, E2E tests, o features basadas en feedback).

---
