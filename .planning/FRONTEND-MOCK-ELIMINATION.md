# Eliminacion de Mocks — Endpoints que YA existen en el backend

**Para:** Frontend AI / equipo frontend
**Fecha:** 2026-04-04
**Objetivo:** El frontend tiene mock data para funcionalidades que el backend YA implemento. Este documento mapea cada mock a su endpoint real.

---

## TL;DR — Que hacer

| Mock del front | Endpoint backend EXISTENTE | Accion |
|----------------|---------------------------|--------|
| mock-reports.ts | 7 endpoints en `/inmobiliaria/reports/*` | Apuntar al backend |
| mock-candidates.ts | 12 endpoints en `/landlord/*` | Apuntar al backend |
| subscription-plans.ts (constants) | `GET /subscription-plans` (publico) | Apuntar al backend |
| mock-explanations.ts | `GET /scoring/:id/explanation` (tenant) + resultado en `/evaluations/:id/result` (landlord) | Apuntar al backend |
| team-data.ts (constants) | `GET /inmobiliaria/agency/members` | Apuntar al backend |
| mock-reminders.ts (config part) | `PUT /inmobiliaria/agency` (campos reminderDaysBefore/After) | Apuntar al backend |

**Mocks que SI necesitan trabajo nuevo en backend:**
- mock-reminders.ts (log de envios) → NO existe endpoint de log
- mock-briefings.ts → NO existe endpoint
- mock-decisions.ts → NO existe endpoint
- mock-chat-responses.ts → v1.4+ (no urgente)
- mock-agent-executions.ts → v1.4+ (no urgente)
- api/mock.ts (chat beta) → v1.4+ (no urgente)

---

## 1. REPORTS — Ya existen 7 endpoints

**El front mockea:** Reportes de ocupacion, cobranza, performance de agentes.
**El backend tiene:** TODO implementado.

| Reporte | Endpoint | Method | Auth |
|---------|----------|--------|------|
| Extracto propietario | `/inmobiliaria/reports/extracto/:propietarioId?month=2026-04` | GET | AgencyMember + `reportes:view` |
| Cartera (aging) | `/inmobiliaria/reports/cartera` | GET | AgencyMember + `reportes:view` |
| Comisiones agentes | `/inmobiliaria/reports/comisiones?month=2026-04` | GET | AgencyMember + `reportes:view` |
| Ocupacion | `/inmobiliaria/reports/ocupacion` | GET | AgencyMember + `reportes:view` |
| Vencimientos contratos | `/inmobiliaria/reports/vencimientos` | GET | AgencyMember + `reportes:view` |
| Flujo de caja | `/inmobiliaria/reports/flujo-caja?months=6` | GET | AgencyMember + `reportes:view` |
| Rendimiento agentes | `/inmobiliaria/reports/rendimiento-agentes?month=2026-04` | GET | AgencyMember + `reportes:view` |

**Header requerido:** `x-agency-id: {agencyId}` (como todos los endpoints de inmobiliaria)

### Responses de referencia

**Ocupacion:**
```json
{
  "totalProperties": 45,
  "totalOccupied": 38,
  "overallOccupancyRate": 0.844,
  "zones": [
    { "zone": "Chapinero", "total": 12, "occupied": 10, "rate": 0.833 }
  ]
}
```

**Cartera:**
```json
{
  "items": [
    {
      "cobroId": "uuid", "propertyTitle": "Apto 301", "tenantName": "Juan",
      "month": "2026-04", "daysLate": 15, "totalAmount": 1500000,
      "paidAmount": 0, "pendingAmount": 1500000, "status": "LATE"
    }
  ],
  "summary": {
    "totalPending": 4500000,
    "bucket0to30": 3000000, "bucket31to60": 1000000,
    "bucket61to90": 500000, "bucket90plus": 0
  }
}
```

**Flujo de caja:**
```json
{
  "period": "semester",
  "months": [
    { "month": "2026-01", "ingresos": 15000000, "dispersiones": 12000000, "comisiones": 1500000 }
  ],
  "totals": { "ingresos": 90000000, "dispersiones": 72000000, "comisiones": 9000000 }
}
```

**Rendimiento agentes:**
```json
{
  "period": "2026-04",
  "agentes": [
    {
      "userId": "uuid", "assignedConsignaciones": 15,
      "activePipeline": 8, "completedDeals": 3, "avgDaysToClose": 22
    }
  ]
}
```

---

## 2. CANDIDATES — Ya existen 12 endpoints

**El front mockea:** Perfiles de candidatos con risk scores y documentos.
**El backend tiene:** CRUD completo de candidatos con scoring, notas, approve/reject.

| Accion | Endpoint | Method |
|--------|----------|--------|
| Listar TODOS los candidatos | `/landlord/candidates` | GET |
| Candidatos de una propiedad | `/landlord/properties/:propertyId/candidates` | GET |
| Detalle de candidato (con score) | `/landlord/applications/:applicationId` | GET |
| URL firmada de documento | `/landlord/applications/:applicationId/documents/:documentId/url` | GET |
| Pre-aprobar | `/landlord/applications/:applicationId/preapprove` | POST |
| Aprobar | `/landlord/applications/:applicationId/approve` | POST |
| Rechazar | `/landlord/applications/:applicationId/reject` | POST |
| Pedir mas info | `/landlord/applications/:applicationId/request-info` | POST |
| Crear/actualizar nota | `/landlord/applications/:applicationId/notes` | POST |
| Eliminar nota | `/landlord/applications/:applicationId/notes` | DELETE |
| Listar propiedades | `/landlord/properties` | GET |
| Detalle propiedad | `/landlord/properties/:propertyId` | GET |

**Auth:** Bearer token + Role LANDLORD + TeamAccessGuard
**Permiso:** `candidates:view` (lectura), `candidates:edit` (acciones)

### Response de GET /landlord/candidates
```json
{
  "candidates": [
    {
      "id": "uuid",
      "tenantName": "Maria Garcia",
      "tenantEmail": "maria@email.com",
      "propertyId": "uuid",
      "propertyTitle": "Apartamento Centro 301",
      "status": "SUBMITTED",
      "submittedAt": "2026-04-01T10:00:00Z",
      "riskScore": { "totalScore": 78, "level": "B" },
      "note": { "id": "uuid", "content": "Buen perfil", "updatedAt": "..." }
    }
  ],
  "total": 15,
  "stats": { "total": 15, "pending": 8, "approved": 5, "rejected": 2 }
}
```

### Response de GET /landlord/applications/:id (detalle completo)
```json
{
  "id": "uuid",
  "status": "SUBMITTED",
  "tenant": { "id": "uuid", "firstName": "Maria", "lastName": "Garcia", "email": "...", "phone": "..." },
  "property": { "id": "uuid", "title": "Apto 301", "monthlyRent": 1500000 },
  "riskScore": {
    "totalScore": 78, "level": "B",
    "financialScore": 22, "stabilityScore": 20, "historyScore": 18, "integrityScore": 18,
    "drivers": [{ "text": "Ingreso 4x el arriendo", "positive": true }],
    "flags": [{ "code": "LOW_TENURE", "severity": "MEDIUM", "message": "Menos de 1 ano en empleo actual" }],
    "conditions": [{ "type": "DEPOSIT", "message": "Deposito adicional de 1 mes", "required": false }]
  },
  "documents": [{ "id": "uuid", "type": "CEDULA", "originalName": "cedula.pdf", "createdAt": "..." }],
  "timeline": [{ "id": "uuid", "type": "SUBMITTED", "createdAt": "...", "actor": { "firstName": "Maria" } }],
  "note": null
}
```

---

## 3. SUBSCRIPTION PLANS — Ya existe endpoint publico

**El front tiene:** `subscription-plans.ts` con pricing hardcodeado.
**El backend tiene:** Endpoint publico con pricing dinamico desde la DB.

| Accion | Endpoint | Auth |
|--------|----------|------|
| Listar planes | `GET /subscription-plans` | Publico (sin auth) |
| Filtrar por tipo | `GET /subscription-plans?planType=LANDLORD` | Publico |
| Detalle de plan | `GET /subscription-plans/:id` | Publico |

### Response de GET /subscription-plans?planType=LANDLORD
```json
[
  {
    "id": "uuid", "planType": "LANDLORD", "tier": "STARTER",
    "name": "Landlord Starter", "monthlyPrice": 0, "annualPrice": 0,
    "maxProperties": 1, "hasPremiumScoring": false,
    "evaluationCreditPrice": 42000
  },
  {
    "id": "uuid", "planType": "LANDLORD", "tier": "PRO",
    "name": "Landlord Pro", "monthlyPrice": 149000, "annualPrice": 1430000,
    "maxProperties": -1, "hasPremiumScoring": true,
    "evaluationCreditPrice": 21000
  },
  {
    "id": "uuid", "planType": "LANDLORD", "tier": "FLEX",
    "name": "Landlord Flex", "monthlyPrice": 0, "annualPrice": 0,
    "maxProperties": -1, "hasPremiumScoring": true,
    "evaluationCreditPrice": 0
  }
]
```

**Nota:** `evaluationCreditPrice` es campo nuevo de v1.3. `maxProperties: -1` = ilimitado.

---

## 4. EXPLANATIONS (Explicabilidad IA)

**El front mockea:** Explicaciones de IA por nivel de riesgo (A/B/C/D).
**El backend tiene:** Explicabilidad completa (Phase 21).

### Para TENANTS (acceso directo al scoring):
```
GET /scoring/:applicationId/explanation
```
Requiere: Bearer token, tenant owner, PRO o FLEX subscription.

Response incluye: `narrative` (texto IA en espanol), `drivers`, `flags`, `conditions`, `subscores`.

### Para LANDLORDS (via evaluacion):
```
GET /evaluations/:applicationId/result
```
Cuando `status: "COMPLETED"`, el campo `result` contiene el JSON completo del microservicio de agentes, que incluye scoring + explicabilidad.

**El front NO necesita mock-explanations.ts** — los datos vienen del scoring engine (tenant) o del resultado de evaluacion (landlord).

---

## 5. TEAM MEMBERS — Ya existe endpoint

**El front tiene:** `team-data.ts` con 3 miembros hardcodeados.
**El backend tiene:** CRUD completo de miembros.

| Accion | Endpoint | Auth |
|--------|----------|------|
| Listar miembros | `GET /inmobiliaria/agency/members` | AgencyMember |
| Invitar | `POST /inmobiliaria/agency/members` | Admin |
| Cambiar rol | `PUT /inmobiliaria/agency/members/:id/role` | Admin |
| Permisos | `GET /inmobiliaria/agency/members/:id/permissions` | Admin |
| Remover | `DELETE /inmobiliaria/agency/members/:id` | Admin |

---

## 6. REMINDERS CONFIG — Parcialmente existe

**El front mockea:** Config de recordatorios + log de envios.

### Config — YA EXISTE:
Los campos `reminderDaysBefore` y `reminderDaysAfter` estan en el modelo Agency y se actualizan via:
```
PUT /inmobiliaria/agency
Body: { "reminderDaysBefore": 3, "reminderDaysAfter": 7 }
```

### Log de envios — NO EXISTE:
No hay endpoint que muestre "recordatorio enviado a Juan el 2026-04-01". Esto necesita trabajo nuevo en backend.

---

## 7. IPC (Indice de Precios al Consumidor)

**El front tiene:** `inmobiliaria-data.ts` con IPC historico hardcodeado (24 meses).

**El backend NO tiene endpoint de IPC.** Opciones:
- Mantener hardcodeado en el front (es data publica, cambia 1x/mes)
- Futuro: endpoint `GET /inmobiliaria/ipc/current` que scrape datos del DANE

**Recomendacion:** Dejarlo hardcodeado por ahora. No justifica un endpoint.

---

## Resumen — Que queda pendiente en backend

| Item | Estado | Trabajo |
|------|--------|---------|
| Reports (7 endpoints) | YA EXISTE | Front apunta a URLs correctas |
| Candidates (12 endpoints) | YA EXISTE | Front apunta a URLs correctas |
| Subscription plans | YA EXISTE | Front usa endpoint publico |
| Explanations | YA EXISTE | Front usa scoring o evaluacion segun rol |
| Team members | YA EXISTE | Front usa agency members |
| Reminders config | YA EXISTE (parcial) | Config via PUT agency, log NO existe |
| AI Activity | YA EXISTE (nuevo) | `GET /inmobiliaria/ai/activity` |
| AI Metrics | YA EXISTE (nuevo) | `GET /inmobiliaria/ai/metrics` |
| Reminders log | NO EXISTE | Trabajo nuevo |
| Briefings daily | NO EXISTE | Trabajo nuevo |
| Decisions pending | NO EXISTE | Trabajo nuevo |
| Chat AI | NO EXISTE | v1.4+ |
| Agent executions | NO EXISTE | v1.4+ |
| IPC | NO EXISTE | Mantener hardcodeado |

**De 10 mocks "Alta/Media", 7 ya estan resueltos. Solo 3 necesitan trabajo nuevo en backend (reminders log, briefings, decisions).**

---

*Generado: 2026-04-04*
