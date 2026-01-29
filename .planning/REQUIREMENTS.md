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

- [ ] **PROP-01**: Landlord can create property listing
- [ ] **PROP-02**: Landlord can update own property
- [ ] **PROP-03**: Landlord can delete own property (blocked if active applications)
- [ ] **PROP-04**: Anyone can list properties (public, excludes draft)
- [ ] **PROP-05**: Properties filterable by city, neighborhood
- [ ] **PROP-06**: Properties filterable by price range (minPrice, maxPrice)
- [ ] **PROP-07**: Properties filterable by bedrooms, propertyType
- [ ] **PROP-08**: Properties filterable by amenities (array of IDs)
- [ ] **PROP-09**: Anyone can view property detail
- [ ] **PROP-10**: Landlord can upload property images to Supabase Storage (max 10)
- [ ] **PROP-11**: Property images ordered with first as thumbnail
- [ ] **PROP-12**: Landlord can view own properties list
- [ ] **PROP-13**: Property supports draft status (not visible to public)
- [ ] **PROP-14**: Property model includes parkingSpaces, stratum, yearBuilt
- [ ] **PROP-15**: Property model includes listingPlan (free/pro/business)
- [ ] **PROP-16**: Full-text search on title, description, address, neighborhood

### Applications (APPL)

- [ ] **APPL-01**: Tenant can start application for a property
- [ ] **APPL-02**: Application wizard step 1: Personal info
- [ ] **APPL-03**: Application wizard step 2: Employment info
- [ ] **APPL-04**: Application wizard step 3: Income info
- [ ] **APPL-05**: Application wizard step 4: References (landlord, employment, personal)
- [ ] **APPL-06**: Application wizard step 5: Document upload
- [ ] **APPL-07**: Application wizard step 6: Review and submit
- [ ] **APPL-08**: Application state machine enforced (DRAFT→SUBMITTED→UNDER_REVIEW→NEEDS_INFO→PREAPPROVED→APPROVED/REJECTED/WITHDRAWN)
- [ ] **APPL-09**: State transitions logged with timestamps
- [ ] **APPL-10**: Tenant can view application timeline/events
- [ ] **APPL-11**: Tenant can withdraw application
- [ ] **APPL-12**: Tenant can view list of own applications
- [ ] **APPL-13**: Tenant can respond to info requests

### Documents (DOCS)

- [ ] **DOCS-01**: Tenant can upload ID document (cédula)
- [ ] **DOCS-02**: Tenant can upload employment letter (carta laboral)
- [ ] **DOCS-03**: Tenant can upload pay stubs (desprendibles)
- [ ] **DOCS-04**: Tenant can upload bank statements (extractos)
- [ ] **DOCS-05**: Documents stored in Supabase Storage
- [ ] **DOCS-06**: Documents accessible via signed URLs
- [ ] **DOCS-07**: Document type validation (PDF, images)
- [ ] **DOCS-08**: Document size limit enforced

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

- [ ] **LAND-01**: Landlord can view candidates for each property
- [ ] **LAND-02**: Candidates ranked by score
- [ ] **LAND-03**: Candidate cards include score, level, key metrics
- [ ] **LAND-04**: Landlord can view candidate detail with full score
- [ ] **LAND-05**: Landlord can pre-approve candidate
- [ ] **LAND-06**: Landlord can approve candidate
- [ ] **LAND-07**: Landlord can reject candidate
- [ ] **LAND-08**: Landlord can request additional info
- [ ] **LAND-09**: Landlord can add private notes to candidates
- [ ] **LAND-10**: Landlord can view candidate documents

### Notifications (NOTF)

- [ ] **NOTF-01**: Email service configured (Resend)
- [ ] **NOTF-02**: Email sent when application received (to landlord)
- [ ] **NOTF-03**: Email sent when application approved (to tenant)
- [ ] **NOTF-04**: Email sent when application rejected (to tenant)
- [ ] **NOTF-05**: Email sent when info requested (to tenant)
- [ ] **NOTF-06**: Emails sent async via BullMQ queue
- [ ] **NOTF-07**: Email templates with branding

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

- [ ] **CONT-01**: Contract templates available
- [ ] **CONT-02**: Landlord can create contract for approved candidate
- [ ] **CONT-03**: Contract includes start/end dates, rent, deposit, payment day
- [ ] **CONT-04**: Contract supports custom clauses
- [ ] **CONT-05**: Contract supports optional insurance selection
- [ ] **CONT-06**: Landlord can sign contract digitally
- [ ] **CONT-07**: Tenant can sign contract digitally
- [ ] **CONT-08**: Digital signatures comply with Ley 527/1999
- [ ] **CONT-09**: Signed contract generates PDF document
- [ ] **CONT-10**: Contract status tracked (draft, pending_signature, signed, active)

### Leases & Payments (LEAS)

- [ ] **LEAS-01**: Lease created automatically from signed contract
- [ ] **LEAS-02**: Lease status tracked (active, ending_soon, ended, terminated)
- [ ] **LEAS-03**: Lease includes denormalized property/tenant/landlord info
- [ ] **LEAS-04**: Landlord can record payment received
- [ ] **LEAS-05**: Payment methods supported (transfer, PSE, cash)
- [ ] **LEAS-06**: Payment history visible to both parties
- [ ] **LEAS-07**: Tenant can view active lease details
- [ ] **LEAS-08**: Landlord can view all their leases

### Insurance (INSU)

- [ ] **INSU-01**: Three insurance tiers: none, basic, premium
- [ ] **INSU-02**: Insurance can be selected during contract creation
- [ ] **INSU-03**: Insurance premium calculated and added to contract
- [ ] **INSU-04**: Insurance coverage details visible

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
| PROP-01 | Phase 3 | Pending |
| PROP-02 | Phase 3 | Pending |
| PROP-03 | Phase 3 | Pending |
| PROP-04 | Phase 3 | Pending |
| PROP-05 | Phase 3 | Pending |
| PROP-06 | Phase 3 | Pending |
| PROP-07 | Phase 3 | Pending |
| PROP-08 | Phase 3 | Pending |
| PROP-09 | Phase 3 | Pending |
| PROP-10 | Phase 3 | Pending |
| PROP-11 | Phase 3 | Pending |
| PROP-12 | Phase 3 | Pending |
| APPL-01 | Phase 4 | Pending |
| APPL-02 | Phase 4 | Pending |
| APPL-03 | Phase 4 | Pending |
| APPL-04 | Phase 4 | Pending |
| APPL-05 | Phase 4 | Pending |
| APPL-06 | Phase 4 | Pending |
| APPL-07 | Phase 4 | Pending |
| APPL-08 | Phase 4 | Pending |
| APPL-09 | Phase 4 | Pending |
| APPL-10 | Phase 4 | Pending |
| APPL-11 | Phase 4 | Pending |
| APPL-12 | Phase 4 | Pending |
| APPL-13 | Phase 4 | Pending |
| DOCS-01 | Phase 4 | Pending |
| DOCS-02 | Phase 4 | Pending |
| DOCS-03 | Phase 4 | Pending |
| DOCS-04 | Phase 4 | Pending |
| DOCS-05 | Phase 4 | Pending |
| DOCS-06 | Phase 4 | Pending |
| DOCS-07 | Phase 4 | Pending |
| DOCS-08 | Phase 4 | Pending |
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
| NOTF-01 | Phase 9 | Pending |
| NOTF-02 | Phase 9 | Pending |
| NOTF-03 | Phase 9 | Pending |
| NOTF-04 | Phase 9 | Pending |
| NOTF-05 | Phase 9 | Pending |
| NOTF-06 | Phase 9 | Pending |
| NOTF-07 | Phase 9 | Pending |
| MLPR-01 | Phase 10 | Pending |
| MLPR-02 | Phase 10 | Pending |
| MLPR-03 | Phase 10 | Pending |
| MLPR-04 | Phase 10 | Pending |
| SUBS-01 | Phase 11 | Pending |
| SUBS-02 | Phase 11 | Pending |
| SUBS-03 | Phase 11 | Pending |
| SUBS-04 | Phase 11 | Pending |
| SUBS-05 | Phase 11 | Pending |
| SUBS-06 | Phase 11 | Pending |
| SUBS-07 | Phase 11 | Pending |
| SUBS-08 | Phase 11 | Pending |
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
| LEAS-01 | Phase 13 | Pending |
| LEAS-02 | Phase 13 | Pending |
| LEAS-03 | Phase 13 | Pending |
| LEAS-04 | Phase 13 | Pending |
| LEAS-05 | Phase 13 | Pending |
| LEAS-06 | Phase 13 | Pending |
| LEAS-07 | Phase 13 | Pending |
| LEAS-08 | Phase 13 | Pending |
| INSU-01 | Phase 14 | Pending |
| INSU-02 | Phase 14 | Pending |
| INSU-03 | Phase 14 | Pending |
| INSU-04 | Phase 14 | Pending |
| PROP-13 | Phase 3 | Pending |
| PROP-14 | Phase 3 | Pending |
| PROP-15 | Phase 3 | Pending |
| PROP-16 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 112 total (was 78, added 34 new)
- Mapped to phases: 112
- Unmapped: 0 ✓

---
*Requirements defined: 2026-01-24*
*Last updated: 2026-01-29 - Added SUBS, CONT, LEAS, INSU requirements based on frontend*
