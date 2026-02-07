---
phase: 14-wishlist-favorites
plan: 01
subsystem: wishlists
tags: [wishlist, favorites, tenant, prisma, rest-api]
dependency-graph:
  requires: [01-foundation, 02-auth, 03-properties]
  provides: [wishlist-item-model, wishlists-module, wishlists-endpoints]
  affects: [19-property-recommendations]
tech-stack:
  added: []
  patterns: [upsert-idempotent, deleteMany-idempotent]
key-files:
  created:
    - src/wishlists/dto/add-wishlist-item.dto.ts
    - src/wishlists/dto/index.ts
    - src/wishlists/wishlists.service.ts
    - src/wishlists/wishlists.controller.ts
    - src/wishlists/wishlists.module.ts
  modified:
    - prisma/schema.prisma
    - src/app.module.ts
decisions:
  - id: WISH-UPSERT
    description: "Upsert for idempotent add, deleteMany for idempotent remove"
    rationale: "No error on duplicate add or missing remove - better UX"
  - id: WISH-DRAFT-EXCLUSION
    description: "Cannot add DRAFT properties to wishlist"
    rationale: "DRAFT properties are not publicly visible, should not be favoritable"
metrics:
  duration: ~3 minutes
  completed: 2026-02-07
---

# Phase 14 Plan 01: Wishlist & Favorites Summary

**One-liner:** WishlistItem model with upsert-idempotent add/remove and tenant-only REST endpoints returning full property data with images.

## What Was Done

### Task 1: Prisma Schema and Migration
- Added `WishlistItem` model to `prisma/schema.prisma` with `@@unique([userId, propertyId])` compound constraint
- Added `wishlistItems` relation array to both `User` and `Property` models
- Cascade delete on both user and property deletion
- Indexes on `userId` and `propertyId` for query performance
- Prisma client regenerated successfully

### Task 2: WishlistsModule (DTO + Service + Controller + Registration)
- **AddWishlistItemDto**: `@IsUUID()` validation on `propertyId`
- **WishlistsService**:
  - `addItem()`: Validates property exists and is not DRAFT, then upserts (idempotent)
  - `removeItem()`: Uses `deleteMany` for idempotent removal (no error if not found)
  - `findAll()`: Returns all items with property + images, ordered by `createdAt DESC`
- **WishlistsController**: 3 endpoints all restricted to `TENANT` role
  - `POST /wishlists/items` - Add property to wishlist (201)
  - `DELETE /wishlists/items/:propertyId` - Remove from wishlist (204)
  - `GET /wishlists` - List all favorites with property data (200)
- **WishlistsModule**: Registered in `AppModule` after `ChatModule`

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Upsert for idempotent add | No error on duplicate - frontend can call add without checking first |
| deleteMany for idempotent remove | No error if item doesn't exist - simplifies frontend logic |
| DRAFT property exclusion | DRAFT properties are private to landlord, not visible publicly |
| TENANT-only role restriction | Wishlist is a tenant feature - landlords list properties, tenants favorite them |
| Include property images in response | Frontend needs thumbnail for wishlist display |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

| Check | Status |
|-------|--------|
| `npx prisma validate` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| WishlistItem model in schema | PASS |
| @@unique([userId, propertyId]) constraint | PASS |
| User.wishlistItems relation | PASS |
| Property.wishlistItems relation | PASS |
| 3 endpoints in build output | PASS |
| TENANT role restriction on all endpoints | PASS |

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | aee126f | feat(14-01): add WishlistItem model to Prisma schema |
| 2 | 54af0a1 | feat(14-01): add WishlistsModule with service, controller, DTOs |

## Next Steps

- Run `npx prisma db push` to sync schema to database
- Phase 14 has only 1 plan, so phase is complete after this
- Next phase: Phase 15 (Tenant Documents Vault)
