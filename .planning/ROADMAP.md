# Roadmap: Arriendo Facil Backend

## Overview

Backend API en NestJS para el marketplace de arriendos "Arriendo Facil". Provee las APIs REST, Risk Score Engine con analisis de documentos por IA (Claude), y toda la logica de negocio que consume el frontend Next.js existente.

## Milestones

- **v1.0 Backend MVP** - Phases 1-16 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Tier System:**
- Phases 1-8: Core functionality (FREE tier)
- Phase 9: Payment History Scoring (enhances FREE scoring with real data)
- Phase 10: Tenant Payment Simulation (simulated payment flow)
- Phases 11-12: AI-powered features (PRO/BUSINESS subscription only)
- Phases 13-16: Supporting features

- [x] **Phase 1: Foundation** - Project scaffold, Prisma, Supabase config
- [x] **Phase 2: Auth & Users** - Supabase Auth, guards, user management
- [x] **Phase 3: Properties** - CRUD, filtering, image upload, plans
- [x] **Phase 4: Applications & Documents** - Wizard, state machine, document upload
- [x] **Phase 5: Scoring Engine** - Feature extraction, models, aggregator (FREE - rule-based)
- [x] **Phase 6: Landlord Features** - Candidates, decisions, approve/reject
- [x] **Phase 7: Contracts** - Templates, digital signatures, clauses
- [x] **Phase 8: Leases & Payments** - Active leases, payment tracking
- [x] **Phase 9: Payment History Scoring** - Score bonus from payment history (NEW)
- [x] **Phase 10: Tenant Payment Simulation** - Payment form, receipt upload, landlord validation (NEW)
- [ ] **Phase 11: AI Document Analysis** - Claude integration, document analyzers (PRO+)
- [ ] **Phase 12: Explainability** - Drivers, flags, AI explanation (PRO+)
- [ ] **Phase 13: Notifications** - Email service, templates, queue
- [ ] **Phase 14: ML Persistence** - Feature logging, outcome tracking
- [ ] **Phase 15: Subscriptions & Plans** - Pricing plans, coupons, billing
- [ ] **Phase 16: Insurance** - Optional insurance tiers

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
**Research**: Complete (02-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md - Create User model in Prisma and database trigger for Supabase sync
- [x] 02-02-PLAN.md - Implement Supabase JWT authentication with Passport and RBAC
- [x] 02-03-PLAN.md - Create user profile management endpoints

### Phase 3: Properties
**Goal**: Landlords can manage properties, anyone can browse
**Depends on**: Phase 2
**Requirements**: PROP-01 through PROP-16
**Success Criteria** (what must be TRUE):
  1. Landlord can CRUD own properties
  2. Property images uploaded to Supabase Storage (max 10, ordered)
  3. Public can list/filter properties without auth
  4. Filters work: city, price, bedrooms, type, amenities, full-text search
  5. Property detail returns complete data including all new fields
  6. Landlord can view own property list
  7. Properties support draft status (not visible to public)
  8. Properties blocked from edit/delete if has active applications
**Research**: Unlikely (standard CRUD)
**Context**: Complete (03-CONTEXT.md)
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md - Create Property and PropertyImage Prisma models with enums
- [x] 03-02-PLAN.md - Create PropertiesModule with landlord CRUD operations
- [x] 03-03-PLAN.md - Add public property listing with filters and search
- [x] 03-04-PLAN.md - Implement property image upload to Supabase Storage

**Model Changes (aligned with frontend):**
- type: apartment | house | studio | room
- status: draft | available | rented | pending
- parkingSpaces, stratum, yearBuilt (new fields)
- listingPlan: free | pro | business
- amenities: string[] with predefined IDs
- latitude, longitude for map

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
**Research**: Complete (04-RESEARCH.md)
**Plans**: 5 plans

Plans:
- [x] 04-01-PLAN.md - Create Application, ApplicationDocument, ApplicationEvent models and enums
- [x] 04-02-PLAN.md - Create ApplicationStateMachine and ApplicationEventService
- [x] 04-03-PLAN.md - Create ApplicationsModule with create and wizard steps 1-4
- [x] 04-04-PLAN.md - Create DocumentsModule with upload, validation, and signed URLs
- [x] 04-05-PLAN.md - Add submit, withdraw, list, timeline, and info response endpoints

### Phase 5: Scoring Engine
**Goal**: Basic risk scoring with rule-based models (FREE tier)
**Depends on**: Phase 4
**Requirements**: SCOR-01 through SCOR-09
**Tier**: FREE (no cost, uses application data only)
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
**Research**: Complete (05-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 05-01-PLAN.md - Add RiskScoreResult model, RiskLevel enum, BullMQ configuration
- [x] 05-02-PLAN.md - Create FeatureBuilder and scoring models (Financial, Stability, History, Integrity)
- [x] 05-03-PLAN.md - Create ScoreAggregator, ScoringProcessor, and integrate with application submit

### Phase 6: Landlord Features
**Goal**: Landlords can evaluate and decide on candidates
**Depends on**: Phase 5
**Requirements**: LAND-01 through LAND-10
**Success Criteria** (what must be TRUE):
  1. Landlord sees candidates per property
  2. Candidates ranked by score
  3. Candidate detail includes score breakdown
  4. Landlord can pre-approve/approve/reject
  5. Landlord can request additional info
  6. Landlord can add private notes
  7. Landlord can view candidate documents
**Research**: Complete (06-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md - Add LandlordNote model to Prisma schema
- [x] 06-02-PLAN.md - Create LandlordModule with candidate list and detail endpoints
- [x] 06-03-PLAN.md - Add decision endpoints and notes CRUD

### Phase 7: Contracts
**Goal**: Digital contract signing with templates and Ley 527/1999 compliance
**Depends on**: Phase 6 (after candidate approval)
**Requirements**: CONT-01 through CONT-10
**Success Criteria** (what must be TRUE):
  1. Contract templates available with variable substitution
  2. Landlord can generate contract for approved candidate
  3. Contract includes custom clauses and optional insurance
  4. Both parties can sign digitally with full audit trail
  5. Signatures comply with Ley 527/1999 (IP, timestamp, consent, hash)
  6. Signed contract generates PDF stored in Supabase
  7. Contract status tracked (DRAFT, PENDING_LANDLORD_SIGNATURE, PENDING_TENANT_SIGNATURE, SIGNED, ACTIVE)
**Research**: Complete (07-RESEARCH.md)
**Plans**: 4 plans

Plans:
- [x] 07-01-PLAN.md - Add Contract model, ContractStatus enum, database relations
- [x] 07-02-PLAN.md - Create ContractStateMachine, ContractTemplateService, SignatureService
- [x] 07-03-PLAN.md - Create ContractsModule with create, preview, list endpoints
- [x] 07-04-PLAN.md - Add digital signature endpoints and PDF generation

### Phase 8: Leases & Payments
**Goal**: Track active leases and payment history
**Depends on**: Phase 7 (signed contract creates lease)
**Requirements**: LEAS-01 through LEAS-08
**Success Criteria** (what must be TRUE):
  1. Lease created from signed contract
  2. Lease status tracked (active, ending_soon, ended)
  3. Payment records can be added (by reference number)
  4. Payment methods supported (PSE, transfer, cash)
  5. Tenant and landlord can view lease details
  6. Payment history visible
  7. Payment due dates tracked
**Research**: Complete (08-RESEARCH.md)
**Plans**: 3 plans

Plans:
- [x] 08-01-PLAN.md - Add Lease/Payment models, LeaseStatus/PaymentMethod enums
- [x] 08-02-PLAN.md - Configure event emitter, create lease on contract activation
- [x] 08-03-PLAN.md - Create LeasesModule with endpoints for lease and payment management

### Phase 9: Payment History Scoring
**Goal**: Enhance scoring with real payment history data
**Depends on**: Phase 8 (needs payment history), Phase 5 (scoring infrastructure)
**Requirements**: PHSC-01 through PHSC-06
**Tier**: FREE (enhances basic scoring with real platform data)
**Success Criteria** (what must be TRUE):
  1. PaymentHistoryModel calculates score from past payments
  2. On-time payment percentage tracked per tenant
  3. Late payment frequency affects score negatively
  4. Returning tenants get score bonus
  5. Payment history feeds into Scoring Engine
  6. Tenant can see their payment reputation score
**Research**: Complete (09-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [x] 09-01-PLAN.md - Create PaymentHistoryService and PaymentHistoryModel
- [x] 09-02-PLAN.md - Integrate into ScoringProcessor and add tenant reputation endpoint

**Scoring Factors:**
- % pagos a tiempo (max 8 pts bonus)
- Historial de atrasos (penalty up to -10 pts)
- Meses como inquilino en plataforma (max 5 pts tenure bonus)
- Inquilino recurrente (2 pts returning tenant bonus)
- Max total: 15 pts bonus (capped)

### Phase 10: Tenant Payment Simulation
**Goal**: Tenants can initiate simulated payments with receipt upload for landlord validation
**Depends on**: Phase 8 (leases and payments infrastructure)
**Requirements**: TPAY-01 through TPAY-12
**Tier**: FREE (no real payment processing, landlord validates manually)
**Success Criteria** (what must be TRUE):
  1. Landlord can configure payment methods (bank accounts: Bancolombia, Davivienda, Nequi, Daviplata, etc.)
  2. Tenant sees landlord's configured payment methods for transfer option
  3. Tenant can select payment method: Transfer or PSE
  4. Payment form auto-fills amount from lease rent value
  5. For Transfer: tenant uploads payment receipt (comprobante)
  6. For PSE: tenant fills mock form (name, document type/number, bank selection)
  7. Receipt upload creates pending payment record
  8. Landlord validates and approves/rejects payment
  9. Approved payments feed into Payment History Scoring (Phase 9)
  10. PSE mock returns simulated success/failure
  11. If landlord rejects: tenant can open dispute (solicitud de inconformidad)
  12. Dispute creates support ticket for review
**Research**: Complete (10-RESEARCH.md)
**Plans**: 6 plans

Plans:
- [x] 10-01-PLAN.md - Create database models and enums for tenant payment simulation
- [x] 10-02-PLAN.md - Create landlord payment methods configuration endpoints
- [x] 10-03-PLAN.md - Create tenant payment request with receipt upload
- [x] 10-04-PLAN.md - Create PSE mock payment flow
- [x] 10-05-PLAN.md - Create landlord payment validation with approval flow
- [x] 10-06-PLAN.md - Create disputes workflow for rejected payments

**Note**: Notifications (push + email) for payment events handled in Phase 13.

**Payment Methods (Landlord configures):**
- Bancolombia (Cuenta Ahorros/Corriente)
- Davivienda (Cuenta Ahorros/Corriente)
- Nequi (numero celular)
- Daviplata (numero celular)
- BBVA (Cuenta Ahorros/Corriente)
- Banco de Bogota (Cuenta Ahorros/Corriente)

**PSE Mock Banks:**
- Bancolombia
- Davivienda
- BBVA
- Banco de Bogota
- Banco de Occidente
- Banco Popular
- Banco AV Villas
- Banco Caja Social
- Nequi
- Daviplata

### Phase 11: AI Document Analysis
**Goal**: Claude API analyzes documents and extracts structured data
**Depends on**: Phase 5 (scoring infrastructure), Phase 10 (complete payment flow)
**Requirements**: AIDOC-01 through AIDOC-08
**Tier**: PRO/BUSINESS subscription only (~$0.05-0.10 per application)
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

### Phase 12: Explainability
**Goal**: Full scoring explanation with drivers, flags, and suggestions
**Depends on**: Phase 11
**Requirements**: EXPL-01 through EXPL-05
**Tier**: PRO/BUSINESS subscription only
**Success Criteria** (what must be TRUE):
  1. 3-6 driver explanations generated per candidate
  2. Risk flags generated (HIGH_RENT_TO_INCOME, LOW_TENURE, etc.)
  3. Suggested conditions generated based on risk
  4. AI-generated conversational explanation
  5. Subscores visible in response
**Research**: Likely (explanation generation patterns)
**Research topics**: LLM prompts for explanations
**Plans**: TBD

### Phase 13: Notifications
**Goal**: Email and push notifications for key events
**Depends on**: Phase 6 (needs approval/rejection events), Phase 10 (payment events)
**Requirements**: NOTF-01 through NOTF-10
**Success Criteria** (what must be TRUE):
  1. Resend email service configured
  2. Email templates with Arriendo Facil branding
  3. Email sent when application received (to landlord)
  4. Email sent when approved/rejected (to tenant)
  5. Email sent when info requested (to tenant)
  6. Emails sent async via BullMQ queue
  7. Email sent when payment receipt uploaded (to landlord)
  8. Email sent when payment approved/rejected (to tenant)
  9. Email sent when dispute opened (to support + landlord)
  10. Push notification infrastructure (Firebase or similar)
**Research**: Likely (push notifications, Firebase)
**Plans**: TBD

### Phase 14: ML Persistence
**Goal**: Data infrastructure for future ML model training
**Depends on**: Phase 9 (needs payment history for outcomes), Phase 10 (complete payment flow)
**Requirements**: MLPR-01 through MLPR-04
**Success Criteria** (what must be TRUE):
  1. All extracted features persisted with application
  2. Application outcomes trackable (approved -> paid/defaulted)
  3. Score predictions vs actuals logged
  4. Data exportable for ML training
**Research**: Unlikely (data modeling)
**Plans**: TBD

### Phase 15: Subscriptions & Plans
**Goal**: Pricing plans for landlords with coupon support
**Depends on**: Phase 3 (landlords need properties first)
**Requirements**: SUBS-01 through SUBS-08
**Success Criteria** (what must be TRUE):
  1. Three plans available: free, pro, business
  2. Plan limits enforced (properties, AI scoring access)
  3. Coupons can be validated and applied
  4. Subscription status tracked per user
  5. Plan selection during property publish
**Research**: Likely (billing patterns, coupon systems)
**Plans**: TBD

**Plans (from frontend):**
- Free: 1 property, 1 contract, basic scoring only
- Pro: 10 properties, unlimited contracts, AI scoring ($149,900/month)
- Business: Unlimited, API access ($499,900/month)

### Phase 16: Insurance
**Goal**: Optional insurance tiers for contracts
**Depends on**: Phase 7 (insurance attached to contracts)
**Requirements**: INSU-01 through INSU-04
**Success Criteria** (what must be TRUE):
  1. Three insurance tiers: none, basic, premium
  2. Insurance can be selected during contract creation
  3. Insurance premium added to contract terms
  4. Coverage details visible in contract
**Research**: Unlikely (straightforward feature)
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> 14 -> 15 -> 16

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-25 |
| 2. Auth & Users | 3/3 | Complete | 2026-01-26 |
| 3. Properties | 4/4 | Complete | 2026-01-29 |
| 4. Applications & Documents | 5/5 | Complete | 2026-01-29 |
| 5. Scoring Engine | 3/3 | Complete | 2026-01-30 |
| 6. Landlord Features | 3/3 | Complete | 2026-02-01 |
| 7. Contracts | 4/4 | Complete | 2026-02-01 |
| 8. Leases & Payments | 3/3 | Complete | 2026-02-01 |
| 9. Payment History Scoring | 2/2 | Complete | 2026-02-02 |
| 10. Tenant Payment Simulation | 6/6 | Complete | 2026-02-02 |
| 11. AI Document Analysis | 0/0 | Not started | - |
| 12. Explainability | 0/0 | Not started | - |
| 13. Notifications | 0/0 | Not started | - |
| 14. ML Persistence | 0/0 | Not started | - |
| 15. Subscriptions & Plans | 0/0 | Not started | - |
| 16. Insurance | 0/0 | Not started | - |

## Notes

### Tier System

**FREE Tier (Phases 1-10):**
- Basic rule-based scoring from application data
- Payment history scoring for returning tenants
- Simulated payment flow with receipt upload
- No external API costs

**PRO/BUSINESS Tier (Phases 11-12):**
- AI document analysis via Claude (~$0.05-0.10/app)
- AI-generated explanations
- Cross-document validation

### Frontend Integration Points

**Reference:** See `../front/docs/BACKEND-INTEGRATION.md` for complete API contracts.
**Reference:** See `../front/docs/FRONTEND-ARCHITECTURE.md` for component structure.

**Property (updated 2026-01-29):**
```typescript
{
  id: string,
  title: string,
  description: string,
  type: 'apartment' | 'house' | 'studio' | 'room',
  status: 'available' | 'rented' | 'pending',
  city: string,
  neighborhood: string,
  address: string,
  latitude: number,
  longitude: number,
  monthlyRent: number,  // COP integers
  adminFee: number,
  deposit: number,
  bedrooms: number,
  bathrooms: number,
  area: number,
  floor?: number,
  parkingSpaces?: number,
  stratum?: number,
  yearBuilt?: number,
  amenities: PropertyAmenity[],
  images: string[],
  thumbnailUrl: string,
  landlordId: string,
  createdAt: string,
  updatedAt: string
}
```

**RiskScore (updated 2026-01-30):**
```typescript
{
  total: number,        // 0-100 (can exceed with payment history bonus)
  level: 'A' | 'B' | 'C' | 'D',
  categories: {
    integrity: number,  // 0-25
    financial: number,  // 0-35
    stability: number,  // 0-25
    history: number,    // 0-15
    paymentHistory?: number  // 0-15 bonus (Phase 9)
  },
  explanation: string,  // AI-generated (PRO+) or empty
  drivers: { text: string, positive: boolean }[],
  flags: { code: string, severity: string, message: string }[],
  conditions: { type: string, message: string, required: boolean }[]
}
```

### External Services

| Service | Purpose | Config | Tier |
|---------|---------|--------|------|
| Supabase | DB, Auth, Storage | SUPABASE_URL, SUPABASE_KEY | All |
| Redis | BullMQ queues | REDIS_URL | All |
| Claude API | Document analysis | ANTHROPIC_API_KEY | PRO+ |
| Resend | Email | RESEND_API_KEY | All |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-02-02 - Completed Phase 10 (Tenant Payment Simulation)*
