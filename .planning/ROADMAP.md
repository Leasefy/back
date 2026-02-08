# Roadmap: Arriendo Facil Backend

## Overview

Backend API en NestJS para el marketplace de arriendos "Arriendo Facil". Provee las APIs REST, Risk Score Engine con analisis de documentos por IA (Claude), y toda la logica de negocio que consume el frontend Next.js existente.

## Milestones

- **v1.0 Backend MVP** - Phases 1-22 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

**Tier System:**
- Phases 1-8: Core functionality (FREE tier)
- Phase 9: Payment History Scoring (enhances FREE scoring with real data)
- Phase 10: Tenant Payment Simulation (simulated payment flow)
- Phases 11-13: Supporting features (no IA)
- Phases 14-19: Frontend parity features (backend APIs for frontend features) (FREE tier)
- Phases 20-22: AI-powered features (PRO/BUSINESS subscription only) - AL FINAL

- [x] **Phase 1: Foundation** - Project scaffold, Prisma, Supabase config
- [x] **Phase 2: Auth & Users** - Supabase Auth, guards, user management
- [x] **Phase 2.1: User Roles & Property Agents** - AGENT role, property delegation, application chat (INSERTED)
- [x] **Phase 3: Properties** - CRUD, filtering, image upload, plans
- [x] **Phase 3.1: Property Visits Scheduling** - Visit requests, availability, accept/reject (INSERTED)
- [x] **Phase 3.2: Natural Language Search** - Smart property search with keyword parsing (INSERTED)
- [x] **Phase 4: Applications & Documents** - Wizard, state machine, document upload
- [x] **Phase 5: Scoring Engine** - Feature extraction, models, aggregator (FREE - rule-based)
- [x] **Phase 6: Landlord Features** - Candidates, decisions, approve/reject
- [x] **Phase 7: Contracts** - Templates, digital signatures, clauses
- [x] **Phase 8: Leases & Payments** - Active leases, payment tracking
- [x] **Phase 9: Payment History Scoring** - Score bonus from payment history (NEW)
- [x] **Phase 10: Tenant Payment Simulation** - Payment form, receipt upload, landlord validation (NEW)
- [x] **Phase 11: Notifications** - Email service, templates, queue (REORDERED)
- [x] **Phase 12: Subscriptions & Plans** - Pricing plans, billing, plan enforcement (REORDERED)
- [x] **Phase 13: Insurance** - Optional insurance tiers (REORDERED)
- [x] **Phase 14: Wishlist & Favorites** - Save/remove favorite properties per tenant (FRONTEND PARITY)
- [x] **Phase 15: Tenant Documents Vault** - Extend documents to leases and personal vault (FRONTEND PARITY)
- [x] **Phase 16: Tenant Preferences & Profile** - Persist tenant search preferences and profile data (FRONTEND PARITY)
- [x] **Phase 17: Coupons & Discounts** - Coupon codes for subscription discounts (FRONTEND PARITY)
- [x] **Phase 18: Dashboard & Activity Log** - Aggregated dashboard endpoints and activity feed (FRONTEND PARITY)
- [ ] **Phase 19: Property Recommendations** - Personalized property matching and recommendations (FRONTEND PARITY)
- [ ] **Phase 20: AI Document Analysis** - Claude integration, document analyzers (PRO+) (REORDERED)
- [ ] **Phase 21: Explainability** - Drivers, flags, AI explanation (PRO+) (REORDERED)
- [ ] **Phase 22: ML Persistence** - Feature logging, outcome tracking (REORDERED)

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

### Phase 2.1: User Roles & Property Agents (INSERTED)
**Goal**: Simplified role system with AGENT role for property delegation, plus application chat using Supabase Realtime
**Depends on**: Phase 2 (Auth & Users)
**Requirements**: ROLE-01 through ROLE-05, AGENT-01 through AGENT-06, CHAT-01 through CHAT-05
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Role enum has AGENT instead of BOTH
  2. User model has no activeRole field (no more context switching)
  3. AGENT role users can access landlord endpoints for assigned properties only
  4. Landlord can assign/remove agents by email
  5. Agent can view assigned properties and landlord info
  6. Chat conversation created when application submitted
  7. Tenant and landlord/agent can send messages in application chat
  8. Messages have read receipts
  9. Conversation deleted on application reject/withdraw
**Plans**: 4 plans

Plans:
- [x] 2.1-01-PLAN.md - Database changes (Role enum, remove activeRole, PropertyAccess model, chat models)
- [x] 2.1-02-PLAN.md - Remove BOTH role from codebase, update guards and decorators
- [x] 2.1-03-PLAN.md - PropertyAccessService, agent endpoints, update authorization in 9 services
- [x] 2.1-04-PLAN.md - ChatService, chat endpoints, integration with application lifecycle

**Wave Structure:**
- Wave 1: 2.1-01 (database foundation)
- Wave 2 (parallel): 2.1-02 (role cleanup), 2.1-03 (agent system)
- Wave 3: 2.1-04 (chat, depends on 02 and 03)

**Role Changes:**
- OLD: TENANT, LANDLORD, BOTH, ADMIN
- NEW: TENANT, LANDLORD, AGENT, ADMIN

**Key Behaviors:**
- Agent has FULL access to assigned properties (like being the landlord, except can't change landlordId)
- Authorization moved from guard level (Role.BOTH special case) to service level (PropertyAccessService)
- Chat uses Supabase Realtime for live updates (frontend subscribes to chat_messages table)

**Future Enhancement Note:**
For higher scale (>200 concurrent connections), implement NestJS @WebSocketGateway
with Socket.io instead of Supabase Realtime. This is free but more complex to implement
(auth handling, scaling with Redis, testing). Current Supabase Realtime is sufficient for MVP.

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

### Phase 3.1: Property Visits Scheduling (INSERTED)
**Goal**: Tenants can schedule property visits, landlords manage availability and accept/reject
**Depends on**: Phase 3 (Properties), Phase 2 (Users/Auth)
**Requirements**: VISIT-01 through VISIT-12
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Landlord can configure availability (days, hours, slot duration)
  2. Tenant can view available slots for a property
  3. Tenant can request a visit (select date/time slot)
  4. System prevents double-booking (occupied slots not shown)
  5. Landlord can accept/reject visit requests
  6. Tenant can reschedule a visit (if not yet accepted or with landlord approval)
  7. Both parties can cancel a visit
  8. Notifications sent on: new request, accepted, rejected, cancelled, rescheduled
  9. Tenant can view their scheduled visits
  10. Landlord can view all visits for their properties
**Research**: Complete (03.1-RESEARCH.md)
**Plans**: 4 plans

Plans:
- [x] 03.1-01-PLAN.md - Create database models and enums for property visits
- [x] 03.1-02-PLAN.md - Create VisitStateMachine, AvailabilityService, and SlotsService
- [x] 03.1-03-PLAN.md - Create VisitsService with core operations and events
- [x] 03.1-04-PLAN.md - Create VisitsController with all endpoints and status management

**Visit Status Flow:**
```
PENDING -> ACCEPTED -> COMPLETED
       \-> REJECTED
       \-> CANCELLED (by either party)
ACCEPTED -> RESCHEDULED -> PENDING (new date)
         \-> CANCELLED
```

**Notifications (integrated with Phase 11):**
- New visit request -> Landlord (push + email)
- Visit accepted/rejected -> Tenant (push + email)
- Visit cancelled -> Other party (push + email)
- Visit rescheduled -> Other party (push + email)
- Reminder 24h before -> Both parties (push + email)

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

**Note**: Notifications (push + email) for payment events handled in Phase 11.

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

### Phase 11: Notifications
**Goal**: Email and push notifications for key events with admin-managed templates
**Depends on**: Phase 6 (needs approval/rejection events), Phase 10 (payment events)
**Requirements**: NOTF-01 through NOTF-11
**Success Criteria** (what must be TRUE):
  1. Resend email service configured
  2. Firebase FCM push notification service configured
  3. Email templates with Arriendo Facil branding
  4. 19 notification templates for all key events
  5. Email sent when application received (to landlord)
  6. Email sent when approved/rejected (to tenant)
  7. Email sent when info requested (to tenant)
  8. Emails sent async via BullMQ queue
  9. Email sent when payment receipt uploaded (to landlord)
  10. Email sent when payment approved/rejected (to tenant)
  11. Email sent when dispute opened (to support + landlord)
  12. Push notification infrastructure working
  13. Admin CRUD for notification templates
  14. User notification preferences respected
  15. Scheduled reminders (visit 24h, payment due)
**Context**: Complete (11-CONTEXT.md)
**Plans**: 5 plans

Plans:
- [x] 11-01-PLAN.md - Add database models (ADMIN role, NotificationTemplate, NotificationLog, user preferences)
- [x] 11-02-PLAN.md - Configure external services (Resend email, Firebase FCM, env validation)
- [x] 11-03-PLAN.md - Create core notification system (TemplateService, NotificationsService, BullMQ processor)
- [x] 11-04-PLAN.md - Create admin template management (CRUD endpoints, seed 19 templates)
- [x] 11-05-PLAN.md - Integrate with events and add scheduled notifications

**Wave Structure:**
- Wave 1 (parallel): 11-01 (database models), 11-02 (external services)
- Wave 2 (parallel): 11-03 (core system, depends on 01+02), 11-04 (admin CRUD, depends on 01)
- Wave 3: 11-05 (event integration, depends on 03+04)

**Notification Events (19 total):**
- Applications (4): received, approved, rejected, info_requested
- Payments (6): receipt_uploaded, approved, rejected, dispute_opened, reminder, overdue
- Visits (6): requested, accepted, rejected, cancelled, rescheduled, reminder_24h
- Contracts (4): ready_to_sign, landlord_signed, tenant_signed, completed
- Leases (2): expiring_soon, expired

### Phase 12: Subscriptions & Plans (REORDERED - era Phase 15)
**Goal**: Pricing plans for landlords and tenants with mock payment processing, plan enforcement, and admin-managed pricing
**Depends on**: Phase 10 (PSE mock), Phase 11 (Notifications, ADMIN role)
**Requirements**: SUBS-01 through SUBS-05, SUBS-08 (SUBS-06, SUBS-07 cupones moved to Phase 17)
**Context**: Complete (12-CONTEXT.md)
**Success Criteria** (what must be TRUE):
  1. Five plan configs defined: Tenant Free/Pro, Landlord Free/Pro/Business
  2. Plan limits enforced (landlord property count, tenant scoring views)
  3. Subscription status tracked per user (trial, active, cancelled, expired)
  4. User can subscribe via PSE mock payment
  5. User can cancel subscription
  6. User can change plan mid-cycle
  7. 7-day trial with notification before expiry
  8. Auto-downgrade to free on expiry (hides excess properties)
  9. Admin can modify plan pricing
  10. Micropayment for extra scoring views (tenant free)
  11. Public endpoint lists plans by role
**Plans**: 4 plans

Plans:
- [x] 12-01-PLAN.md -- Database models, enums, and seed data for subscription system
- [x] 12-02-PLAN.md -- Core subscription services (plans, subscriptions, enforcement)
- [x] 12-03-PLAN.md -- REST endpoints (admin pricing, public listing, user operations)
- [x] 12-04-PLAN.md -- Plan enforcement integration, micropayments, trial/expiry automation

**Wave Structure:**
- Wave 1: 12-01 (database models + enums + seed)
- Wave 2: 12-02 (core services, depends on 01)
- Wave 3: 12-03 (controllers, depends on 02)
- Wave 4: 12-04 (enforcement + cron + micropayments, depends on 02+03)

**Plans by Role:**
- Tenant Free: 1 scoring view/month, no premium scoring, micropayment for extras
- Tenant Pro: Unlimited scoring, premium scoring ($49,900/month)
- Landlord Free: 1 property, basic scoring
- Landlord Pro: 10 properties, premium scoring ($149,900/month)
- Landlord Business: Unlimited, API access, premium scoring ($499,900/month)

### Phase 13: Insurance (REORDERED - era Phase 16)
**Goal**: Optional insurance tiers for contracts with structured pricing and coverage
**Depends on**: Phase 7 (insurance attached to contracts)
**Requirements**: INSU-01 through INSU-04
**Success Criteria** (what must be TRUE):
  1. Three insurance tiers: none, basic, premium
  2. Insurance can be selected during contract creation
  3. Insurance premium added to contract terms
  4. Coverage details visible in contract
**Plans**: 2 plans

Plans:
- [x] 13-01-PLAN.md -- InsuranceTier enum, update Contract model, InsuranceService with tier definitions
- [x] 13-02-PLAN.md -- Update contract DTO/service/template integration, InsuranceController endpoints

**Wave Structure:**
- Wave 1: 13-01 (enum, schema, service foundation)
- Wave 2: 13-02 (contract integration + REST endpoints, depends on 01)

**Insurance Tiers:**
- NONE: No insurance, $0 COP
- BASIC: Accidental damage coverage up to $5,000,000 COP, $25,000 COP/month
- PREMIUM: Accidental + natural disaster + theft up to $20,000,000 COP, $75,000 COP/month

---
## FASES DE PARIDAD CON FRONTEND
---

### Phase 14: Wishlist & Favorites (REORDERED - era Phase 17)
**Goal**: Tenants can save and manage favorite properties with server-side persistence
**Depends on**: Phase 3 (Properties), Phase 2 (Auth)
**Requirements**: WISH-01 through WISH-04
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Tenant can add a property to favorites
  2. Tenant can remove a property from favorites
  3. Tenant can list all favorite properties with full property data
  4. Duplicate add is idempotent (no error, no duplicate)
  5. Favorites persist across devices (server-side, not localStorage)
**Plans**: 1 plan

Plans:
- [x] 14-01-PLAN.md -- Prisma WishlistItem model, WishlistsModule (service + controller + DTO), AppModule registration

**Frontend Reference:**
- `src/lib/stores/wishlist.tsx` - Wishlist context with toggle/add/remove
- `src/app/inquilino/guardados/page.tsx` - Saved properties page
- Data: Array of property IDs stored in localStorage

**Expected Endpoints:**
```
POST   /wishlists/items              // Add property to wishlist
DELETE /wishlists/items/{propertyId} // Remove from wishlist
GET    /wishlists                     // Get all wishlist items with property data
```

**Model:**
```prisma
model WishlistItem {
  id         String   @id @default(cuid())
  userId     String
  propertyId String
  createdAt  DateTime @default(now())
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)
  @@unique([userId, propertyId])
}
```

**Implementation Notes:**
- Simplest new phase, no dependencies on other new phases
- Reuse existing Property includes for response shape
- Quick win: ~2 plans estimated (model + endpoints)

### Phase 15: Tenant Documents Vault (REORDERED - era Phase 21)
**Goal**: Extend document management beyond applications to include lease documents and personal document vault
**Depends on**: Phase 4 (Documents), Phase 8 (Leases)
**Requirements**: TVAULT-01 through TVAULT-05
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Tenant can upload documents associated with a lease (receipts, inventory, annexes)
  2. Tenant can view all their documents across leases and applications
  3. Landlord can upload lease-related documents (delivery inventory, addendums)
  4. Documents categorized by type (contract, receipt, inventory, annex, personal)
  5. Signed URLs for secure document access (reuse existing pattern)
**Plans**: 2 plans

Plans:
- [x] 15-01-PLAN.md -- LeaseDocument model, LeaseDocumentType enum, LeaseDocumentsService
- [x] 15-02-PLAN.md -- LeaseDocumentsController endpoints, tenant vault aggregated endpoint

**Wave Structure:**
- Wave 1: 15-01 (schema + service foundation)
- Wave 2: 15-02 (controllers + vault endpoint, depends on 01)

**Frontend Reference:**
- `src/app/inquilino/documentos/page.tsx` - Document vault page
- Shows: contracts, payment receipts, inventory documents, handover photos
- Categorized by: contract-related, payment-related, inventory-related

**Expected Endpoints:**
```
POST   /leases/:leaseId/documents          // Upload lease document
GET    /leases/:leaseId/documents          // List lease documents
GET    /leases/:leaseId/documents/:id/url  // Get signed URL
DELETE /leases/:leaseId/documents/:id      // Delete document
GET    /tenants/me/documents               // Get ALL tenant documents (applications + leases)
```

**Model:**
```prisma
model LeaseDocument {
  id         String           @id @default(cuid())
  leaseId    String
  uploadedBy String
  type       LeaseDocumentType
  fileName   String
  filePath   String
  fileSize   Int
  mimeType   String
  createdAt  DateTime         @default(now())
  lease      Lease            @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  uploader   User             @relation(fields: [uploadedBy], references: [id])
}

enum LeaseDocumentType {
  CONTRACT_SIGNED
  PAYMENT_RECEIPT
  DELIVERY_INVENTORY
  RETURN_INVENTORY
  ADDENDUM
  PHOTO
  OTHER
}
```

**Implementation Notes:**
- Extends existing DocumentsModule pattern (upload, signed URLs, validation)
- Reuses Supabase Storage infrastructure from Phase 4
- ~2-3 plans estimated (model + lease endpoints + vault aggregation)

### Phase 16: Tenant Preferences & Profile (REORDERED - era Phase 18)
**Goal**: Persist tenant search preferences and profile summary for cross-device and recommendations use
**Depends on**: Phase 2 (Auth), Phase 4 (Applications)
**Requirements**: TPREF-01 through TPREF-05
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Tenant can save property preferences (preferred cities, bedrooms, property types, budget range)
  2. Tenant can update preferences at any time
  3. Preferences retrievable via GET endpoint
  4. Tenant profile includes computed data from applications (income, employment, risk level)
  5. Profile endpoint returns unified view of tenant data
**Plans**: 2 plans

Plans:
- [x] 16-01-PLAN.md -- TenantPreference Prisma model + PATCH/GET preferences endpoints
- [x] 16-02-PLAN.md -- Aggregated tenant profile endpoint (user + preferences + application + risk)

**Wave Structure:**
- Wave 1: 16-01 (schema + preferences CRUD)
- Wave 2: 16-02 (profile aggregation, depends on 01)

**Frontend Reference:**
- `src/lib/context/TenantProfileContext.tsx` - Profile with preferences
- `src/lib/context/UserProfileContext.tsx` - User profile management
- Data: preferredCities[], preferredBedrooms, preferredPropertyTypes[], budget range

**Expected Endpoints:**
```
PATCH  /users/me/preferences    // Save/update property preferences
GET    /users/me/preferences    // Get preferences
GET    /users/me/profile        // Get full tenant profile (preferences + application data + risk)
```

**Model:**
```prisma
model TenantPreference {
  id                     String    @id @default(uuid()) @db.Uuid
  userId                 String    @unique @map("user_id") @db.Uuid
  preferredCities        String[]  @default([])
  preferredBedrooms      Int?      @map("preferred_bedrooms")
  preferredPropertyTypes String[]  @default([]) @map("preferred_property_types")
  minBudget              Int?      @map("min_budget")
  maxBudget              Int?      @map("max_budget")
  petFriendly            Boolean   @default(false) @map("pet_friendly")
  moveInDate             DateTime? @map("move_in_date") @db.Date
  updatedAt              DateTime  @updatedAt @map("updated_at")
  user                   User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("tenant_preferences")
}
```

**Implementation Notes:**
- MUST be implemented before Phase 19 (Recommendations depends on this)
- Endpoints under /users/me/* (follows existing UsersModule pattern, not separate /tenants/)
- Profile endpoint aggregates: User + TenantPreference + latest Application data + RiskScore
- Preferences use upsert for idempotent create/update

### Phase 17: Coupons & Discounts (REORDERED - era Phase 19)
**Goal**: Coupon code system for subscription discounts (previously deferred as SUBS-06, SUBS-07)
**Depends on**: Phase 12 (Subscriptions)
**Requirements**: SUBS-06, SUBS-07 (previously deferred)
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Admin can create coupon codes with type (PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS)
  2. Admin can set validity dates, max uses, and applicable plans
  3. Tenant/landlord can validate a coupon code before applying
  4. Coupon applied during subscription creation/change reduces price
  5. Coupon usage tracked per user (prevent reuse)
  6. Expired/maxed coupons rejected with clear message
**Plans**: 2 plans

Plans:
- [x] 17-01-PLAN.md -- Prisma models (CouponType, Coupon, CouponUsage), CouponsModule with admin CRUD + validation + discount services
- [x] 17-02-PLAN.md -- Subscription integration (couponCode in DTOs, discount in subscribe/changePlan flows)

**Wave Structure:**
- Wave 1: 17-01 (standalone coupon system)
- Wave 2: 17-02 (subscription integration, depends on 01)

**Frontend Reference:**
- `src/lib/data/mock-coupons.ts` - 11 coupon codes with types/validity
- `src/lib/utils/coupon-validation.ts` - Validation logic
- `src/app/panel/checkout/page.tsx` - Checkout with coupon input

**Expected Endpoints:**
```
POST   /admin/coupons              // Create coupon (ADMIN)
GET    /admin/coupons              // List coupons (ADMIN)
PATCH  /admin/coupons/:id          // Update coupon (ADMIN)
DELETE /admin/coupons/:id          // Delete coupon (ADMIN)
GET    /coupons/validate/:code     // Validate coupon code (authenticated)
POST   /subscriptions/apply-coupon // Apply coupon to subscription
```

**Coupon Types (from frontend):**
- PERCENTAGE: Discount % off monthly price
- FIXED_AMOUNT: Fixed COP discount
- FREE_MONTHS: N months free
- FULL_ACCESS: Full access for N days

**Model:**
```prisma
model Coupon {
  id              String    @id @default(cuid())
  code            String    @unique
  type            CouponType
  value           Float
  validFrom       DateTime
  validUntil      DateTime
  maxUses         Int?
  currentUses     Int       @default(0)
  applicablePlans String[]  @default([])
  minimumPurchase Int?
  description     String
  isActive        Boolean   @default(true)
  createdAt       DateTime  @default(now())
}

model CouponRedemption {
  id         String   @id @default(cuid())
  couponId   String
  userId     String
  appliedAt  DateTime @default(now())
  coupon     Coupon   @relation(fields: [couponId], references: [id])
  user       User     @relation(fields: [userId], references: [id])
  @@unique([couponId, userId])
}
```

**Implementation Notes:**
- Independent of other new phases
- Integrates with existing SubscriptionsService
- ~3 plans estimated (models + admin CRUD + validation + subscription integration)

### Phase 18: Dashboard & Activity Log (REORDERED - era Phase 20)
**Goal**: Aggregated dashboard endpoints for landlord/tenant and persistent activity feed
**Depends on**: Phase 6 (Landlord), Phase 8 (Leases), Phase 10 (Payments), Phase 3.1 (Visits)
**Requirements**: DASH-01 through DASH-06
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Landlord dashboard returns aggregated financial stats (monthly income, collection rate, pending/late payments)
  2. Landlord dashboard returns urgent actions count (pending signatures, reviews, visits, ending leases)
  3. Landlord dashboard returns risk distribution of current candidates
  4. Tenant dashboard returns lease summary, payment status, upcoming events
  5. Activity log persisted to database (application events, payment events, visit events, contract events)
  6. Activity feed endpoint returns paginated chronological activity for user
**Plans**: 3 plans

Plans:
- [x] 18-01-PLAN.md -- ActivityLog model, ActivityType enum, ActivityLogModule (service + controller + DTOs)
- [x] 18-02-PLAN.md -- DashboardModule (landlord + tenant dashboard services, controllers, DTOs)
- [x] 18-03-PLAN.md -- Activity event listeners (application, payment, visit, contract)

**Wave Structure:**
- Wave 1 (parallel): 18-01 (activity log model + module), 18-02 (dashboard module)
- Wave 2: 18-03 (event listeners, depends on 18-01)

**Frontend Reference:**
- `src/lib/data/mock-dashboard.ts` - Financial stats, urgent actions, risk distribution
- `src/lib/data/mock-activity.ts` - Activity feed with types: application, status_change, message, document
- `src/app/panel/page.tsx` - Landlord dashboard
- `src/app/inquilino/page.tsx` - Tenant dashboard

**Expected Endpoints:**
```
GET /landlord/dashboard           // Aggregated landlord stats
GET /tenants/me/dashboard         // Aggregated tenant stats
GET /activities                   // Paginated activity feed (authenticated)
GET /activities?propertyId=X      // Activity filtered by property
```

**Model:**
```prisma
model Activity {
  id            String       @id @default(cuid())
  type          ActivityType
  title         String
  description   String
  userId        String
  propertyId    String?
  applicationId String?
  leaseId       String?
  metadata      Json?
  createdAt     DateTime     @default(now())
  user          User         @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum ActivityType {
  APPLICATION_SUBMITTED
  APPLICATION_STATUS_CHANGED
  PAYMENT_RECEIVED
  PAYMENT_APPROVED
  PAYMENT_REJECTED
  VISIT_REQUESTED
  VISIT_STATUS_CHANGED
  CONTRACT_CREATED
  CONTRACT_SIGNED
  LEASE_CREATED
  MESSAGE_RECEIVED
  DOCUMENT_UPLOADED
}
```

**Implementation Notes:**
- Benefits from having most features already complete (aggregates from many modules)
- Dashboard endpoints are read-only aggregation queries (no new models needed for dashboard itself)
- Activity model + event listeners are the main new work
- ~3-4 plans estimated (Activity model + event integration + landlord dashboard + tenant dashboard)

### Phase 19: Property Recommendations (REORDERED - era Phase 22)
**Goal**: Server-side personalized property matching and recommendation engine for tenants
**Depends on**: Phase 16 (Tenant Preferences), Phase 3 (Properties), Phase 5 (Scoring)
**Requirements**: RECOM-01 through RECOM-05
**Tier**: FREE
**Success Criteria** (what must be TRUE):
  1. Recommendation engine scores available properties against tenant profile/preferences
  2. Match score (0-100) computed per property with factor breakdown
  3. Acceptance probability calculated (alta/media/baja) based on tenant risk + property requirements
  4. Endpoint returns paginated recommended properties sorted by match score
  5. Recommendations update when preferences or properties change
**Research**: Complete (19-RESEARCH.md)
**Plans**: 2 plans

Plans:
- [ ] 19-01-PLAN.md -- Scoring engine: 4 sub-models (Affordability, RiskFit, ProfileStrength, Preferences) + RecommendationScorer
- [ ] 19-02-PLAN.md -- RecommendationsService, Controller (3 endpoints), Module + AppModule registration

**Wave Structure:**
- Wave 1: 19-01 (scoring models + interfaces)
- Wave 2: 19-02 (service + controller + module, depends on 01)

**Frontend Reference:**
- `src/lib/scoring/propertyMatching.ts` - Full matching algorithm
- `src/app/inquilino/para-ti/page.tsx` - Recommendations page
- Algorithm weights: 40% Affordability, 30% Risk Fit, 15% Profile Strength, 15% Preferences
- Filters to properties with >=40% match score
- Acceptance probability: alta (>=70%), media (50-69%), baja (<50%)

**Expected Endpoints:**
```
GET /recommendations              // Get personalized recommendations (authenticated tenant)
    ?sort=match|price_asc|price_desc|probability
    &probability=alta|media|baja
    &page=1&limit=9
GET /recommendations/top          // Get best single recommendation
GET /recommendations/property/:propertyId/match-score   // Get match score for specific property
```

**Matching Factors:**
```typescript
{
  matchScore: number,      // 0-100
  acceptanceProbability: 'alta' | 'media' | 'baja',
  matchFactors: {
    affordability: { score: number, label: string },   // 40% weight
    riskFit: { score: number, label: string },          // 30% weight
    profileStrength: { score: number, label: string },  // 15% weight
    preferences: { score: number, label: string }       // 15% weight
  },
  recommendation: string  // Human-readable explanation in Spanish
}
```

**Implementation Notes:**
- Most complex non-AI feature
- Depends on Phase 16 (Preferences) for tenant profile data
- Port algorithm from frontend `propertyMatching.ts` to backend
- No new database models needed (reads from existing Property, TenantPreference, RiskScoreResult)
- No new external dependencies

---
## FASES DE IA (AL FINAL)
---

### Phase 20: AI Document Analysis (REORDERED - era Phase 14)
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

### Phase 21: Explainability (REORDERED - era Phase 15)
**Goal**: Full scoring explanation with drivers, flags, and suggestions
**Depends on**: Phase 20 (AI Document Analysis)
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

### Phase 22: ML Persistence (REORDERED - era Phase 16)
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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> **2.1** -> 3 -> 3.1 -> 3.2 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12 -> 13 -> **14 -> 15 -> 16 -> 17 -> 18 -> 19 (frontend parity)** -> **20 -> 21 -> 22 (IA al final)**

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-01-25 |
| 2. Auth & Users | 3/3 | Complete | 2026-01-26 |
| **2.1. User Roles & Agents** | 4/4 | Complete | 2026-02-05 |
| 3. Properties | 4/4 | Complete | 2026-01-29 |
| 3.1. Property Visits | 4/4 | Complete | 2026-02-03 |
| 3.2. Natural Search | 1/1 | Complete | 2026-02-03 |
| 4. Applications & Documents | 5/5 | Complete | 2026-01-29 |
| 5. Scoring Engine | 3/3 | Complete | 2026-01-30 |
| 6. Landlord Features | 3/3 | Complete | 2026-02-01 |
| 7. Contracts | 4/4 | Complete | 2026-02-01 |
| 8. Leases & Payments | 3/3 | Complete | 2026-02-01 |
| 9. Payment History Scoring | 2/2 | Complete | 2026-02-02 |
| 10. Tenant Payment Simulation | 6/6 | Complete | 2026-02-02 |
| 11. Notifications | 5/5 | Complete | 2026-02-03 |
| 12. Subscriptions & Plans | 4/4 | Complete | 2026-02-04 |
| **13. Insurance** | 2/2 | Complete | 2026-02-04 |
| **14. Wishlist & Favorites** | 1/1 | Complete | 2026-02-07 |
| **15. Tenant Documents Vault** | 2/2 | Complete | 2026-02-07 |
| **16. Tenant Preferences & Profile** | 2/2 | Complete | 2026-02-07 |
| **17. Coupons & Discounts** | 2/2 | Complete | 2026-02-08 |
| **18. Dashboard & Activity Log** | 3/3 | Complete | 2026-02-08 |
| **19. Property Recommendations** | 0/2 | Planned | - |
| 20. AI Document Analysis (IA) | 0/0 | Not started | - |
| 21. Explainability (IA) | 0/0 | Not started | - |
| 22. ML Persistence (IA) | 0/0 | Not started | - |

## Notes

### Tier System

**FREE Tier (Phases 1-13, 14-19):**
- Basic rule-based scoring from application data
- Payment history scoring for returning tenants
- Simulated payment flow with receipt upload
- Wishlist, preferences, coupons, dashboard, documents vault, recommendations
- No external API costs

**PRO/BUSINESS Tier (Phases 20-22):**
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
| Supabase | DB, Auth, Storage, Realtime | SUPABASE_URL, SUPABASE_KEY | All |
| Redis | BullMQ queues | REDIS_URL | All |
| Claude API | Document analysis | ANTHROPIC_API_KEY | PRO+ |
| Resend | Email | RESEND_API_KEY | All |
| Firebase | Push notifications | FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL | All |

---
*Roadmap created: 2026-01-24*
*Last updated: 2026-02-08 - Phase 19 planned (Property Recommendations)*
