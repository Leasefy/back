# Project State: Arriendo Facil Backend

## Current Status

**Phase:** 6 of 15 (Landlord Features) - COMPLETE
**Plan:** 3 of 3
**Status:** Phase 6 complete - Ready for Phase 7
**Last activity:** 2026-02-01 - Completed 06-03-PLAN.md (Decision Endpoints)

**Progress:** [#######---] 38% (21/~55 plans estimated)

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

**Current focus:** Phase 6 - Landlord Features COMPLETE. Ready for Phase 7 - Contracts.

## Quick Context

- Backend NestJS para marketplace de arriendos
- Supabase: PostgreSQL + Auth + Storage
- Risk Score con AI (Claude) para analisis de documentos (PRO+ tier)
- 15 fases, ~112 requirements
- Tier system: FREE (Phases 1-9), PRO+ (Phases 10-11)

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Foundation | COMPLETE | All 3 plans executed |
| 2. Auth & Users | COMPLETE | All 3 plans executed |
| 3. Properties | COMPLETE | All 4 plans executed |
| 4. Applications | COMPLETE | All 5 plans executed |
| 5. Scoring Engine | COMPLETE | All 3 plans executed - async scoring pipeline |
| 6. Landlord Features | COMPLETE | All 3 plans - decisions, notes, review |
| 7. Contracts | Pending | Digital signatures |
| 8. Leases & Payments | Pending | Payment tracking |
| 9. Payment History Scoring | Pending | NEW - Score from payment history |
| 10. AI Document Analysis | Pending | PRO+ tier - Claude integration |
| 11. Explainability | Pending | PRO+ tier - AI explanations |
| 12. Notifications | Pending | Email service |
| 13. ML Persistence | Pending | Data for ML training |
| 14. Subscriptions & Plans | Pending | Billing |
| 15. Insurance | Pending | Optional insurance |

## Roadmap Evolution

| Date | Change | Rationale |
|------|--------|-----------|
| 2026-01-30 | Reordered phases 6-15 | Logical flow: approve -> contract -> payments -> history scoring |
| 2026-01-30 | Added Phase 9: Payment History Scoring | Enable scoring based on real payment data |
| 2026-01-30 | Moved AI features to phases 10-11 | PRO+ tier only, after core flow complete |
| 2026-01-30 | Added tier system | FREE (1-9) vs PRO+ (10-11) |

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

## Session Continuity

**Last session:** 2026-02-01
**Stopped at:** Completed 06-03-PLAN.md (Decision Endpoints)
**Resume file:** None

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

**Environment variables:**
1. Add `SUPABASE_SERVICE_KEY` to `.env` (from: Supabase Dashboard > Settings > API > service_role key)
2. Add `REDIS_URL` to `.env` (Upstash: rediss://...)

**Database sync for Application tables:**
1. Run: `npx prisma db push`
2. If "spawn UNKNOWN" error on Windows/OneDrive, try WSL or shorter path
3. Verify tables: `npx prisma studio`

## Next Action

Phase 6 complete. Begin Phase 7: Contracts.

```
/gsd:plan-phase 07
```

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

---
*Last updated: 2026-02-01*
