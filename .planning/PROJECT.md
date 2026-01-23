# Arriendo Fácil - Backend API

## What This Is

API backend en NestJS para el marketplace de arriendos "Arriendo Fácil" en Colombia. Proporciona las APIs REST, Risk Score Engine con análisis de documentos por IA, autenticación via Supabase, y toda la lógica de negocio que consume el frontend Next.js ya construido.

## Core Value

**Ejecutar el Risk Score con análisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.**

El scoring debe ser rápido (<5 segundos), explicable (drivers claros), y preciso (IA analiza documentos reales, no solo datos self-reported).

## Requirements

### Validated

(None yet — ship to validate)

### Active

#### APIs Core
- [ ] CRUD de propiedades (crear, listar, filtrar, detalle)
- [ ] CRUD de aplicaciones (wizard 6 pasos, submit, estado)
- [ ] Gestión de candidatos (listar, detalle, decisión)
- [ ] Upload y gestión de documentos
- [ ] Timeline/eventos de aplicaciones

#### Risk Score Engine
- [ ] FeatureBuilder: extraer features de aplicación
- [ ] IntegrityEngine: detectar fraude/inconsistencias
- [ ] FinancialModel: ratio canon/ingreso + deudas
- [ ] StabilityModel: tenure laboral, tipo contrato
- [ ] HistoryModel: referencias, historial
- [ ] **DocumentAnalyzer: IA para analizar documentos** (cédulas, cartas laborales, extractos)
- [ ] Aggregator: pesos configurables → score 0-100
- [ ] Niveles A/B/C/D con recomendación textual
- [ ] Drivers explicativos (3-6 por candidato)
- [ ] Flags de riesgo
- [ ] Condiciones sugeridas

#### Autenticación & Usuarios
- [ ] Supabase Auth integration
- [ ] Roles: TENANT / LANDLORD / BOTH
- [ ] Guards y decoradores para proteger rutas
- [ ] Perfil de usuario

#### Notificaciones
- [ ] Email transaccional (aplicación recibida, aprobada, rechazada)
- [ ] Templates de email
- [ ] Queue para envío async

#### Background Jobs
- [ ] Cola para scoring (no bloquear request)
- [ ] Cola para notificaciones
- [ ] Retry logic y dead letter queue

#### Storage
- [ ] Supabase Storage para documentos
- [ ] Signed URLs para acceso seguro
- [ ] Validación de tipos de archivo

### Out of Scope

- **Pagos/contratos reales** — MVP valida flujo, transacciones después
- **Chat real-time** — Mensajes async por ahora
- **Integraciones buró reales (Datacrédito)** — Solo scoring interno + IA
- **Multi-país** — Solo Colombia (COP)
- **Frontend changes** — Solo backend, frontend se adapta después
- **ML real para scoring** — Reglas + IA para docs, guardar datos para futuro ML

## Context

### Arquitectura General

```
┌─────────────────┐     ┌─────────────────────────────────────┐
│   Frontend      │     │           Backend (NestJS)          │
│   (Next.js)     │────▶│                                     │
│   Clerk Auth    │     │  ┌─────────┐  ┌──────────────────┐  │
└─────────────────┘     │  │ REST    │  │ Risk Score       │  │
                        │  │ APIs    │  │ Engine           │  │
                        │  └────┬────┘  │  ┌────────────┐  │  │
                        │       │       │  │ Document   │  │  │
                        │       ▼       │  │ Analyzer   │  │  │
                        │  ┌─────────┐  │  │ (Claude?)  │  │  │
                        │  │ Prisma  │  │  └────────────┘  │  │
                        │  └────┬────┘  └──────────────────┘  │
                        │       │                              │
                        └───────┼──────────────────────────────┘
                                │
                        ┌───────▼───────┐
                        │   Supabase    │
                        │ ┌───────────┐ │
                        │ │ PostgreSQL│ │
                        │ ├───────────┤ │
                        │ │ Auth      │ │
                        │ ├───────────┤ │
                        │ │ Storage   │ │
                        │ ├───────────┤ │
                        │ │ Realtime  │ │
                        │ └───────────┘ │
                        └───────────────┘
```

### Frontend Existente

El frontend en `../front/` ya está construido con:
- Next.js 14 App Router
- 100+ componentes React
- Prisma schema definido
- TypeScript types para todas las entidades
- Mock data realista

**Contrato implícito:** El backend debe responder con estructuras que el frontend ya espera.

### Risk Score Algorithm

Pesos (Total: 100):
| Categoría | Peso |
|-----------|------|
| Integridad/Antifraude | 15 |
| Capacidad de pago | 35 |
| Estabilidad | 25 |
| Historial arriendo | 15 |
| **Documentos (IA)** | 10 |

Niveles:
| Nivel | Rango | Recomendación |
|-------|-------|---------------|
| A | 85-100 | Recomendado |
| B | 70-84 | Recomendado con condiciones menores |
| C | 55-69 | Condicional (codeudor/depósito) |
| D | <55 | No recomendado |

### Document Analysis (IA)

Documentos a analizar:
- **Cédula de ciudadanía** — Extraer datos, verificar consistencia
- **Carta laboral** — Extraer cargo, salario, antigüedad
- **Desprendibles de nómina** — Extraer ingresos, deducciones
- **Extractos bancarios** — Detectar ingresos recurrentes, saldo promedio
- **Referencias** — Analizar texto para sentiment/red flags

Opciones a investigar:
- Claude API (Anthropic) — Visión + análisis
- GPT-4 Vision (OpenAI)
- AWS Textract + LLM
- Google Document AI

## Constraints

- **Framework**: NestJS 10+ con TypeScript strict
- **ORM**: Prisma (consistente con frontend)
- **Database**: PostgreSQL via Supabase
- **Auth**: Supabase Auth
- **Storage**: Supabase Storage
- **Queue**: Bull/BullMQ con Redis (o Supabase Edge Functions)
- **Email**: Resend o SendGrid
- **Deploy**: Railway / Render / Fly.io (compatible con NestJS)
- **API Style**: REST (GraphQL fuera de scope para MVP)

## Data Model

Basado en `../front/prisma/schema.prisma` pero adaptado:

### User
```
id, supabaseId, email, role (TENANT|LANDLORD|BOTH),
name, phone, createdAt, updatedAt
```

### Property
```
id, ownerId, title, description, address, city, neighborhood,
priceMonthly, adminFee, bedrooms, bathrooms, area,
furnished, petFriendly, parking, availableFrom,
status (ACTIVE|RENTED|INACTIVE), createdAt
```

### PropertyImage
```
id, propertyId, url, order, createdAt
```

### Application
```
id, propertyId, applicantId, status, currentStep,
personalInfo (JSON), employmentInfo (JSON),
incomeInfo (JSON), referencesInfo (JSON),
createdAt, submittedAt
```

### ApplicationDocument
```
id, applicationId, type (ID|INCOME_PROOF|EMPLOYMENT_LETTER|BANK_STATEMENT),
filename, url, analyzedAt, analysisResult (JSON)
```

### RiskScoreResult
```
id, applicationId, totalScore, level (A|B|C|D),
recommendation, subscores (JSON), drivers (JSON),
flags (JSON), conditions (JSON),
documentAnalysis (JSON), createdAt
```

### ApplicationEvent
```
id, applicationId, type, actorId, message, metadata (JSON), createdAt
```

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| NestJS sobre Express puro | Estructura, DI, decoradores, ecosystem maduro | — Pending |
| Supabase todo-en-uno | Simplifica infra: DB + Auth + Storage + Realtime | — Pending |
| Prisma sobre TypeORM | Type-safe, consistente con frontend, mejor DX | — Pending |
| IA para documentos | Diferenciador real vs competencia, datos verificados | — Pending |
| REST sobre GraphQL | Simplicidad para MVP, frontend ya espera REST | — Pending |

---
*Last updated: 2026-01-22 after initialization*
