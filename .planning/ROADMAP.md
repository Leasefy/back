# Roadmap: Arriendo Facil Backend

## Overview

Backend API en NestJS para el marketplace de arriendos "Arriendo Facil". Provee las APIs REST, Risk Score Engine con analisis de documentos por IA (Claude), y toda la logica de negocio que consume el frontend Next.js existente.

## Milestones

- **v1.0 Backend MVP** - Phases 1-10 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: Foundation** - Project scaffold, Prisma, Supabase config ✓
- [ ] **Phase 2: Auth & Users** - Supabase Auth, guards, user management
- [ ] **Phase 3: Properties** - CRUD, filtering, image upload
- [ ] **Phase 4: Applications & Documents** - Wizard, state machine, document upload
- [ ] **Phase 5: Scoring Engine** - Feature extraction, models, aggregator
- [ ] **Phase 6: AI Document Analysis** - Claude integration, document analyzers
- [ ] **Phase 7: Explainability** - Drivers, flags, conditions, AI explanation
- [ ] **Phase 8: Landlord Features** - Candidates, decisions, notes
- [ ] **Phase 9: Notifications** - Email service, templates, queue
- [ ] **Phase 10: ML Persistence** - Feature logging, outcome tracking

## Phase Details

### Phase 1: Foundation
**Goal**: NestJS project configured and deployable with Supabase connection
**Depends on**: Nothing (first phase)
**Requirements**: FUND-01 through FUND-06
**Success Criteria** (what must be TRUE):
  1. `npm run start:dev` starts development server without errors
  2. `npm run build` completes successfully
  3. Prisma connected to Supabase PostgreSQL
  4. Environment variables validated on startup
  5. Swagger docs accessible at /api
  6. Health check returns 200 at /health
**Research**: Complete (01-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md - Scaffold NestJS project with strict mode and environment validation
- [x] 01-02-PLAN.md - Configure Prisma ORM with Supabase PostgreSQL
- [x] 01-03-PLAN.md - Add exception filter, Swagger docs, and health check endpoint

### Phase 2: Auth & Users
**Goal**: Users can authenticate and manage profiles with role-based access
**Depends on**: Phase 1
**Requirements**: AUTH-01 through AUTH-06, USER-01 through USER-04
**Success Criteria** (what must be TRUE):
  1. User can register via Supabase Auth
  2. User can login and receive JWT
  3. Protected routes reject unauthenticated requests
  4. User role (TENANT/LANDLORD) enforced on routes
  5. User profile synced and updatable
**Research**: Unlikely (Supabase Auth well documented)
**Plans**: TBD

### Phase 3: Properties
**Goal**: Landlords can manage properties, anyone can browse
**Depends on**: Phase 2
**Requirements**: PROP-01 through PROP-12
**Success Criteria** (what must be TRUE):
  1. Landlord can CRUD own properties
  2. Property images uploaded to Supabase Storage
  3. Public can list/filter properties without auth
  4. Filters work: city, price, bedrooms, amenities
  5. Property detail returns complete data
  6. Landlord can view own property list
**Research**: Unlikely (standard CRUD)
**Plans**: TBD

### Phase 4: Applications & Documents
**Goal**: Complete application submission flow with document upload
**Depends on**: Phase 3
**Requirements**: APPL-01 through APPL-13, DOCS-01 through DOCS-08
**Success Criteria** (what must be TRUE):
  1. Tenant can create and progress through 6-step wizard
  2. Each step data persisted to database
  3. Documents uploaded to Supabase Storage
  4. State machine enforces valid transitions only
  5. State transitions logged to events table
  6. Tenant can view own applications and timeline
  7. Tenant can withdraw application
**Research**: Likely (state machine patterns)
**Research topics**: XState vs custom state machine, best practices
**Plans**: TBD

### Phase 5: Scoring Engine
**Goal**: Basic risk scoring with rule-based models
**Depends on**: Phase 4
**Requirements**: SCOR-01 through SCOR-09
**Success Criteria** (what must be TRUE):
  1. FeatureBuilder extracts features from application
  2. FinancialModel calculates rent-to-income and capacity score
  3. StabilityModel evaluates employment stability
  4. HistoryModel evaluates references
  5. IntegrityEngine detects basic inconsistencies
  6. Aggregator combines subscores -> 0-100 score
  7. Score determines level A/B/C/D
  8. Scoring runs async via BullMQ
  9. Results persisted to RiskScoreResult table
**Research**: Likely (scoring algorithm weights, validation)
**Research topics**: Weight calibration, edge cases
**Plans**: TBD

### Phase 6: AI Document Analysis
**Goal**: Claude API analyzes documents and extracts structured data
**Depends on**: Phase 5
**Requirements**: AIDOC-01 through AIDOC-08
**Success Criteria** (what must be TRUE):
  1. Claude API client configured and working
  2. ID document (cedula) analyzed: name, number, dates extracted
  3. Employment letter analyzed: company, salary, tenure extracted
  4. Pay stubs analyzed: income details extracted
  5. Bank statements analyzed: income patterns detected
  6. Analysis includes confidence score
  7. Cross-validation between documents implemented
  8. Results stored and feed into scoring
**Research**: Completed (see AI_DOCUMENT_ANALYSIS.md)
**Plans**: TBD

### Phase 7: Explainability
**Goal**: Full scoring explanation with drivers, flags, and suggestions
**Depends on**: Phase 6
**Requirements**: EXPL-01 through EXPL-05
**Success Criteria** (what must be TRUE):
  1. 3-6 driver explanations generated per candidate
  2. Risk flags generated (HIGH_RENT_TO_INCOME, LOW_TENURE, etc.)
  3. Suggested conditions generated based on risk
  4. AI-generated conversational explanation
  5. Subscores visible in response
**Research**: Likely (explanation generation patterns)
**Research topics**: LLM prompts for explanations
**Plans**: TBD

### Phase 8: Landlord Features
**Goal**: Landlords can evaluate and decide on candidates
**Depends on**: Phase 7
**Requirements**: LAND-01 through LAND-10
**Success Criteria** (what must be TRUE):
  1. Landlord sees candidates per property
  2. Candidates ranked by score
  3. Candidate detail includes full score explanation
  4. Landlord can pre-approve/approve/reject
  5. Landlord can request additional info (triggers notification)
  6. Landlord can add private notes
  7. Landlord can view candidate documents
**Research**: Unlikely (builds on previous phases)
**Plans**: TBD

### Phase 9: Notifications
**Goal**: Email notifications for key events
**Depends on**: Phase 8
**Requirements**: NOTF-01 through NOTF-07
**Success Criteria** (what must be TRUE):
  1. Resend email service configured
  2. Email templates with Arriendo Facil branding
  3. Email sent when application received (to landlord)
  4. Email sent when approved/rejected (to tenant)
  5. Email sent when info requested (to tenant)
  6. Emails sent async via BullMQ queue
**Research**: Unlikely (Resend well documented)
**Plans**: TBD

### Phase 10: ML Persistence
**Goal**: Data infrastructure for future ML model training
**Depends on**: Phase 9
**Requirements**: MLPR-01 through MLPR-04
**Success Criteria** (what must be TRUE):
  1. All extracted features persisted with application
  2. Application outcomes trackable (approved -> paid/defaulted)
  3. Score predictions vs actuals logged
  4. Data exportable for ML training
**Research**: Unlikely (data modeling)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | ✓ Complete | 2026-01-25 |
| 2. Auth & Users | 0/0 | Not started | - |
| 3. Properties | 0/0 | Not started | - |
| 4. Applications & Documents | 0/0 | Not started | - |
| 5. Scoring Engine | 0/0 | Not started | - |
| 6. AI Document Analysis | 0/0 | Not started | - |
| 7. Explainability | 0/0 | Not started | - |
| 8. Landlord Features | 0/0 | Not started | - |
| 9. Notifications | 0/0 | Not started | - |
| 10. ML Persistence | 0/0 | Not started | - |

## Notes

### Frontend Integration Points

El frontend en `../front/` espera estas estructuras de respuesta:

**Property:**
```typescript
{
  id, ownerId, title, description, address, city, neighborhood,
  priceMonthly, adminFee, bedrooms, bathrooms, area,
  furnished, petFriendly, parking, availableFrom,
  images: [{ id, url, order }]
}
```

**RiskScoreResult:**
```typescript
{
  totalScore: number,
  level: 'A' | 'B' | 'C' | 'D',
  recommendation: string,
  subscores: { integrity, financial, stability, history, documents },
  drivers: string[],
  flags: RiskFlag[],
  suggestedConditions: Condition[],
  aiExplanation: string
}
```

### External Services

| Service | Purpose | Config |
|---------|---------|--------|
| Supabase | DB, Auth, Storage | SUPABASE_URL, SUPABASE_KEY |
| Claude API | Document analysis | ANTHROPIC_API_KEY |
| Resend | Email | RESEND_API_KEY |
| Redis | BullMQ queues | REDIS_URL |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-01-25 after Phase 1 execution*
