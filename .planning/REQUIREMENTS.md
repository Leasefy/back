# Requirements: Arriendo Fácil Backend

**Defined:** 2026-01-24
**Core Value:** Ejecutar el Risk Score con análisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

## v1 Requirements

Requirements for MVP release. Each maps to roadmap phases.

### Foundation (FUND)

- [x] **FUND-01**: NestJS 10.x project scaffolded with TypeScript strict mode
- [x] **FUND-02**: Prisma ORM configured with Supabase PostgreSQL
- [x] **FUND-03**: Environment configuration with validation
- [x] **FUND-04**: Global exception handling and error responses
- [x] **FUND-05**: Swagger/OpenAPI documentation setup
- [x] **FUND-06**: Health check endpoint

### Authentication (AUTH)

- [x] **AUTH-01**: User can register with email via Supabase Auth
- [x] **AUTH-02**: User can login and receive session token
- [x] **AUTH-03**: User can logout and invalidate session
- [x] **AUTH-04**: Supabase Auth guard protects private routes
- [x] **AUTH-05**: User roles distinguished (TENANT / LANDLORD / BOTH)
- [x] **AUTH-06**: Role-based access control for endpoints

### Users (USER)

- [x] **USER-01**: User profile synced from Supabase Auth
- [x] **USER-02**: User can view own profile
- [x] **USER-03**: User can update profile (name, phone)
- [x] **USER-04**: User can switch role if BOTH

### Properties (PROP)

- [x] **PROP-01**: Landlord can create property listing
- [x] **PROP-02**: Landlord can update own property
- [x] **PROP-03**: Landlord can delete own property (blocked if active applications)
- [x] **PROP-04**: Anyone can list properties (public, excludes draft)
- [x] **PROP-05**: Properties filterable by city, neighborhood
- [x] **PROP-06**: Properties filterable by price range (minPrice, maxPrice)
- [x] **PROP-07**: Properties filterable by bedrooms, propertyType
- [x] **PROP-08**: Properties filterable by amenities (array of IDs)
- [x] **PROP-09**: Anyone can view property detail
- [x] **PROP-10**: Landlord can upload property images to Supabase Storage (max 10)
- [x] **PROP-11**: Property images ordered with first as thumbnail
- [x] **PROP-12**: Landlord can view own properties list
- [x] **PROP-13**: Property supports draft status (not visible to public)
- [x] **PROP-14**: Property model includes parkingSpaces, stratum, yearBuilt
- [x] **PROP-15**: Property model includes listingPlan (free/pro/business)
- [x] **PROP-16**: Full-text search on title, description, address, neighborhood

### Property Visits (VISIT)

- [x] **VISIT-01**: Landlord can configure availability (weekly schedule with day/hours)
- [x] **VISIT-02**: Landlord can set visit slot duration (15, 30, 45, 60 minutes)
- [x] **VISIT-03**: Tenant can view available slots for a property
- [x] **VISIT-04**: Tenant can request a visit (select date/time slot)
- [x] **VISIT-05**: System prevents double-booking (occupied slots not available)
- [x] **VISIT-06**: Landlord can accept visit request
- [x] **VISIT-07**: Landlord can reject visit request with reason
- [x] **VISIT-08**: Tenant can reschedule a pending visit
- [x] **VISIT-09**: Either party can cancel a visit with reason
- [x] **VISIT-10**: Notifications sent on visit status changes (integrated with Phase 13)
- [x] **VISIT-11**: Tenant can view their scheduled visits
- [x] **VISIT-12**: Landlord can view all visits for their properties

### Applications (APPL)

- [x] **APPL-01**: Tenant can start application for a property
- [x] **APPL-02**: Application wizard step 1: Personal info
- [x] **APPL-03**: Application wizard step 2: Employment info
- [x] **APPL-04**: Application wizard step 3: Income info
- [x] **APPL-05**: Application wizard step 4: References (landlord, employment, personal)
- [x] **APPL-06**: Application wizard step 5: Document upload
- [x] **APPL-07**: Application wizard step 6: Review and submit
- [x] **APPL-08**: Application state machine enforced (DRAFT→SUBMITTED→UNDER_REVIEW→NEEDS_INFO→PREAPPROVED→APPROVED/REJECTED/WITHDRAWN)
- [x] **APPL-09**: State transitions logged with timestamps
- [x] **APPL-10**: Tenant can view application timeline/events
- [x] **APPL-11**: Tenant can withdraw application
- [x] **APPL-12**: Tenant can view list of own applications
- [x] **APPL-13**: Tenant can respond to info requests

### Documents (DOCS)

- [x] **DOCS-01**: Tenant can upload ID document (cédula)
- [x] **DOCS-02**: Tenant can upload employment letter (carta laboral)
- [x] **DOCS-03**: Tenant can upload pay stubs (desprendibles)
- [x] **DOCS-04**: Tenant can upload bank statements (extractos)
- [x] **DOCS-05**: Documents stored in Supabase Storage
- [x] **DOCS-06**: Documents accessible via signed URLs
- [x] **DOCS-07**: Document type validation (PDF, images)
- [x] **DOCS-08**: Document size limit enforced

### Risk Score Engine (SCOR)

- [ ] **SCOR-01**: FeatureBuilder extracts features from application data
- [ ] **SCOR-02**: IntegrityEngine detects inconsistencies and fraud signals
- [ ] **SCOR-03**: FinancialModel calculates rent-to-income ratio and capacity
- [ ] **SCOR-04**: StabilityModel evaluates employment tenure, contract type, address history
- [ ] **SCOR-05**: HistoryModel evaluates references and rental history
- [ ] **SCOR-06**: Aggregator combines subscores with configurable weights → 0-100
- [ ] **SCOR-07**: Score translates to level A/B/C/D with recommendation
- [ ] **SCOR-08**: Scoring runs async via BullMQ queue
- [ ] **SCOR-09**: Score result persisted to database

### AI Document Analysis (AIDOC)

- [ ] **AIDOC-01**: Claude API integration configured
- [ ] **AIDOC-02**: ID document analyzer extracts name, number, dates
- [ ] **AIDOC-03**: Employment letter analyzer extracts company, position, salary, tenure
- [ ] **AIDOC-04**: Pay stub analyzer extracts income details
- [ ] **AIDOC-05**: Bank statement analyzer detects income patterns
- [ ] **AIDOC-06**: Document analysis results stored for scoring
- [ ] **AIDOC-07**: Analysis includes confidence score
- [ ] **AIDOC-08**: Cross-validation between documents (salary match, etc.)

### Explainability (EXPL)

- [ ] **EXPL-01**: 3-6 driver explanations generated per candidate
- [ ] **EXPL-02**: Risk flags generated as structured data
- [ ] **EXPL-03**: Suggested conditions generated (cosigner, deposit, insurance)
- [ ] **EXPL-04**: AI-generated conversational explanation
- [ ] **EXPL-05**: Subscores visible per category

### Landlord Features (LAND)

- [x] **LAND-01**: Landlord can view candidates for each property
- [x] **LAND-02**: Candidates ranked by score
- [x] **LAND-03**: Candidate cards include score, level, key metrics
- [x] **LAND-04**: Landlord can view candidate detail with full score
- [x] **LAND-05**: Landlord can pre-approve candidate
- [x] **LAND-06**: Landlord can approve candidate
- [x] **LAND-07**: Landlord can reject candidate
- [x] **LAND-08**: Landlord can request additional info
- [x] **LAND-09**: Landlord can add private notes to candidates
- [x] **LAND-10**: Landlord can view candidate documents

### Notifications (NOTF)

- [x] **NOTF-01**: Email service configured (Resend)
- [x] **NOTF-02**: Email sent when application received (to landlord)
- [x] **NOTF-03**: Email sent when application approved (to tenant)
- [x] **NOTF-04**: Email sent when application rejected (to tenant)
- [x] **NOTF-05**: Email sent when info requested (to tenant)
- [x] **NOTF-06**: Emails sent async via BullMQ queue
- [x] **NOTF-07**: Email templates with branding
- [x] **NOTF-08**: Email sent when payment receipt uploaded (to landlord)
- [x] **NOTF-09**: Email sent when payment approved/rejected (to tenant)
- [x] **NOTF-10**: Email sent when dispute opened (to support + landlord)
- [x] **NOTF-11**: Push notification infrastructure configured (Firebase or similar)

### Persistence for ML (MLPR)

- [ ] **MLPR-01**: All extracted features persisted
- [ ] **MLPR-02**: Application outcomes tracked (approved → paid/defaulted)
- [ ] **MLPR-03**: Score predictions vs actuals logged
- [ ] **MLPR-04**: Data export capability for ML training

### Subscriptions & Plans (SUBS)

- [ ] **SUBS-01**: Three plans defined: free, pro, business
- [ ] **SUBS-02**: Plan limits enforced (properties count, AI scoring access)
- [ ] **SUBS-03**: User can view available plans
- [ ] **SUBS-04**: User can subscribe to a plan
- [ ] **SUBS-05**: Subscription status tracked (active, cancelled, past_due)
- [ ] **SUBS-06**: Coupon codes can be validated
- [ ] **SUBS-07**: Coupon discount applied to subscription
- [ ] **SUBS-08**: Plan selection during property publishing

### Contracts (CONT)

- [x] **CONT-01**: Contract templates available
- [x] **CONT-02**: Landlord can create contract for approved candidate
- [x] **CONT-03**: Contract includes start/end dates, rent, deposit, payment day
- [x] **CONT-04**: Contract supports custom clauses
- [x] **CONT-05**: Contract supports optional insurance selection
- [x] **CONT-06**: Landlord can sign contract digitally
- [x] **CONT-07**: Tenant can sign contract digitally
- [x] **CONT-08**: Digital signatures comply with Ley 527/1999
- [x] **CONT-09**: Signed contract generates PDF document
- [x] **CONT-10**: Contract status tracked (draft, pending_signature, signed, active)

### Leases & Payments (LEAS)

- [x] **LEAS-01**: Lease created automatically from signed contract
- [x] **LEAS-02**: Lease status tracked (active, ending_soon, ended, terminated)
- [x] **LEAS-03**: Lease includes denormalized property/tenant/landlord info
- [x] **LEAS-04**: Landlord can record payment received
- [x] **LEAS-05**: Payment methods supported (transfer, PSE, cash)
- [x] **LEAS-06**: Payment history visible to both parties
- [x] **LEAS-07**: Tenant can view active lease details
- [x] **LEAS-08**: Landlord can view all their leases

### Payment History Scoring (PHSC)

- [x] **PHSC-01**: PaymentHistoryService calculates metrics from past payments
- [x] **PHSC-02**: On-time payment percentage tracked (5-day grace period)
- [x] **PHSC-03**: Late payment frequency affects score negatively
- [x] **PHSC-04**: Returning tenants (2+ leases) get score bonus
- [x] **PHSC-05**: Payment history feeds into Scoring Engine as bonus (0-15 pts)
- [x] **PHSC-06**: Tenant can view their payment reputation and tier (GOLD/SILVER/BRONZE/NEW)

### Tenant Payment Simulation (TPAY)

- [x] **TPAY-01**: Landlord can configure payment methods (bank accounts, Nequi, Daviplata)
- [x] **TPAY-02**: Payment method configuration includes bank name, account type, account number
- [x] **TPAY-03**: Tenant can view landlord's configured payment methods
- [x] **TPAY-04**: Tenant can select payment type: Transfer or PSE
- [x] **TPAY-05**: Payment form auto-fills amount from lease rent value
- [x] **TPAY-06**: For Transfer: tenant uploads payment receipt (comprobante) to Supabase Storage
- [x] **TPAY-07**: For PSE: tenant fills mock form (name, document type/number, bank selection)
- [x] **TPAY-08**: PSE mock form validates and returns simulated response
- [x] **TPAY-09**: Receipt upload creates pending payment record (status: PENDING_VALIDATION)
- [x] **TPAY-10**: Approved payments integrate with existing payment recording flow
- [x] **TPAY-11**: If landlord rejects payment, tenant can open dispute (solicitud de inconformidad)
- [x] **TPAY-12**: Dispute creates support ticket with reason and evidence for review

### Insurance (INSU)

- [x] **INSU-01**: Three insurance tiers: none, basic, premium
- [x] **INSU-02**: Insurance can be selected during contract creation
- [x] **INSU-03**: Insurance premium calculated and added to contract
- [x] **INSU-04**: Insurance coverage details visible

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Real-time Features

- **RT-01**: WebSocket for live status updates
- **RT-02**: Supabase Realtime integration
- **RT-03**: Push notifications

### Advanced Landlord

- **ADV-01**: Candidate comparison view
- **ADV-02**: Bulk actions on candidates
- **ADV-03**: Property analytics dashboard

### Integrations

- **INT-01**: Datacrédito integration (credit bureau)
- **INT-02**: Truora identity verification
- **INT-03**: Payment gateway (PSE, Nequi)
- **INT-04**: Contract generation

### Multi-tenancy

- **MT-01**: Multiple landlords per property (co-ownership)
- **MT-02**: Property management companies

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Real payments/contracts | MVP validates scoring flow, transactions later |
| Real-time chat | Async info requests sufficient for MVP |
| Credit bureau integration | Internal scoring first, external later |
| SMS/WhatsApp notifications | Email only for MVP |
| Identity verification (biometric) | Document upload + AI analysis for MVP |
| Magic link / OTP login | Standard email/password with Supabase |
| Multi-country | Colombia only (COP, Colombian documents) |
| Mobile app API differences | Same API for web and future mobile |
| Admin panel | MVP focuses on landlord/tenant flows |

## Traceability

Which phases cover which requirements. Updated by roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| FUND-01 | Phase 1 | Complete |
| FUND-02 | Phase 1 | Complete |
| FUND-03 | Phase 1 | Complete |
| FUND-04 | Phase 1 | Complete |
| FUND-05 | Phase 1 | Complete |
| FUND-06 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| USER-01 | Phase 2 | Complete |
| USER-02 | Phase 2 | Complete |
| USER-03 | Phase 2 | Complete |
| USER-04 | Phase 2 | Complete |
| PROP-01 | Phase 3 | Complete |
| PROP-02 | Phase 3 | Complete |
| PROP-03 | Phase 3 | Complete |
| PROP-04 | Phase 3 | Complete |
| PROP-05 | Phase 3 | Complete |
| PROP-06 | Phase 3 | Complete |
| PROP-07 | Phase 3 | Complete |
| PROP-08 | Phase 3 | Complete |
| PROP-09 | Phase 3 | Complete |
| PROP-10 | Phase 3 | Complete |
| PROP-11 | Phase 3 | Complete |
| PROP-12 | Phase 3 | Complete |
| APPL-01 | Phase 4 | Complete |
| APPL-02 | Phase 4 | Complete |
| APPL-03 | Phase 4 | Complete |
| APPL-04 | Phase 4 | Complete |
| APPL-05 | Phase 4 | Complete |
| APPL-06 | Phase 4 | Complete |
| APPL-07 | Phase 4 | Complete |
| APPL-08 | Phase 4 | Complete |
| APPL-09 | Phase 4 | Complete |
| APPL-10 | Phase 4 | Complete |
| APPL-11 | Phase 4 | Complete |
| APPL-12 | Phase 4 | Complete |
| APPL-13 | Phase 4 | Complete |
| DOCS-01 | Phase 4 | Complete |
| DOCS-02 | Phase 4 | Complete |
| DOCS-03 | Phase 4 | Complete |
| DOCS-04 | Phase 4 | Complete |
| DOCS-05 | Phase 4 | Complete |
| DOCS-06 | Phase 4 | Complete |
| DOCS-07 | Phase 4 | Complete |
| DOCS-08 | Phase 4 | Complete |
| SCOR-01 | Phase 5 | Pending |
| SCOR-02 | Phase 5 | Pending |
| SCOR-03 | Phase 5 | Pending |
| SCOR-04 | Phase 5 | Pending |
| SCOR-05 | Phase 5 | Pending |
| SCOR-06 | Phase 5 | Pending |
| SCOR-07 | Phase 5 | Pending |
| SCOR-08 | Phase 5 | Pending |
| SCOR-09 | Phase 5 | Pending |
| AIDOC-01 | Phase 6 | Pending |
| AIDOC-02 | Phase 6 | Pending |
| AIDOC-03 | Phase 6 | Pending |
| AIDOC-04 | Phase 6 | Pending |
| AIDOC-05 | Phase 6 | Pending |
| AIDOC-06 | Phase 6 | Pending |
| AIDOC-07 | Phase 6 | Pending |
| AIDOC-08 | Phase 6 | Pending |
| EXPL-01 | Phase 7 | Pending |
| EXPL-02 | Phase 7 | Pending |
| EXPL-03 | Phase 7 | Pending |
| EXPL-04 | Phase 7 | Pending |
| EXPL-05 | Phase 7 | Pending |
| LAND-01 | Phase 8 | Pending |
| LAND-02 | Phase 8 | Pending |
| LAND-03 | Phase 8 | Pending |
| LAND-04 | Phase 8 | Pending |
| LAND-05 | Phase 8 | Pending |
| LAND-06 | Phase 8 | Pending |
| LAND-07 | Phase 8 | Pending |
| LAND-08 | Phase 8 | Pending |
| LAND-09 | Phase 8 | Pending |
| LAND-10 | Phase 8 | Pending |
| NOTF-01 | Phase 11 | Complete |
| NOTF-02 | Phase 11 | Complete |
| NOTF-03 | Phase 11 | Complete |
| NOTF-04 | Phase 11 | Complete |
| NOTF-05 | Phase 11 | Complete |
| NOTF-06 | Phase 11 | Complete |
| NOTF-07 | Phase 11 | Complete |
| NOTF-08 | Phase 11 | Complete |
| NOTF-09 | Phase 11 | Complete |
| NOTF-10 | Phase 11 | Complete |
| NOTF-11 | Phase 11 | Complete |
| MLPR-01 | Phase 14 | Pending |
| MLPR-02 | Phase 14 | Pending |
| MLPR-03 | Phase 14 | Pending |
| MLPR-04 | Phase 14 | Pending |
| SUBS-01 | Phase 15 | Pending |
| SUBS-02 | Phase 15 | Pending |
| SUBS-03 | Phase 15 | Pending |
| SUBS-04 | Phase 15 | Pending |
| SUBS-05 | Phase 15 | Pending |
| SUBS-06 | Phase 15 | Pending |
| SUBS-07 | Phase 15 | Pending |
| SUBS-08 | Phase 15 | Pending |
| CONT-01 | Phase 12 | Pending |
| CONT-02 | Phase 12 | Pending |
| CONT-03 | Phase 12 | Pending |
| CONT-04 | Phase 12 | Pending |
| CONT-05 | Phase 12 | Pending |
| CONT-06 | Phase 12 | Pending |
| CONT-07 | Phase 12 | Pending |
| CONT-08 | Phase 12 | Pending |
| CONT-09 | Phase 12 | Pending |
| CONT-10 | Phase 12 | Pending |
| LEAS-01 | Phase 8 | Complete |
| LEAS-02 | Phase 8 | Complete |
| LEAS-03 | Phase 8 | Complete |
| LEAS-04 | Phase 8 | Complete |
| LEAS-05 | Phase 8 | Complete |
| LEAS-06 | Phase 8 | Complete |
| LEAS-07 | Phase 8 | Complete |
| LEAS-08 | Phase 8 | Complete |
| PHSC-01 | Phase 9 | Complete |
| PHSC-02 | Phase 9 | Complete |
| PHSC-03 | Phase 9 | Complete |
| PHSC-04 | Phase 9 | Complete |
| PHSC-05 | Phase 9 | Complete |
| PHSC-06 | Phase 9 | Complete |
| TPAY-01 | Phase 10 | Complete |
| TPAY-02 | Phase 10 | Complete |
| TPAY-03 | Phase 10 | Complete |
| TPAY-04 | Phase 10 | Complete |
| TPAY-05 | Phase 10 | Complete |
| TPAY-06 | Phase 10 | Complete |
| TPAY-07 | Phase 10 | Complete |
| TPAY-08 | Phase 10 | Complete |
| TPAY-09 | Phase 10 | Complete |
| TPAY-10 | Phase 10 | Complete |
| TPAY-11 | Phase 10 | Complete |
| TPAY-12 | Phase 10 | Complete |
| INSU-01 | Phase 13 | Complete |
| INSU-02 | Phase 13 | Complete |
| INSU-03 | Phase 13 | Complete |
| INSU-04 | Phase 13 | Complete |
| PROP-13 | Phase 3 | Complete |
| PROP-14 | Phase 3 | Complete |
| PROP-15 | Phase 3 | Complete |
| PROP-16 | Phase 3 | Complete |
| VISIT-01 | Phase 3.1 | Complete |
| VISIT-02 | Phase 3.1 | Complete |
| VISIT-03 | Phase 3.1 | Complete |
| VISIT-04 | Phase 3.1 | Complete |
| VISIT-05 | Phase 3.1 | Complete |
| VISIT-06 | Phase 3.1 | Complete |
| VISIT-07 | Phase 3.1 | Complete |
| VISIT-08 | Phase 3.1 | Complete |
| VISIT-09 | Phase 3.1 | Complete |
| VISIT-10 | Phase 3.1 | Complete |
| VISIT-11 | Phase 3.1 | Complete |
| VISIT-12 | Phase 3.1 | Complete |

**Coverage:**
- v1 requirements: 146 total (was 134, added 12 new: VISIT-01 to VISIT-12)
- Mapped to phases: 124
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-02-03 - Completed VISIT-01 to VISIT-12 for Phase 3.1 (Property Visits)*
