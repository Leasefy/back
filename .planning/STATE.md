# Project State: Arriendo Facil Backend

## Current Status

**Phase:** 4 of 10 (Applications)
**Plan:** 1 of 4 complete
**Status:** In progress
**Last activity:** 2026-01-29 - Completed 04-01-PLAN.md (Application Data Models)

**Progress:** [#####-----] 24% (11/~45 plans estimated)

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-24)

**Core value:** Ejecutar el Risk Score con analisis inteligente de documentos para que propietarios tomen decisiones informadas en minutos, con explicabilidad total.

**Current focus:** Phase 4 In Progress - Application data models complete. Database sync pending manual action.

## Quick Context

- Backend NestJS para marketplace de arriendos
- Supabase: PostgreSQL + Auth + Storage
- Risk Score con AI (Claude) para analisis de documentos
- 10 fases, 78 requirements

## Phase Progress

| Phase | Status | Notes |
|-------|--------|-------|
| 1. Foundation | COMPLETE | All 3 plans executed |
| 2. Auth & Users | COMPLETE | All 3 plans executed - User model, JWT auth, profile CRUD |
| 3. Properties | COMPLETE | All 4 plans executed - Data model, CRUD, public listing, images |
| 4. Applications | IN PROGRESS | 1/4 plans - Data models complete |
| 5. Scoring Engine | - Pending | |
| 6. AI Document Analysis | - Pending | |
| 7. Explainability | - Pending | |
| 8. Landlord Features | - Pending | |
| 9. Notifications | - Pending | |
| 10. ML Persistence | - Pending | |

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

## Session Continuity

**Last session:** 2026-01-29
**Stopped at:** Completed 04-01-PLAN.md - Application data models
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

**Environment variable:**
1. Add `SUPABASE_SERVICE_KEY` to `.env`
2. Get from: Supabase Dashboard > Settings > API > service_role key

**Database sync for Application tables:**
1. Run: `npx prisma db push`
2. If "spawn UNKNOWN" error on Windows/OneDrive, try WSL or shorter path
3. Verify tables: `npx prisma studio`

## Next Action

Continue Phase 4: Execute 04-02-PLAN.md (Application Service Layer)

```
/gsd:execute-plan .planning/phases/04-applications-documents/04-02-PLAN.md
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

---
*Last updated: 2026-01-29*
