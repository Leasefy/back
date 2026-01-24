# Research Summary: Arriendo Fácil Backend

**Date:** 2026-01-24
**Domain:** NestJS Backend for Rental Marketplace with AI Document Analysis
**Overall Confidence:** HIGH

---

## Executive Summary

La investigación valida el stack propuesto y proporciona una guía clara para implementación:

| Área | Decisión | Confianza |
|------|----------|-----------|
| **Framework** | NestJS 10.x | HIGH |
| **ORM** | Prisma 5.x | HIGH |
| **Database** | Supabase PostgreSQL | HIGH |
| **Auth** | Supabase Auth | HIGH |
| **Storage** | Supabase Storage | HIGH |
| **Queue** | BullMQ + Redis | HIGH |
| **Email** | Resend | HIGH |
| **AI Docs** | Claude 3.5 Sonnet | HIGH |

### Hallazgo Clave: Análisis de Documentos con IA

**Claude 3.5 Sonnet es la mejor opción** para análisis de documentos:
- Costo: ~$0.02/documento (vs $0.05-0.15 con Textract)
- Análisis semántico incluido (detecta inconsistencias)
- Detección de fraude incluida
- Excelente español colombiano
- Una sola integración

**Costo proyectado:** ~$80-200/mes para 1,000 aplicaciones

---

## Stack Validado

```
┌─────────────────────────────────────────────────┐
│                    NestJS 10.x                   │
│  ┌─────────┐  ┌─────────┐  ┌─────────────────┐  │
│  │ Prisma  │  │ BullMQ  │  │ Claude Sonnet   │  │
│  │   5.x   │  │   5.x   │  │ (Document AI)   │  │
│  └────┬────┘  └────┬────┘  └────────┬────────┘  │
│       │            │                │            │
│       ▼            ▼                ▼            │
│  ┌─────────────────────────────────────────┐    │
│  │              Supabase                    │    │
│  │  PostgreSQL │ Auth │ Storage │ Realtime │    │
│  └─────────────────────────────────────────┘    │
└─────────────────────────────────────────────────┘
```

---

## Research Files

| File | Purpose | Key Takeaway |
|------|---------|--------------|
| `STACK.md` | Stack tecnológico validado | NestJS + Prisma + Supabase + BullMQ + Resend |
| `FEATURES.md` | Features table stakes vs diferenciadores | Scoring + AI Docs = moat competitivo |
| `ARCHITECTURE.md` | Patrones de arquitectura NestJS | Modular + Repository + Engine pattern |
| `AI_DOCUMENT_ANALYSIS.md` | Comparación AI para documentos | Claude Sonnet > GPT-4V > Textract |

---

## Implications for Roadmap

### Fases Sugeridas (Build Order)

| Fase | Nombre | Qué Incluye | Dependencia |
|------|--------|-------------|-------------|
| 1 | Foundation | Scaffold, Config, Prisma, Supabase setup | - |
| 2 | Auth & Users | Supabase Auth, Guards, Users CRUD | 1 |
| 3 | Properties | CRUD, Filtering, Images | 2 |
| 4 | Applications Core | CRUD, State Machine, Documents | 3 |
| 5 | Scoring Engine Basic | Features, Models, Aggregator | 4 |
| 6 | Document Analysis | Claude integration, Analyzer | 5 |
| 7 | Scoring Complete | Full pipeline, Queue, Persistence | 6 |
| 8 | Landlord Features | Candidates, Decisions, Notes | 7 |
| 9 | Notifications | Email service, Templates, Queue | 8 |
| 10 | Polish | Swagger, Rate limiting, Logging | 9 |

### Rationale del Orden

1. **Foundation primero**: Sin esto nada funciona
2. **Auth antes de todo**: Todas las features requieren usuarios
3. **Properties antes de Applications**: No puedes aplicar sin propiedades
4. **Applications antes de Scoring**: No puedes scorear sin aplicación
5. **Scoring básico antes de AI**: Validar flujo con reglas simples
6. **AI después de scoring básico**: Es el más complejo, separar riesgo
7. **Landlord features después de scoring**: Necesitan los scores
8. **Notifications al final**: Nice-to-have, no bloquea MVP

---

## Key Decisions Validated

| Decisión | Validación | Fuente |
|----------|------------|--------|
| NestJS sobre Express | Mejor estructura, DI, ecosystem | [NestJS Docs](https://docs.nestjs.com/) |
| Prisma sobre TypeORM | Consistente con frontend, mejor DX | [Prisma Comparison](https://dev.to/sasithwarnakafonseka/best-orm-for-nestjs-in-2025-drizzle-orm-vs-typeorm-vs-prisma-229c) |
| Supabase todo-en-uno | Simplifica infra significativamente | [BaaS vs NestJS](https://ititans.com/blog/backend-choices-baas-vs-supabase-vs-nestjs/) |
| BullMQ para queues | Estándar NestJS, robust | [NestJS Queues](https://docs.nestjs.com/techniques/queues) |
| Claude para docs | Mejor precio/rendimiento, análisis semántico | Research AI_DOCUMENT_ANALYSIS.md |
| Resend para email | Simple API, React Email, pricing justo | [Resend Docs](https://resend.com/nodejs) |

---

## Risks & Mitigations

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|--------------|---------|------------|
| Claude API down | Baja | Alto | Fallback a GPT-4o |
| Supabase outage | Baja | Alto | Monitoreo, retry logic |
| Redis not available | Media | Medio | Usar Supabase Edge Functions como alternativa |
| Scoring latency | Media | Medio | Queue async, mostrar "procesando" |
| Document analysis accuracy | Media | Alto | Validación manual para casos edge |

---

## Cost Projections

### MVP (Mes 1-3)

| Servicio | Costo/mes |
|----------|-----------|
| Supabase Free | $0 |
| Redis (Upstash free) | $0 |
| Claude API (~100 apps) | $8-20 |
| Resend (3K emails) | $0 |
| **Total** | ~$20/mes |

### Growth (1,000 apps/mes)

| Servicio | Costo/mes |
|----------|-----------|
| Supabase Pro | $25 |
| Redis (Upstash) | $10 |
| Claude API | $80-200 |
| Resend | $20 |
| **Total** | ~$150-250/mes |

---

## Open Questions

1. **¿Cómo manejar documentos ilegibles?**
   - Claude reporta confidence, mostrar warning al usuario

2. **¿Rate limiting para Claude API?**
   - Implementar queue con rate limiter en BullMQ

3. **¿Caché de análisis de documentos?**
   - Sí, guardar resultado y no re-analizar mismo doc

4. **¿Manejo de documentos en idiomas diferentes?**
   - Claude maneja múltiples idiomas, pero MVP solo español

---

## Next Steps

1. **Definir REQUIREMENTS.md** basado en FEATURES.md
2. **Crear ROADMAP.md** con las 10 fases propuestas
3. **Iniciar Phase 1: Foundation**

---

*Research completed: 2026-01-24*
*Ready for requirements definition*
