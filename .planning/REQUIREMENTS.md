# Requirements: Arriendo Facil Backend

**Defined:** 2026-04-04
**Core Value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

## v1.3 Requirements

Requirements for v1.3 Subscription Restructuring & Unified Evaluations.

### Subscription Tiers

- [ ] **TIER-01**: Admin puede ver los 3 tiers actualizados (STARTER/PRO/FLEX) con nuevo pricing
- [ ] **TIER-02**: Enum SubscriptionPlan migra de FREE/PRO/BUSINESS a STARTER/PRO/FLEX sin romper suscripciones activas
- [ ] **TIER-03**: Seed data actualiza pricing: STARTER $0/mes, PRO $149,000/mes, FLEX $0/mes (billing por canon)
- [ ] **TIER-04**: Endpoints existentes de suscripciones siguen funcionando con los nuevos nombres de tier

### Evaluations

- [ ] **EVAL-01**: Landlord/inmobiliaria puede solicitar evaluacion unificada de un aplicante via nuevo endpoint
- [ ] **EVAL-02**: Backend valida plan activo y creditos/pago antes de llamar al microservicio de agentes
- [ ] **EVAL-03**: Backend llama a POST /tenant-scoring del micro de agentes con documentos y datos del aplicante
- [ ] **EVAL-04**: Backend soporta polling del resultado via GET /tenant-scoring/:runId del micro
- [ ] **EVAL-05**: Resultado de la evaluacion se almacena en DB vinculado a la aplicacion
- [ ] **EVAL-06**: STARTER paga $42,000 COP por evaluacion, PRO paga $21,000 (50% dto), FLEX ilimitado gratis
- [ ] **EVAL-07**: PRO tiene limite de 30 evaluaciones/mes; sistema lo enforce

### Agent Credits

- [ ] **CRED-01**: Tabla de creditos de agentes con saldo por usuario/agencia
- [ ] **CRED-02**: Landlord/inmobiliaria puede comprar creditos por adelantado (packs)
- [ ] **CRED-03**: Al solicitar evaluacion, puede pagar al momento O descontar de creditos existentes
- [ ] **CRED-04**: Historial de transacciones de creditos (compras, usos, saldo)

### Access Control

- [ ] **ACCS-01**: Endpoint GET /scoring/:applicationId restringido solo a tenant (dueno de la aplicacion)
- [ ] **ACCS-02**: Landlord/inmobiliaria accede a resultados de scoring unicamente a traves de la evaluacion
- [ ] **ACCS-03**: Evaluaciones protegidas por tier: requiere suscripcion activa (STARTER/PRO/FLEX)

### FLEX Billing

- [ ] **FLEX-01**: Tabla para trackear canon total administrado por agencia
- [ ] **FLEX-02**: Al procesar pago de arriendo via PSE, split automatico del 1% hacia Leasify
- [ ] **FLEX-03**: Si pago no es via PSE, agencia puede reportar canon manualmente
- [ ] **FLEX-04**: Dashboard muestra canon administrado y cobro estimado del 1%

## Future Requirements

### Agent Integration (v1.4+)

- **AGNT-01**: Smart matching integration via micro de agentes
- **AGNT-02**: Otros agentes AI (cobranza, contratos, renovaciones, etc.)
- **AGNT-03**: Feature gating de agentes por tier en backend

## Out of Scope

| Feature | Reason |
|---------|--------|
| 19 agentes AI | Viven en microservicio de agentes, no en este backend |
| Agent gating por tier | Lo maneja el micro de agentes |
| Smart matching integration | Futuro — solo tenant-scoring en v1.3 |
| PSE real | Sigue siendo mock para MVP |
| Migracion de suscripciones activas | No hay usuarios reales aun |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| TIER-01 | Phase 25 | Complete |
| TIER-02 | Phase 25 | Complete |
| TIER-03 | Phase 25 | Complete |
| TIER-04 | Phase 25 | Complete |
| ACCS-01 | Phase 25 | Complete |
| ACCS-02 | Phase 25 | Complete |
| ACCS-03 | Phase 25 | Complete |
| CRED-01 | Phase 26 | Pending |
| CRED-02 | Phase 26 | Pending |
| CRED-03 | Phase 26 | Pending |
| CRED-04 | Phase 26 | Pending |
| EVAL-01 | Phase 27 | Pending |
| EVAL-02 | Phase 27 | Pending |
| EVAL-03 | Phase 27 | Pending |
| EVAL-04 | Phase 27 | Pending |
| EVAL-05 | Phase 27 | Pending |
| EVAL-06 | Phase 27 | Pending |
| EVAL-07 | Phase 27 | Pending |
| FLEX-01 | Phase 28 | Pending |
| FLEX-02 | Phase 28 | Pending |
| FLEX-03 | Phase 28 | Pending |
| FLEX-04 | Phase 28 | Pending |

**Coverage:**
- v1.3 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-04-04*
*Last updated: 2026-04-03 — traceability updated after v1.3 roadmap (Phases 25-28)*
