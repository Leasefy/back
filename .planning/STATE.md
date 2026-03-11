# Project State: Arriendo Facil Backend

## Current Status

**Milestone:** v1.0 Backend MVP — SHIPPED 2026-02-16
**Status:** Post-v1.0 Active Development
**Last activity:** 2026-03-10 - Completed 23-02-PLAN.md (Token-Based Invitation System)

**Progress:** [########################################] v1.0 complete + Phase 23 in progress (23-02/3 done)

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

**Current focus:** Phase 23 — Inmobiliaria Registration & Onboarding Flow (post-v1.0).

## Quick Context

- Backend NestJS para marketplace de arriendos
- Supabase: PostgreSQL + Auth + Storage
- Risk Score con AI (Claude) para analisis de documentos (PRO+ tier)
- 22 fases, ~148 requirements
- Tier system: FREE (Phases 1-19), PRO+ (Phases 20-22)

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Foundation | COMPLETE | All 3 plans executed |
| 2. Auth & Users | COMPLETE | All 3 plans executed |
| 3. Properties | COMPLETE | All 4 plans executed |
| 3.1 Property Visits | COMPLETE | All 4 plans - models, services, operations, endpoints |
| 4. Applications | COMPLETE | All 5 plans executed |
| 5. Scoring Engine | COMPLETE | All 3 plans executed - async scoring pipeline |
| 6. Landlord Features | COMPLETE | All 3 plans - decisions, notes, review |
| 7. Contracts | COMPLETE | All 4 plans - model, services, endpoints, signatures |
| 8. Leases & Payments | COMPLETE | All 3 plans - models, events, services, endpoints |
| 9. Payment History Scoring | COMPLETE | All 2 plans - metrics, model, aggregator integration |
| 10. Tenant Payment Simulation | COMPLETE | All 6 plans - landlord methods, tenant requests, PSE mock, validation, disputes |
| 11. Notifications | COMPLETE | All 5 plans - data models, services, sending, templates, event integration |
| 12. Subscriptions & Plans | COMPLETE | All 4 plans - models, services, controllers, enforcement, cron |
| 13. Insurance | COMPLETE | All 2 plans - enum, service, controller, contract integration |
| 2.1 User Roles & Agents | COMPLETE | All 4 plans - AGENT role, PropertyAccess, Chat |
| 14. Wishlist & Favorites | COMPLETE | 1 plan - WishlistItem model, service, controller, 3 endpoints |
| 15. Tenant Documents Vault | COMPLETE | All 2 plans - LeaseDocument model/service, REST endpoints, tenant vault aggregation |
| 16. Tenant Preferences & Profile | COMPLETE | All 2 plans - TenantPreference model, preferences endpoints, profile aggregation |
| 17. Coupons & Discounts | COMPLETE | All 2 plans - Coupon infrastructure, subscription integration |
| 18. Dashboard & Activity Log | COMPLETE | All 3 plans - ActivityLog model (18-01), Dashboard endpoints (18-02), Activity event listeners (18-03) |
| 19. Property Recommendations | COMPLETE | All 2 plans - Scoring engine (19-01), Service+Endpoints (19-02) |
| 2.2 Inmobiliaria Backend | COMPLETE | All 8 plans - Schema, Agency, Propietarios, Pipeline, Cobros/Dispersiones, Mantenimiento/Renovaciones, Documentos/Actas, Reports/Analytics/Dashboard |
| 20. AI Document Analysis (IA) | COMPLETE | PRO+ tier - Cohere + OCR pipeline |
| 21. Explainability (IA) | COMPLETE | All 2 plans - core services (21-01), endpoint + processor integration (21-02) |
| 22. ML Persistence (IA) | COMPLETE | All 2 plans - feature snapshots, prediction logs (22-01), outcome tracking + export (22-02) |
| 23. Inmobiliaria Registration | IN PROGRESS | 2/3 plans - 23-01 schema + onboarding, 23-02 token invitations complete |

## Roadmap Evolution

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-01-30 | Reordered phases 6-15 | Logical flow: approve -> contract -> payments -> history scoring |
| 2026-01-30 | Added Phase 9: Payment History Scoring | Enable scoring based on real payment data |
| 2026-01-30 | Moved AI features to phases 10-11 | PRO+ tier only, after core flow complete |
| 2026-01-30 | Added tier system | FREE (1-9) vs PRO+ (10-11) |
| 2026-02-02 | Added Phase 3.1: Property Visits Scheduling | Tenant can schedule visits, landlord manages availability |
| 2026-02-05 | Added Phase 2.1: User Roles & Property Agents | Agents can manage landlord properties, chat for applications |
| 2026-02-07 | Added Phases 14-19: Frontend Parity | Backend must support all frontend features (Wishlist, Documents Vault, Preferences, Coupons, Dashboard, Recommendations) |
| 2026-02-07 | Reordered: IA phases moved to 20-22 | Frontend parity first (14-19), then IA al final (20-22) |

## Accumulated Decisions

| Date | Phase-Plan | Decision | Rationale |
|------|------------|----------|-----------|
| 2026-01-25 | 01-01 | NestJS 11.x | Latest stable, full backward compatibility |
| 2026-01-25 | 01-01 | class-validator for env validation | Type-safe, consistent with NestJS ecosystem |
| 2026-01-25 | 01-01 | ConfigModule global | Available throughout app without re-importing |
| 2026-01-25 | 01-02 | Prisma 7.x adapter pattern | New Prisma 7 requires adapter for direct DB connection |
| 2026-01-25 | 01-02 | @prisma/adapter-pg for PostgreSQL | Direct database connection without Prisma Accelerate |
| 2026-01-25 | 01-02 | Default Prisma output (node_modules) | ESM/CJS compatibility with NestJS build |
| 2026-01-25 | 01-03 | AllExceptionsFilter catches ALL | Uniform error handling for HttpException, Error, unknown |
| 2026-01-25 | 01-03 | Swagger in all environments | MVP simplicity, can restrict later |
| 2026-01-25 | 01-03 | Environment-aware CORS | Dev allows all, prod restricts to domain |
| 2026-01-25 | 02-01 | DIRECT_URL for prisma db push | Pooler hangs, direct connection works |
| 2026-01-25 | 02-01 | Role as Prisma enum | Type-safe, auto-generates TypeScript types |
| 2026-01-25 | 02-01 | activeRole field for BOTH users | Track current context when acting as TENANT/LANDLORD |
| 2026-01-25 | 02-01 | SECURITY DEFINER on trigger | Required for cross-schema write from auth to public |
| 2026-01-26 | 02-02 | JWKS-based JWT verification | Future-proof, automatic key rotation support |
| 2026-01-26 | 02-02 | Global guards via APP_GUARD | All routes protected by default (more secure) |
| 2026-01-26 | 02-02 | Auth guard before roles guard | User must be populated for role check |
| 2026-01-26 | 02-02 | BOTH role grants full access | Simplifies logic for dual-role users |
| 2026-01-26 | 02-03 | Colombian phone regex | /^(\+57)?3[0-9]{9}$/ for mobile validation |
| 2026-01-26 | 02-03 | Role switch targets only TENANT/LANDLORD | BOTH users switch TO one of these roles |
| 2026-01-26 | 02-03 | Double validation for role switch | Guard + service check for defense in depth |
| 2026-01-29 | 03-01 | Prisma enums mirror TypeScript enums | Type safety across database and application layers |
| 2026-01-29 | 03-01 | Cascade delete on property relations | Landlord delete removes properties; property delete removes images |
| 2026-01-29 | 03-01 | Separate PropertyImage model | Flexible image ordering with unique constraint on [propertyId, order] |
| 2026-01-29 | 03-01 | Six indexes on Property model | Optimized for common queries: landlordId, city, status, monthlyRent, bedrooms, type |
| 2026-01-29 | 03-02 | Definite assignment for DTO properties | TypeScript strict mode requires `!:` for class properties without initializers |
| 2026-01-29 | 03-02 | Roles decorator with LANDLORD and BOTH | Both role types can manage properties |
| 2026-01-29 | 03-02 | Amenity validation with Set | 15 valid amenities: pool, gym, security, parking, elevator, terrace, bbq, playground, laundry, pets, furnished, balcony, storage, ac, heating |
| 2026-01-29 | 03-02 | Include images in property queries | Consistent response shape with images array sorted by order |
| 2026-01-29 | 03-03 | @Public decorator for public endpoints | Bypasses global JWT auth guard for listing and detail |
| 2026-01-29 | 03-03 | Draft visibility rules | Drafts excluded from public list; draft detail only visible to owner |
| 2026-01-29 | 03-03 | hasEvery for amenities filter | Property must have ALL specified amenities, not just any |
| 2026-01-29 | 03-03 | Route ordering pattern | GET /mine before GET /:id to prevent 'mine' being parsed as UUID |
| 2026-01-29 | 03-04 | Service key for Storage operations | Anon key has limited Storage permissions; service key enables server-side operations |
| 2026-01-29 | 03-04 | Auto-reorder after delete | Prevents gaps in order sequence, maintains clean 0-N ordering |
| 2026-01-29 | 03-04 | Transaction for reorder | Ensures all order updates succeed or none do (atomicity) |
| 2026-01-29 | 04-01 | JSON fields for wizard steps | Validated in application layer, not DB - flexibility for schema evolution |
| 2026-01-29 | 04-01 | Cascade delete on ApplicationDocument/Event | Maintains referential integrity when Application deleted |
| 2026-01-29 | 04-01 | Event sourcing for audit trail | actorId + type + metadata JSON enables full audit history |
| 2026-01-29 | 04-02 | Prisma JSON cast for metadata | Prisma 7.x strict JSON typing requires explicit cast to InputJsonValue |
| 2026-01-29 | 04-02 | Terminal states with empty arrays | Clear pattern for identifying terminal states via isTerminal() |
| 2026-01-29 | 04-02 | Event methods return ApplicationEvent | Enables chaining and immediate access to created event |
| 2026-01-29 | 04-03 | Separate DTO per wizard step | Strong typing and validation per step, clear API contracts |
| 2026-01-29 | 04-03 | JSON field persistence | Each step persists to its own JSON field for schema flexibility |
| 2026-01-29 | 04-03 | Auto-advance currentStep | Track wizard progress via max(current, step+1) |
| 2026-01-29 | 04-03 | Colombian cedula regex | /^\d{6,10}$/ for Colombian ID validation |
| 2026-01-29 | 04-04 | Magic number validation via file-type | Validates actual file content, not extension - security |
| 2026-01-29 | 04-04 | Private bucket for documents | Sensitive documents (cedula, payslips) require signed URL access |
| 2026-01-29 | 04-04 | 1-hour signed URL expiry | Balance between security and usability |
| 2026-01-29 | 04-04 | 10MB file size limit | Sufficient for scans/photos while preventing abuse |
| 2026-01-29 | 04-05 | Submit requires all steps + 1 doc | Validates wizard completion and document upload before submission |
| 2026-01-29 | 04-05 | Dual event logging on withdraw | Logs both WITHDRAWN and STATUS_CHANGED events for completeness |
| 2026-01-29 | 04-05 | GET /mine before GET /:id | Static routes before parameterized to prevent 'mine' being parsed as UUID |
| 2026-01-29 | 04-05 | respondToInfoRequest defaults UNDER_REVIEW | Transitions to UNDER_REVIEW by default when tenant responds |
| 2026-01-30 | 05-01 | BullMQ for async scoring | Industry standard, retries, Redis-backed persistence |
| 2026-01-30 | 05-01 | Upstash Redis | Serverless, free tier sufficient for MVP |
| 2026-01-30 | 05-01 | RiskLevel A/B/C/D classification | A (80-100), B (65-79), C (50-64), D (0-49) |
| 2026-01-30 | 05-01 | JSON columns for explainability | signals, drivers, flags, conditions - flexible schema |
| 2026-01-30 | Roadmap | Tier system (FREE/PRO+) | AI features only for paying customers |
| 2026-01-30 | 05-02 | Division-by-zero protection | Ratios default to 1.0 when income is 0 |
| 2026-01-30 | 05-02 | Spanish signal messages | Colombian market - all explainability in Spanish |
| 2026-01-30 | 05-02 | Deduction-based integrity scoring | IntegrityEngine starts at max, deducts for issues |
| 2026-01-30 | 05-02 | Score allocation (35+25+15+25=100) | Financial(35), Stability(25), History(15), Integrity(25) |
| 2026-01-30 | 05-03 | IntegrityEngine.analyze() method | Requires full Application object for context checks |
| 2026-01-30 | 05-03 | Prisma InputJsonValue cast | Prisma 7.x strict typing requires cast for Driver/Flag/Condition arrays |
| 2026-01-30 | 05-03 | Job ID = score-{applicationId} | Prevents duplicate scoring jobs for same application |
| 2026-01-30 | 05-03 | Condition generation by level | C=deposit (recommended), D=cosigner (required), HIGH_RTI=income verification |
| 2026-02-01 | 06-01 | LandlordNote unique constraint | One note per landlord per application via [applicationId, landlordId] |
| 2026-02-01 | 06-01 | Cascade delete on notes | LandlordNote deleted when Application is deleted |
| 2026-02-01 | 06-01 | Text field for note content | No length limit for flexible note-taking |
| 2026-02-01 | 06-02 | Reviewable statuses filter | SUBMITTED, UNDER_REVIEW, NEEDS_INFO, PREAPPROVED |
| 2026-02-01 | 06-02 | Candidate sort order | Score desc, then submission date asc |
| 2026-02-01 | 06-02 | Document URL delegation | Reuse DocumentsService.getSignedUrl() for landlord access |
| 2026-02-01 | 06-03 | Reject requires reason | For transparency and legal compliance |
| 2026-02-01 | 06-03 | requestInfo logs two events | INFO_REQUESTED and STATUS_CHANGED for complete audit trail |
| 2026-02-01 | 06-03 | Notes upsert pattern | Single POST endpoint creates or updates using compound unique key |
| 2026-02-01 | 07-01 | ContractStatus with 7 states | Full lifecycle: DRAFT -> PENDING_LANDLORD_SIGNATURE -> PENDING_TENANT_SIGNATURE -> SIGNED -> ACTIVE -> CANCELLED/EXPIRED |
| 2026-02-01 | 07-01 | JSON for signature audit trails | Ley 527/1999 requires full audit data (IP, timestamp, user agent) - JSON provides flexibility |
| 2026-02-01 | 07-01 | documentHash field | SHA-256 hash of contractHtml for integrity verification |
| 2026-02-01 | 07-01 | paymentDay 1-28 | Avoids month-end edge cases (Feb 29, 30, 31) |
| 2026-02-01 | 07-01 | customClauses as JSON array | Flexible additional terms without schema changes |
| 2026-02-01 | 07-01 | Unique applicationId constraint | One contract per approved application (1:1 relation) |
| 2026-02-01 | 07-02 | State machine mirrors ApplicationStateMachine | Consistency across codebase, proven pattern |
| 2026-02-01 | 07-02 | Server-side UTC timestamps for signatures | Legal validity - client time can be manipulated |
| 2026-02-01 | 07-02 | SHA-256 for document hashing | Standard, auditable, built-in Node crypto |
| 2026-02-01 | 07-02 | Browser instance reuse in PdfGeneratorService | Puppeteer startup is slow (~2-5s), reuse improves performance |
| 2026-02-01 | 07-02 | Colombian locale (es-CO) formatting | Target market - currency and date formatting in Spanish |
| 2026-02-01 | 07-02 | nest-cli.json assets config for .hbs | Required to copy template files to dist during build |
| 2026-02-01 | 07-03 | JSON.parse(JSON.stringify()) for Prisma JSON | Converts class instances to plain objects for InputJsonValue |
| 2026-02-01 | 07-03 | nest-cli.json outDir fix | Changed to "dist/src" for correct .hbs file placement |
| 2026-02-01 | 07-04 | import type for Express Request | Required for isolatedModules + emitDecoratorMetadata compatibility |
| 2026-02-01 | 07-04 | 1-hour signed URL expiry for PDF | Balance between security and usability for contract downloads |
| 2026-02-01 | 07-04 | Reuse PdfGeneratorService | Extended with Supabase Storage methods rather than new service |
| 2026-02-02 | 08-01 | Denormalized lease fields | Snapshot property/tenant/landlord data at lease creation for stable audit |
| 2026-02-02 | 08-01 | Colombian payment methods | PSE, NEQUI, DAVIPLATA, BANK_TRANSFER, CASH, CHECK |
| 2026-02-02 | 08-01 | Unique payment constraint | [leaseId, periodMonth, periodYear] prevents duplicate period payments |
| 2026-02-02 | 08-01 | paymentDay 1-28 | Avoids month-end edge cases (Feb 29, 30, 31) |
| 2026-02-02 | 08-02 | EventEmitterModule with ignoreErrors: false | Fail fast during development |
| 2026-02-02 | 08-02 | Lease creation in transaction | Atomic creation of lease + property status update |
| 2026-02-02 | 08-02 | Only landlord can activate | Explicit control over when lease begins |
| 2026-02-02 | 08-02 | Denormalized data in event | Lease stores snapshot for stable reporting |
| 2026-02-02 | 08-03 | Lazy status updates for leases | Evaluate ENDING_SOON/ENDED on read, no cron needed for MVP |
| 2026-02-02 | 08-03 | Pre-check for duplicate payments | Friendlier error message than Prisma unique constraint violation |
| 2026-02-02 | 08-03 | Either party views payments | Transparency - both landlord and tenant see payment history |
| 2026-02-02 | 08-03 | Only landlord records payments | Explicit control over payment recording |
| 2026-02-02 | 09-01 | 5-day grace period for on-time | Colombian standard for rent payment grace |
| 2026-02-02 | 09-01 | Bonus model (0-15 pts) not penalty | New tenants get 0 bonus, not penalized |
| 2026-02-02 | 09-01 | isReturningTenant = 2+ leases | Conservative threshold for returning tenant bonus |
| 2026-02-02 | 09-01 | Optional paymentHistory in interface | Backward compatibility with existing scores |
| 2026-02-02 | 09-02 | Score capped at 100 with bonus | Payment bonus adds to base but total capped at 100 |
| 2026-02-02 | 09-02 | Algorithm version 1.1 | Version bump indicates new scoring model with payment history |
| 2026-02-02 | 09-02 | Tier thresholds GOLD/SILVER/BRONZE/NEW | GOLD>=12, SILVER>=8, BRONZE>=4, NEW<4 or <3 months |
| 2026-02-02 | 10-01 | Prisma enums mirror TypeScript enums | Type safety across database and application layers |
| 2026-02-02 | 10-01 | TenantPaymentRequest 1:1 optional with Payment | Approved requests link to created Payment record |
| 2026-02-02 | 10-01 | PaymentDispute unique on paymentRequestId | Only one dispute per rejected payment request |
| 2026-02-02 | 10-01 | 15 Colombian banks in ColombianBank enum | Covers major banks plus Nequi/Daviplata digital wallets |
| 2026-02-02 | 10-01 | AccountType AHORROS/CORRIENTE | Standard Colombian bank account types |
| 2026-02-02 | 10-02 | Route /landlords/me/payment-methods | Landlord-scoped endpoints for payment method management |
| 2026-02-02 | 10-02 | Ownership verification in service | Defense in depth - findById throws ForbiddenException if not owner |
| 2026-02-02 | 10-02 | Soft delete via isActive field | Preserve data for audit, PATCH endpoint for deactivation |
| 2026-02-02 | 10-02 | Colombian mobile regex for Nequi/Daviplata | /^3[0-9]{9}$/ for phone validation |
| 2026-02-02 | 10-03 | Reuse application-documents bucket | Existing private bucket with receipts/ subfolder avoids new bucket setup |
| 2026-02-02 | 10-03 | 5MB receipt file size limit | Receipts are typically smaller than full application documents |
| 2026-02-02 | 10-03 | Current period from today | Auto-fills form with correct month/year for tenant convenience |
| 2026-02-02 | 10-03 | Amount defaults to lease rent | Most payments are full rent amount, reduces input errors |
| 2026-02-02 | 10-03 | Duplicate prevention before upload | Friendlier error message than Prisma constraint violation |
| 2026-02-02 | 10-04 | Deterministic PSE results by document digit | Enables consistent frontend testing (0=failure, 1=rejection, 9=pending) |
| 2026-02-02 | 10-04 | Public bank list endpoint | No auth needed to display bank options for PSE form |
| 2026-02-02 | 10-04 | Spanish PSE error messages | Colombian market - all messages in Spanish |
| 2026-02-02 | 10-04 | PSE transaction ID as reference | Unique identifier for payment request tracking |
| 2026-02-02 | 10-05 | Export PaymentsService from LeasesModule | Required for validation service to create Payment records |
| 2026-02-02 | 10-05 | Cast Prisma enum to app enum | Same string values, TypeScript requires explicit cast |
| 2026-02-02 | 10-05 | Required rejection reason (10+ chars) | Transparency - tenant deserves explanation |
| 2026-02-02 | 10-06 | Dispute reason 20-2000 chars | Minimum ensures meaningful explanation, max prevents abuse |
| 2026-02-02 | 10-06 | Reuse ReceiptStorageService for evidence | Consistent file handling with dispute- prefix |
| 2026-02-02 | 10-06 | Dispute updates status to DISPUTED | Clear status tracking for rejection disputes |
| 2026-02-02 | 10-06 | One dispute per payment request | Unique constraint prevents spam, enables clean resolution |
| 2026-02-03 | 03.1-01 | VisitStatus with 6 values | Covers full visit lifecycle: request, response, completion, cancellation, rescheduling |
| 2026-02-03 | 03.1-01 | Weekly recurring availability | More flexible than pre-generated slots; landlord sets pattern, slots generated on-demand |
| 2026-02-03 | 03.1-01 | Self-referential rescheduling | Tracks chain of rescheduled visits without separate table |
| 2026-02-03 | 03.1-01 | Unique constraint on availability | Prevents overlapping time windows for same property/day/start time |
| 2026-02-03 | 03.1-02 | Role-based state machine | VisitStateMachine validates transitions with TENANT/LANDLORD permissions |
| 2026-02-03 | 03.1-02 | 2-hour minimum booking buffer | Prevents booking too close to now, gives landlord time to prepare |
| 2026-02-03 | 03.1-02 | 30-day maximum advance booking | Limits query scope, prevents abuse |
| 2026-02-03 | 03.1-02 | On-demand slot generation | Slots generated from availability rules, not pre-stored |
| 2026-02-03 | 03.1-02 | Slot duration options (15/30/45/60) | Flexibility for different property types |
| 2026-02-03 | 03.1-03 | Transaction for double-booking prevention | Ensures slot is still available at creation time |
| 2026-02-03 | 03.1-03 | One active visit per property per tenant | Prevents spam requests |
| 2026-02-03 | 03.1-03 | Event emission for notifications | visit.requested event for Phase 13 integration |
| 2026-02-03 | 03.1-04 | Required reason for reject/cancel | Transparency - 10-500 chars required |
| 2026-02-03 | 03.1-04 | Reschedule creates new visit | Original marked RESCHEDULED, new visit PENDING with rescheduledFromId |
| 2026-02-03 | 03.1-04 | Either party can reschedule accepted | State machine allows TENANT/LANDLORD to reschedule ACCEPTED visits |
| 2026-02-03 | 03.1-04 | Status change events | visit.statusChanged emitted for Phase 13 notification integration |
| 2026-02-03 | 11-01 | ADMIN role added to Role enum | System administrators for template management |
| 2026-02-03 | 11-01 | NotificationChannel EMAIL/PUSH | Dual channel for all notifications |
| 2026-02-03 | 11-01 | NotificationStatus PENDING/SENT/FAILED | Delivery tracking state machine |
| 2026-02-03 | 11-01 | User notification preferences | Global toggles for email/push, FCM token storage |
| 2026-02-03 | 11-01 | NotificationTemplate model | Admin-managed templates with Markdown email body |
| 2026-02-03 | 11-01 | NotificationLog model | Audit trail for sent notifications |
| 2026-02-03 | 11-02 | Resend for email delivery | Simple API, reliable delivery |
| 2026-02-03 | 11-02 | Firebase FCM for push | Industry standard, Android + iOS |
| 2026-02-03 | 11-02 | Graceful Firebase init failure | App starts even without credentials |
| 2026-02-03 | 11-04 | Admin-only template endpoints | @Roles(Role.ADMIN) at class level |
| 2026-02-03 | 11-04 | Template code regex validation | /^[A-Z][A-Z0-9_]*$/ for uppercase codes |
| 2026-02-03 | 11-04 | Upsert pattern for seeding | Allows safe re-running without duplicates |
| 2026-02-03 | 11-04 | 22 default templates | 4 apps + 6 payments + 6 visits + 4 contracts + 2 leases |
| 2026-02-04 | 12-01 | Database-driven plan limits | Admin can modify prices without code deployment, replaces hardcoded PLAN_LIMITS |
| 2026-02-04 | 12-01 | PlanType enum (TENANT/LANDLORD) | Different plans for different roles with unique compound key |
| 2026-02-04 | 12-01 | ScoringUsage with micropayment tracking | Monthly limits for free tier tenants, extra views via micropayment |
| 2026-02-04 | 12-01 | Annual pricing ~80% of monthly*12 | Standard SaaS incentive - approximately 2 months free |
| 2026-02-04 | 12-01 | Keep SubscriptionPlan enum on User | Backward compatibility, new models hold detailed config |
| 2026-02-04 | 12-02 | Cast Prisma enum to app enum for subscriptions | Same string values, TypeScript requires explicit cast |
| 2026-02-04 | 12-02 | PseMockService reuse via module export | Avoid code duplication for subscription and tenant payments |
| 2026-02-04 | 12-02 | Optimistic ACTIVE status for PENDING PSE | Better UX - subscription starts immediately |
| 2026-02-04 | 12-02 | Keep oldest property on downgrade | Deterministic - first by createdAt stays published |
| 2026-02-04 | 12-02 | PseSubscriptionPaymentDto as reusable nested DTO | Used in both CreateSubscriptionDto and ChangePlanDto |
| 2026-02-04 | 12-03 | Two separate controllers for plans and subscriptions | Clear separation: public/admin vs authenticated user endpoints |
| 2026-02-04 | 12-04 | SubscriptionScheduler in subscriptions module | Avoids circular dependency with NotificationsModule |
| 2026-02-04 | 12-04 | Premium scoring gate at ScoringController | Gate at VIEW point, not computation - engine always computes |
| 2026-02-04 | 12-04 | MicropaymentDto extends PseSubscriptionPaymentDto | Same PSE fields, different usage context |
| 2026-02-04 | 13-01 | Constants-based tier definitions | Fixed business rules, no database config needed |
| 2026-02-04 | 13-01 | InsuranceTier with NONE/BASIC/PREMIUM | Three tiers cover business need: none, accidental, comprehensive |
| 2026-02-04 | 13-01 | Replace includesInsurance boolean with enum | Structured tier replaces simple boolean+text |
| 2026-02-04 | 13-01 | insurancePremium as Int COP on Contract | Stores calculated premium for audit and display |
| 2026-02-04 | 13-02 | InsuranceService injected into ContractsService | Private buildTemplateData() needs this.insuranceService for premium calculation |
| 2026-02-04 | 13-02 | includesInsurance kept as computed boolean in template data | Backward compat with Handlebars {{#if}} conditional |
| 2026-02-04 | 13-02 | Case-insensitive tier parameter in controller | Better DX - accepts both 'basic' and 'BASIC' |
| 2026-02-04 | 13-02 | InsuranceModule after ContractsModule in AppModule | Logical grouping: contracts first, then insurance extension |
| 2026-02-05 | 2.1-01 | AGENT role replaces BOTH | Clearer semantics - agents manage assigned properties, not "do both roles" |
| 2026-02-05 | 2.1-01 | RolesGuard grants AGENT access to LANDLORD routes | Simplifies decorator usage - no need to add AGENT everywhere |
| 2026-02-05 | 2.1-01 | Deprecated role switch endpoint | Backward compatibility for existing clients |
| 2026-02-05 | 2.1-01 | Manual SQL migration for enum changes | PostgreSQL enum values cannot be easily removed with dependent columns |
| 2026-02-05 | 2.1-01 | PropertyAccess model with unique [propertyId, agentId] | One agent assignment per property |
| 2026-02-05 | 2.1-01 | ApplicationConversation 1:1 with Application | Auto-created on submit, cascade delete on reject/withdraw |
| 2026-02-05 | 2.1-02 | Remove switch-role endpoint entirely | 2.1-01 deprecated it, clean removal for cleaner codebase |
| 2026-02-05 | 2.1-02 | AGENT access via RolesGuard | Simpler than adding Role.AGENT to every @Roles decorator |
| 2026-02-05 | 2.1-03 | PropertyAccessService.ensurePropertyAccess replaces direct landlordId checks | Single point of authorization check for landlord/agent access |
| 2026-02-05 | 2.1-03 | Agents act with LANDLORD role for state machines | State machines expect TENANT or LANDLORD, agent acts on behalf |
| 2026-02-05 | 2.1-03 | Contracts store actual property landlordId | Legal records must reflect actual owner, not the agent |
| 2026-02-05 | 2.1-04 | Chat lifecycle hooks | Create conversation on submit, delete on withdraw/reject |
| 2026-02-05 | 2.1-04 | Supabase Realtime for chat | Backend writes to DB, Supabase broadcasts via WebSocket |
| 2026-02-05 | 2.1-04 | Mark messages from OTHER users as read | User shouldn't mark their own messages as read |
| 2026-02-07 | 14-01 | Upsert for idempotent add | No error on duplicate - frontend can call add without checking first |
| 2026-02-07 | 14-01 | deleteMany for idempotent remove | No error if item doesn't exist - simplifies frontend logic |
| 2026-02-07 | 14-01 | DRAFT property exclusion from wishlist | DRAFT properties are private to landlord, not visible publicly |
| 2026-02-07 | 14-01 | TENANT-only role restriction | Wishlist is a tenant feature - landlords list properties, tenants favorite them |
| 2026-02-08 | 15-01 | Reuse application-documents bucket for lease docs | Avoid bucket proliferation, use lease-documents/ subfolder |
| 2026-02-08 | 15-01 | 24-hour deletion window for lease documents | Prevent accidental/malicious removal after handoff, allow quick correction |
| 2026-02-08 | 15-01 | Uploader-only deletion | Prevents either party from deleting the other's evidence |
| 2026-02-08 | 15-01 | Both tenant and landlord can upload | Shared responsibility model, collaborative document vault |
| 2026-02-07 | 16-01 | Upsert for idempotent preferences | First PATCH creates, subsequent calls update - no separate create endpoint needed |
| 2026-02-07 | 16-01 | Full replacement semantics | All fields overwritten on each PATCH - simpler than partial updates |
| 2026-02-07 | 16-01 | getPreferences returns null not 404 | New tenants haven't set preferences yet - null is expected, not error |
| 2026-02-07 | 16-02 | Two queries for profile aggregation | User+Preference (1 query with include), Application+RiskScore (1 query) |
| 2026-02-07 | 16-02 | Non-DRAFT/WITHDRAWN/REJECTED filter | Only active applications contribute to profile data |
| 2026-02-08 | 17-01 | Compound unique [couponId, userId] | Prevents user from using same coupon twice (per-user one-time use) |
| 2026-02-08 | 17-01 | Uppercase code normalization | code.toUpperCase().trim() for case-insensitive coupon matching |
| 2026-02-08 | 17-01 | Plan applicability key format | Uses ${planType}_${tier} format (e.g. TENANT_PRO) for applicablePlans array |
| 2026-02-08 | 17-01 | Atomic coupon usage tracking | recordUsage() uses transaction to increment currentUses and create CouponUsage atomically |
| 2026-02-08 | 17-01 | Two-controller pattern for admin+public | CouponsAdminController and CouponsPublicController in same file |
| 2026-02-08 | 17-02 | Coupon validation before payment | Validate coupon, apply discount, then process payment - finalPrice used for PSE requirement |
| 2026-02-08 | 17-02 | Atomic usage after subscription | recordUsage() called after subscription.create() to capture subscription.id |
| 2026-02-08 | 17-02 | Type casting for Prisma enums | Cast Prisma CouponType to app CouponType at module boundaries for TypeScript compatibility |
| 2026-02-08 | 18-01 | Cursor-based pagination using createdAt timestamps | Efficient infinite scroll for activity feeds |
| 2026-02-08 | 18-01 | Polymorphic references (resourceType + resourceId) | Avoids separate FK columns per entity type in ActivityLog |
| 2026-02-08 | 18-01 | JSON path query for propertyId filtering | Prisma metadata JSON path for filtering activities by property |
| 2026-02-08 | 18-01 | No role restriction on activity feed | All authenticated users see their own activities regardless of role |
| 2026-02-08 | 18-02 | Direct Prisma queries for property access in dashboard | Avoids PropertyAccessService dependency, keeps dashboard module lightweight |
| 2026-02-08 | 18-02 | Lowercase risk level keys in candidate distribution | Frontend compatibility - a/b/c/d instead of A/B/C/D |
| 2026-02-08 | 18-02 | calculateNextPaymentDate advances to next month | If current month due date has passed, return next month's date |
| 2026-02-08 | 18-03 | Dual-entry activity logging for both parties | Each domain event creates entries for both tenant and landlord feeds |
| 2026-02-08 | 18-03 | propertyTitle from address+city for ContractActivatedEvent | Event lacks propertyTitle, constructed from available fields |
| 2026-02-08 | 18-03 | contract.activated creates CONTRACT_ACTIVATED + LEASE_CREATED | Both events logically occur simultaneously on contract activation |
| 2026-02-08 | 18-03 | try/catch isolation for all activity handlers | Prevents activity logging failures from breaking main event flow |
| 2026-02-08 | 19-02 | In-memory scoring vs database-side | Fetch all AVAILABLE properties (limit 1000), score in-memory, then filter/sort/paginate - simpler, acceptable for initial scale |
| 2026-02-08 | 19-02 | Filter to AVAILABLE properties only | Recommendations exclude PENDING/RENTED - only show rentable properties |
| 2026-02-08 | 19-02 | Minimum match score threshold of 40 | Hard-coded MIN_MATCH_SCORE = 40 prevents showing poor matches |
| 2026-02-08 | 19-02 | Export interfaces from service | PropertyWithMatch and PaginatedResponse exported for type-safe controller responses |
| 2026-03-10 | 23-02 | userId remains required (not nullable) | Making userId nullable requires architectural schema migration — deferred, existing NotFoundException preserved |
| 2026-03-10 | 23-02 | Email sending fire-and-forget in AgencyService | Email failure must not break invitation creation — wrapped in try/catch |
| 2026-03-10 | 23-02 | NotificationsModule imported into AgencyModule | EmailService injection via module import, no circular dependency |
| 2026-03-10 | 23-02 | crypto.randomUUID() for token generation | Native Node.js, no extra dependency needed |

## Session Continuity

**Last session:** 2026-03-10
**Stopped at:** Phase 23 Plan 02 complete (Token-Based Invitation System)
**Resume file:** .planning/phases/23-inmobiliaria-registration/23-02-SUMMARY.md

## Pending User Actions

**Database trigger must be executed manually in Supabase:**
1. Go to Supabase Dashboard > SQL Editor
2. Paste contents of `supabase/migrations/00001_user_sync_trigger.sql`
3. Click Run

**Supabase Storage bucket for property images:**
1. Go to Supabase Dashboard > Storage > New bucket
2. Create bucket named `property-images`
3. Set Public = true

**Supabase Storage bucket for application documents:**
1. Go to Supabase Dashboard > Storage > New bucket
2. Create bucket named `application-documents`
3. Set Public = false (private bucket for sensitive documents)

**Supabase Storage bucket for contracts:**
1. Go to Supabase Dashboard > Storage > New bucket
2. Create bucket named `contracts`
3. Set Public = false (private bucket for signed contract PDFs)

**Environment variables:**
1. Add `SUPABASE_SERVICE_KEY` to `.env` (from: Supabase Dashboard > Settings > API > service_role key)
2. Add `REDIS_URL` to `.env` (Upstash: rediss://...)
3. Add `RESEND_API_KEY` to `.env` (from: Resend Dashboard > API Keys)
4. Add `FIREBASE_PROJECT_ID` to `.env` (from: Firebase Console > Project Settings)
5. Add `FIREBASE_PRIVATE_KEY` to `.env` (from: Firebase Console > Service Accounts > Generate private key)
6. Add `FIREBASE_CLIENT_EMAIL` to `.env` (from: Firebase service account JSON)

**Database sync for Application tables:**
1. Run: `npx prisma db push`
2. If "spawn UNKNOWN" error on Windows/OneDrive, try WSL or shorter path
3. Verify tables: `npx prisma studio`

**Seed notification templates:**
1. Run: `npm run seed:templates`
2. Verify 22 templates seeded in database

**Sync subscription models to database:**
1. Run: `npx prisma db push`
2. Verify new tables created: subscription_plan_configs, subscriptions, subscription_payments, scoring_usage

**Seed subscription plans:**
1. Run: `npm run seed:plans`
2. Verify 5 plan configs seeded in database

**Sync insurance schema changes to database:**
1. Run: `npx prisma db push`
2. Verify InsuranceTier enum and updated Contract fields in database

**Sync WishlistItem model to database:**
1. Run: `npx prisma db push`
2. Verify wishlist_items table created in database

**Sync LeaseDocument model to database:**
1. Run: `npx prisma db push`
2. Verify lease_documents table and LeaseDocumentType enum created in database

**Sync TenantPreference model to database:**
1. Run: `npx prisma db push`
2. Verify tenant_preferences table created in database

**Sync Coupon models to database:**
1. Run: `npx prisma db push`
2. Verify CouponType enum and coupons, coupon_usages tables created in database

**Sync ActivityLog model to database:**
1. Run: `npx prisma db push`
2. Verify ActivityType enum and activity_logs table created in database

**AI Document Analysis (Phase 20) setup:**
1. Add `COHERE_API_KEY` to `.env` (from: Cohere Dashboard > API Keys)
2. Run: `node scripts/run-migration-ai.mjs` (creates document_analysis_results table)
3. Run: `npx prisma db push` (sync Prisma schema)

**Phase 2.1 Role/Agent schema migration:** ✓ COMPLETED
- Executed via `node scripts/run-migration-2.1.mjs` on 2026-02-05
- Dropped active_role column, added AGENT to Role enum
- Created property_access, application_conversations, chat_messages tables

## Next Action

ALL 22 PHASES COMPLETE. The entire backend is implemented.

**ML Persistence (Phase 22): COMPLETE**
- Plan 01: ApplicationFeatureSnapshot + PredictionLog models, MlPersistenceService, wired into ScoringProcessor
- Plan 02: Outcome tracking via dedicated event listeners (application.statusChanged, contract.activated), daily cron scheduler for lease payment evaluation, ADMIN-only training data export (CSV/JSON)
- Full prediction-vs-actual feedback loop closed
- Training data exportable for external ML model retraining

## Session History

| Date | Action | Outcome |
|------|--------|---------|
| 2026-01-24 | Project initialized | PROJECT.md created |
| 2026-01-24 | Research completed | Stack, AI docs, architecture |
| 2026-01-24 | Requirements defined | 78 requirements |
| 2026-01-24 | Roadmap created | 10 phases |
| 2026-01-25 | Executed 01-01-PLAN.md | NestJS scaffolded with ConfigModule |
| 2026-01-25 | Executed 01-02-PLAN.md | Prisma 7.x with PostgreSQL adapter configured |
| 2026-01-25 | Executed 01-03-PLAN.md | Swagger, health check, exception filter |
| 2026-01-25 | Phase 1 verified | 6/6 must-haves passed |
| 2026-01-25 | Executed 02-01-PLAN.md | User model, Role enum, env validation, sync trigger |
| 2026-01-26 | Executed 02-02-PLAN.md | JWT auth, guards, decorators, routes protected |
| 2026-01-26 | Executed 02-03-PLAN.md | User profile CRUD endpoints, Phase 2 complete |
| 2026-01-26 | Phase 2 verified | 5/5 must-haves passed |
| 2026-01-29 | Executed 03-01-PLAN.md | Property/PropertyImage models, enums, database tables |
| 2026-01-29 | Executed 03-02-PLAN.md | PropertiesModule, landlord CRUD, ownership validation |
| 2026-01-29 | Executed 03-03-PLAN.md | Public listing with filters, search, pagination |
| 2026-01-29 | Executed 03-04-PLAN.md | Property images with Supabase Storage, Phase 3 complete |
| 2026-01-29 | Executed 04-01-PLAN.md | Application/ApplicationDocument/ApplicationEvent models, enums |
| 2026-01-29 | Executed 04-02-PLAN.md | ApplicationStateMachine, ApplicationEventService, ApplicationsModule |
| 2026-01-29 | Executed 04-03-PLAN.md | ApplicationsService, ApplicationsController, wizard step DTOs |
| 2026-01-29 | Executed 04-04-PLAN.md | DocumentsService, DocumentsController, magic number validation |
| 2026-01-29 | Executed 04-05-PLAN.md | Submit, withdraw, timeline, respond-info endpoints, Phase 4 complete |
| 2026-01-30 | Phase 5 planned | 3 plans: BullMQ setup, scoring models, aggregator |
| 2026-01-30 | Roadmap reordered | Phases 6-15 reorganized for logical flow |
| 2026-01-30 | Phase 9 added | Payment History Scoring - score from real payment data |
| 2026-01-30 | Executed 05-01-PLAN.md | RiskScoreResult model, RiskLevel enum, BullMQ queue |
| 2026-01-30 | Executed 05-02-PLAN.md | FeatureBuilder, FinancialModel, StabilityModel, HistoryModel, IntegrityEngine |
| 2026-01-30 | Executed 05-03-PLAN.md | ScoreAggregator, ScoringProcessor, ScoringService, submit integration |
| 2026-02-01 | Executed 06-01-PLAN.md | LandlordNote model, database table, relations |
| 2026-02-01 | Executed 06-02-PLAN.md | LandlordModule, review endpoints, candidate sorting |
| 2026-02-01 | Executed 06-03-PLAN.md | Decision endpoints, notes CRUD, Phase 6 complete |
| 2026-02-01 | Executed 07-01-PLAN.md | Contract model, ContractStatus enum, Ley 527 compliance fields |
| 2026-02-01 | Executed 07-02-PLAN.md | ContractStateMachine, SignatureService, ContractTemplateService, PdfGeneratorService |
| 2026-02-01 | Executed 07-03-PLAN.md | ContractsModule, endpoints |
| 2026-02-01 | Executed 07-04-PLAN.md | Digital signatures, PDF generation to Supabase Storage, Phase 7 complete |
| 2026-02-02 | Executed 08-01-PLAN.md | Lease/Payment models, LeaseStatus/PaymentMethod enums |
| 2026-02-02 | Executed 08-02-PLAN.md | @nestjs/event-emitter, ContractActivatedEvent, lease creation on activation |
| 2026-02-02 | Executed 08-03-PLAN.md | LeasesService, PaymentsService, REST endpoints, Phase 8 complete |
| 2026-02-02 | Executed 09-01-PLAN.md | PaymentHistoryMetrics, PaymentHistoryService, PaymentHistoryModel |
| 2026-02-02 | Executed 09-02-PLAN.md | ScoreAggregator integration, tenant reputation endpoint, Phase 9 complete |
| 2026-02-02 | Executed 10-01-PLAN.md | LandlordPaymentMethod, TenantPaymentRequest, PaymentDispute models |
| 2026-02-02 | Executed 10-02-PLAN.md | LandlordPaymentMethodsService, Controller, TenantPaymentsModule |
| 2026-02-02 | Executed 10-03-PLAN.md | ReceiptStorageService, TenantPaymentsService, TenantPaymentsController |
| 2026-02-02 | Executed 10-04-PLAN.md | PseMockService, PseMockController, PSE mock flow |
| 2026-02-02 | Executed 10-05-PLAN.md | PaymentValidationService, PaymentValidationController |
| 2026-02-02 | Executed 10-06-PLAN.md | DisputesService, DisputesController, Phase 10 complete |
| 2026-02-03 | Executed 03.1-01-PLAN.md | VisitStatus enum, PropertyAvailability, PropertyVisit models |
| 2026-02-03 | Executed 03.1-02-PLAN.md | VisitStateMachine, AvailabilityService, SlotsService, VisitsModule |
| 2026-02-03 | Executed 03.1-03-PLAN.md | VisitsService, events |
| 2026-02-03 | Executed 03.1-04-PLAN.md | VisitsController, status methods, Phase 3.1 complete |
| 2026-02-03 | Executed 11-01-PLAN.md | Notification enums, ADMIN role, NotificationTemplate/Log models |
| 2026-02-03 | Executed 11-02-PLAN.md | Resend EmailService, Firebase PushService, NotificationsModule |
| 2026-02-03 | Executed 11-04-PLAN.md | NotificationTemplatesModule, CRUD endpoints, 22 default templates |
| 2026-02-04 | Executed 12-01-PLAN.md | Subscription models, enums, seed script for 5 default plans |
| 2026-02-04 | Executed 12-02-PLAN.md | 3 subscription services, DTOs, module, plan enforcement |
| 2026-02-04 | Executed 12-03-PLAN.md | 2 controllers (plans + subscriptions), 9 endpoints total |
| 2026-02-04 | Executed 12-04-PLAN.md | Enforcement wired, micropayment, cron, notifications, Phase 12 complete |
| 2026-02-04 | Executed 13-01-PLAN.md | InsuranceTier enum, Contract model update, InsuranceService, InsuranceModule |
| 2026-02-04 | Executed 13-02-PLAN.md | InsuranceController, contract integration, template updates, Phase 13 complete |
| 2026-02-05 | Executed 2.1-01-PLAN.md | AGENT role, PropertyAccess/Chat models, Role.BOTH removed from codebase |
| 2026-02-05 | Executed 2.1-02-PLAN.md | Removed switch-role endpoint, added AGENT to onboarding DTO |
| 2026-02-05 | Executed 2.1-03-PLAN.md | PropertyAccessService, controllers, 6 services updated for agent authorization |
| 2026-02-05 | Executed 2.1-04-PLAN.md | ChatModule, lifecycle hooks, Phase 2.1 complete |
| 2026-02-07 | Executed 14-01-PLAN.md | WishlistItem model, WishlistsModule, 3 REST endpoints, Phase 14 complete |
| 2026-02-07 | Executed 15-01-PLAN.md | LeaseDocument model, LeaseDocumentType enum, LeaseDocumentsService |
| 2026-02-07 | Executed 15-02-PLAN.md | LeaseDocumentsController, tenant vault endpoint, Phase 15 complete |
| 2026-02-07 | Executed 16-01-PLAN.md | TenantPreference model, UpdatePreferencesDto, PATCH/GET preferences endpoints |
| 2026-02-07 | Executed 16-02-PLAN.md | TenantProfileDto, GET /users/me/profile aggregation endpoint, Phase 16 complete |
| 2026-02-08 | Executed 17-01-PLAN.md | CouponType enum, Coupon/CouponUsage models, CouponsModule with 3 services, admin+public controllers |
| 2026-02-08 | Executed 17-02-PLAN.md | Coupon integration into subscriptions, validation+discount+usage, Phase 17 complete |
| 2026-02-08 | Executed 18-01-PLAN.md | ActivityLog model, ActivityType enum (21 values), GET /activities with cursor pagination |
| 2026-02-08 | Executed 18-02-PLAN.md | Landlord + tenant dashboard endpoints with parallel aggregations |
| 2026-02-08 | Executed 18-03-PLAN.md | 4 activity event listeners (application, payment, visit, contract), Phase 18 complete |
| 2026-02-08 | Phase 18 verified | 27/27 must-haves passed |
| 2026-02-08 | Executed 19-01-PLAN.md | MatchResult interface, 4 scoring sub-models (Affordability/RiskFit/ProfileStrength/Preferences), RecommendationScorer aggregator |
| 2026-02-08 | Executed 19-02-PLAN.md | RecommendationsService (3 methods), RecommendationsController (3 TENANT endpoints), RecommendationsModule, AppModule integration |
| 2026-02-08 | Phase 19 verified | 11/11 must-haves passed. Frontend Parity phases (14-19) ALL COMPLETE |
| 2026-02-15 | Executed Phase 20 | AI Document Analysis: 14 files in src/ai/, scoring model, migration, Cohere+OCR pipeline |
| 2026-02-13 | 2.2-01 | Enum value prefixing for PostgreSQL | COBRO_PENDING, DISP_PENDING, MAINT_APPROVED avoid same-value-different-enum conflicts |
| 2026-02-13 | 2.2-01 | ActivityType enum added to migration | Required by ActivityLog model, missing from previous migrations |
| 2026-02-13 | 2.2-02 | AgencyMemberGuard exported from AgencyModule | Downstream modules need guard for agency-level authorization |
| 2026-02-13 | 2.2-02 | Controller uses inline auth pattern | getAgencyForUser() + ensureAdmin() instead of AgencyMemberGuard for full context |
| 2026-02-13 | 2.2-02 | @IsEmail on CreateAgencyDto email field | Input validation for email format correctness |
| 2026-02-13 | 2.2-01 | 17 inmobiliaria models total | Agency, AgencyMember, Propietario, Consignacion, PipelineItem, Cobro, Dispersion, DispersionItem, SolicitudMantenimiento, MantenimientoQuote, Renovacion, RenovacionHistory, ActaEntrega, AgencyDocumentTemplate, AgencyDocument, AgencyIntegration, ActivityLog |
| 2026-02-13 | Executed 2.2-01-PLAN.md | Database schema validation, migration generation, 17 tables created |
| 2026-02-13 | Executed 2.2-02-PLAN.md | AgencyModule registered in AppModule, DTOs with Swagger annotations |
| 2026-02-13 | 2.2-03 | Controllers use @UseGuards(AgencyMemberGuard) + @CurrentAgency('agencyId') | Cleaner than manual AgencyService.getAgencyForUser() resolution |
| 2026-02-13 | 2.2-03 | ConsignacionPropertyType app enum created | Needed for @IsEnum validation in DTO, mirrors Prisma enum |
| 2026-02-13 | 2.2-03 | AssignAgentDto for typed assign-agent body | Proper class-validator integration vs inline type |
| 2026-02-13 | 2.2-03 | Maintenance endpoint on ConsignacionesController | Queries SolicitudMantenimiento by consignacionId for completeness |
| 2026-02-13 | Executed 2.2-03-PLAN.md | PropietariosModule (6 endpoints) + ConsignacionesModule (8 endpoints) registered |
| 2026-02-13 | 2.2-04 | AgencyMemberGuard at class level replaces manual resolveAgencyId | Cleaner, consistent pattern for agency-scoped controllers |
| 2026-02-13 | 2.2-04 | @IsEmail on candidateEmail for proper validation | Rule 2 auto-fix: email fields need email validation |
| 2026-02-13 | 2.2-04 | Stats route before :id route in controller | Prevents "stats" being parsed as UUID parameter |
| 2026-02-13 | Executed 2.2-04-PLAN.md | PipelineModule with 8 endpoints, CONSIGNACION_INCLUDE bug fixed |
| 2026-02-13 | 2.2-05 | GenerateCobrosDto uses @Body instead of @Query | Better REST semantics for POST state-changing operations |
| 2026-02-13 | 2.2-05 | @IsInt for COP amounts in RegisterPaymentDto | Colombian pesos are integers, not floating point |
| 2026-02-13 | 2.2-05 | cartera-report calls updateLateFees then getSummary | Simple aging report without separate ReportsService |
| 2026-02-13 | 2.2-05 | Approve endpoint uses @CurrentUser('id') for approvedBy | Audit trail for dispersion approval workflow |
| 2026-02-13 | Executed 2.2-05-PLAN.md | CobrosModule (8 endpoints) + DispersionesModule (5 endpoints) registered |
| 2026-02-13 | 2.2-06 | Controllers use @UseGuards(AgencyMemberGuard) + @CurrentAgency pattern | Consistent with PipelineController, replaces manual resolveAgencyId |
| 2026-02-13 | 2.2-06 | ipcRate @IsNumber, proposedRent/negotiatedRent @IsInt | Decimal rate vs integer COP amounts |
| 2026-02-13 | 2.2-06 | /upcoming route before /:id in RenovacionesController | Prevents "upcoming" being parsed as UUID parameter |
| 2026-02-13 | Executed 2.2-06-PLAN.md | MantenimientoModule (9 endpoints) + RenovacionesModule (5 endpoints) registered |
| 2026-02-13 | Executed 2.2-07-PLAN.md | DocumentosModule + ActasModule registered |
| 2026-02-13 | 2.2-08 | InmobiliariaDashboardModule naming to avoid Phase 18 collision |
| 2026-02-13 | Executed 2.2-08-PLAN.md | ReportsModule (7 endpoints) + AnalyticsModule (4 endpoints) + InmobiliariaDashboardModule (3 endpoints), Phase 2.2 COMPLETE |
| 2026-02-15 | 21-01 | Category inference from signal codes | RTI/DTI/INCOME → financial, EMPLOYMENT/TENURE → stability, REFERENCE → history, PAYMENT_HISTORY → paymentHistory, DOC_VERIFICATION → documentVerification, default → integrity |
| 2026-02-15 | 21-01 | Icon logic for drivers | Positive → trending_up, negative+integrity → warning, other negatives → trending_down |
| 2026-02-15 | 21-01 | Spanish prompts with Colombian context | Financial explainability prompts for Cohere Command R+ |
| 2026-02-15 | 21-01 | AI-first with template fallback | Try Cohere narrative generation, catch errors, fallback to template |
| 2026-02-15 | 21-01 | Cache narratives in RiskScoreResult.explanation | Fire-and-forget caching for performance, check cache first on retrieval |
| 2026-02-15 | Executed 21-01-PLAN.md | ExplainabilityService, DriverFormatterService, NarrativeGeneratorService, TemplateGeneratorService created |
| 2026-02-15 | 21-02 | Non-blocking narrative in processor | try/catch wrapping - narrative failure cannot fail scoring job |
| 2026-02-15 | 21-02 | Route ordering for explanation endpoint | :applicationId/explanation before :applicationId to avoid route shadowing |
| 2026-02-15 | 21-02 | Pre-generate narrative only for premium users | Check both tenant and landlord plan configs via Promise.all |
| 2026-02-15 | Executed 21-02-PLAN.md | GET /scoring/:applicationId/explanation endpoint, ScoringModule wiring, processor integration, algorithmVersion 2.1 |
| 2026-02-16 | 22-01 | PredictionOutcome as TypeScript enum | Stored as VARCHAR(30) for flexibility, not Prisma enum to avoid migration overhead |
| 2026-02-16 | 22-01 | Features as JSONB | Complete ScoringFeatures interface stored as JSON for immutability and decoupling |
| 2026-02-16 | 22-01 | Algorithm version '2.1' hardcoded | Consistency across feature snapshot, prediction log, and risk score result |
| 2026-02-16 | 22-01 | Synchronous ML persistence with try/catch | Runs in scoring job but never fails scoring on ML persistence errors |
| 2026-02-16 | 22-01 | Idempotent prediction log upsert | Allows re-scoring without duplicates using applicationId unique constraint |
| 2026-02-16 | Executed 22-01-PLAN.md | ApplicationFeatureSnapshot and PredictionLog models, MlPersistenceService, wired into ScoringProcessor step 6a |
| 2026-02-16 | 22-02 | APPROVED_* granular outcomes added | APPROVED_PENDING/PAID_ON_TIME/LATE_PAYMENTS/DEFAULTED for ML training granularity, legacy values kept |
| 2026-02-16 | 22-02 | Dedicated ML event listeners | Separate from notification listeners to avoid cross-module coupling |
| 2026-02-16 | 22-02 | ContractOutcomeListener resolves applicationId from Contract | ContractActivatedEvent does not carry applicationId, query needed |
| 2026-02-16 | 22-02 | Raw SQL for point-in-time export | Joins immutable snapshots + predictions + outcomes, never mutable Application data |
| 2026-02-16 | 22-02 | 5-day grace period for late payment classification | Matches Phase 9 convention for Colombian rent payment standard |
| 2026-02-16 | Executed 22-02-PLAN.md | Outcome tracking listeners, daily scheduler, ADMIN export endpoint, Phase 22 COMPLETE |
| 2026-03-09 | 23-01 | AgencyService injected into UsersService via AgencyModule import | Avoids circular dependency, AgencyModule does not import UsersModule |
| 2026-03-09 | 23-01 | completeOnboarding returns union type: User OR { user, agency, onboardingStep } | Preserves backward compatibility for TENANT/LANDLORD/AGENT flows |
| 2026-03-09 | 23-01 | Migration uses snake_case column names | Matches @@map conventions throughout Prisma schema |
| 2026-03-09 | 23-01 | Migration script is idempotent (IF NOT EXISTS guards) | Safe re-execution in Supabase SQL Editor |
| 2026-03-09 | Executed 23-01-PLAN.md | Prisma schema + migration, DTO updates, service/module wiring for INMOBILIARIA onboarding |

## Session Continuity

**Last session:** 2026-03-09
**Stopped at:** Phase 23 Plan 01 complete - foundation for INMOBILIARIA registration done
**Resume file:** .planning/phases/23-inmobiliaria-registration/23-01-SUMMARY.md

---
*Last updated: 2026-03-09*
