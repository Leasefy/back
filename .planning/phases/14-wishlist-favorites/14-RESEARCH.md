# Phase 14: Wishlist & Favorites - Research

**Researched:** 2026-02-07
**Domain:** NestJS 11 + Prisma 7 CRUD module, tenant-scoped server-side favorites
**Confidence:** HIGH

## Summary

Phase 14 implements a simple tenant-scoped wishlist where authenticated tenants can save, remove, and list favorite properties. The backend stores a `WishlistItem` join record with a `@@unique([userId, propertyId])` constraint, providing idempotent add semantics and persistence across devices.

This is a straightforward CRUD feature that maps directly to the existing codebase patterns. The project already has 18+ NestJS modules with consistent patterns: module/controller/service/dto structure, `PrismaService` for database access (globally available), `@Roles()` decorator for role-based access, `@CurrentUser()` for extracting authenticated user, and `@ApiTags()`/`@ApiBearerAuth()` for Swagger docs.

**Primary recommendation:** Follow the existing module pattern exactly (see Insurance/Visits modules as templates), adding one Prisma model, one module with controller+service, and two DTOs. The entire feature is ~200 lines of code across 6 files.

## Implementation Approach

### Prisma Schema Addition

Add `WishlistItem` model to `prisma/schema.prisma`:

```prisma
model WishlistItem {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @map("user_id") @db.Uuid
  propertyId String   @map("property_id") @db.Uuid
  createdAt  DateTime @default(now()) @map("created_at")

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  property   Property @relation(fields: [propertyId], references: [id], onDelete: Cascade)

  @@unique([userId, propertyId])
  @@index([userId])
  @@index([propertyId])
  @@map("wishlist_items")
}
```

**Key design decisions:**
- Use `@db.Uuid` for id/userId/propertyId to match existing convention (all models use UUID).
- `@@unique([userId, propertyId])` enables Prisma `upsert` for idempotent add (WISH-04).
- `onDelete: Cascade` on both relations: if user or property is deleted, wishlist entries are cleaned up.
- `@@map("wishlist_items")` follows snake_case table naming convention used throughout.
- Requires adding `wishlistItems WishlistItem[]` relation arrays to both `User` and `Property` models.

### Module Structure

```
src/wishlists/
  wishlists.module.ts
  wishlists.controller.ts
  wishlists.service.ts
  dto/
    add-wishlist-item.dto.ts
    index.ts
```

This follows the established pattern. No sub-services needed since the feature is simple.

### Endpoints

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/wishlists/items` | Yes | TENANT | Add property to wishlist (idempotent) |
| DELETE | `/wishlists/items/:propertyId` | Yes | TENANT | Remove property from wishlist |
| GET | `/wishlists` | Yes | TENANT | List all wishlist items with property data |

### Response Shapes

**POST /wishlists/items** - Returns the WishlistItem with property data:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "propertyId": "uuid",
  "createdAt": "2026-02-07T...",
  "property": { /* full Property with images */ }
}
```

**GET /wishlists** - Returns array of WishlistItems with full property data:
```json
[
  {
    "id": "uuid",
    "propertyId": "uuid",
    "createdAt": "2026-02-07T...",
    "property": {
      "id": "uuid",
      "title": "...",
      "status": "AVAILABLE",
      "city": "...",
      "neighborhood": "...",
      "monthlyRent": 2500000,
      "bedrooms": 2,
      "bathrooms": 2,
      "area": 75,
      "images": [{ "id": "...", "url": "...", "order": 0 }]
    }
  }
]
```

**DELETE /wishlists/items/:propertyId** - Returns 204 No Content.

## Existing Patterns to Follow

### Module Registration (HIGH confidence)
- `AppModule` in `src/app.module.ts` imports all feature modules. Add `WishlistsModule` to the imports array.
- `PrismaModule` is `@Global()`, so `PrismaService` is available everywhere without importing `PrismaModule`.

### Controller Pattern (HIGH confidence)
From `visits.controller.ts` and `properties.controller.ts`:
```typescript
@ApiTags('wishlists')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Post('items')
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Add property to wishlist' })
  @ApiCreatedResponse({ description: 'Property added to wishlist' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistsService.addItem(userId, dto.propertyId);
  }
}
```

### Service Pattern (HIGH confidence)
From `properties.service.ts`:
```typescript
@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}
}
```

### DTO Pattern (HIGH confidence)
From `create-property.dto.ts`:
- Use `class-validator` decorators: `@IsString()`, `@IsUUID()`
- Use `@ApiProperty()` from `@nestjs/swagger`
- Export from `dto/index.ts` barrel file
- Use `.js` extension in imports (nodenext module resolution)

### Import Extension Convention (HIGH confidence)
The project uses `moduleResolution: "nodenext"` which requires `.js` extensions on all relative imports:
```typescript
import { WishlistsService } from './wishlists.service.js';
```

### Guard Pattern (HIGH confidence)
- `SupabaseAuthGuard` and `RolesGuard` are registered globally in `AppModule` as `APP_GUARD`.
- All routes are authenticated by default.
- Use `@Roles(Role.TENANT)` to restrict to tenant role.
- Use `@CurrentUser('id')` to get the authenticated user's ID.
- Use `@Public()` only for unauthenticated routes (not needed for wishlists).

### Error Handling Pattern (HIGH confidence)
- Use NestJS built-in exceptions: `NotFoundException`, `BadRequestException`.
- Throw `NotFoundException` when property doesn't exist.
- For idempotent add, use Prisma `upsert` - no error thrown for duplicates.

### Prisma Includes Pattern (HIGH confidence)
From `properties.service.ts`, include related data:
```typescript
include: {
  property: {
    include: {
      images: {
        orderBy: { order: 'asc' },
      },
    },
  },
}
```

## Integration Points

### 1. Prisma Schema (schema.prisma)
- Add `WishlistItem` model.
- Add `wishlistItems WishlistItem[]` to `User` model relations section.
- Add `wishlistItems WishlistItem[]` to `Property` model relations section.
- Run `npx prisma migrate dev --name add-wishlist-items` to create the migration.
- Run `npx prisma generate` to update the client.

### 2. AppModule (src/app.module.ts)
- Import `WishlistsModule` in the imports array.

### 3. PrismaService (src/database/prisma.service.ts)
- No changes needed. PrismaService extends PrismaClient and is `@Global()`.
- After migration, `prisma.wishlistItem` will be available automatically.

### 4. Property Model
- The wishlist GET endpoint must include property data that matches what the frontend expects:
  - `title`, `status`, `city`, `neighborhood`, `monthlyRent`, `bedrooms`, `bathrooms`, `area`
  - `images` array (with `url` and `order`)
  - These are all direct fields on the `Property` model.

## Frontend Contract (What the Frontend Expects)

### Current Frontend Implementation
The frontend (`src/lib/stores/wishlist.tsx`) currently uses:
- **localStorage** with key `arriendo-facil-wishlist` for persistence.
- Stores an array of property IDs: `string[]`.
- Functions: `addToWishlist(id)`, `removeFromWishlist(id)`, `toggleWishlist(id)`, `isWishlisted(id)`, `getWishlistedProperties()`.
- `getWishlistedProperties()` currently filters from `mockProperties` - will need to call API instead.

### Frontend Integration Plan
The frontend will need to be updated to call the backend API instead of localStorage:
1. `addToWishlist(id)` -> `POST /wishlists/items { propertyId: id }`
2. `removeFromWishlist(id)` -> `DELETE /wishlists/items/{id}`
3. `getWishlistedProperties()` -> `GET /wishlists` (returns property data)
4. `isWishlisted(id)` -> Check against locally cached list from GET response
5. `toggleWishlist(id)` -> Conditionally call add or remove

### Data the Frontend Consumes (from guardados/page.tsx)
The saved properties page renders:
- `property.title` - displayed in card
- `property.thumbnailUrl || property.images?.[0]` - card image
- `property.status` (checks for 'rented' to show overlay)
- `property.monthlyRent` - formatted as currency
- `property.neighborhood`, `property.city` - location text
- `property.bedrooms`, `property.bathrooms`, `property.area` - feature badges

The backend response should include sufficient property fields to satisfy this rendering. The `Property` model already has all these fields. The `images` relation provides the image URLs.

### API Response Mapping
Backend `Property` has `images: PropertyImage[]` (objects with `url`, `order`).
Frontend expects `images: string[]` and `thumbnailUrl: string`.

The frontend will need to map:
- `property.images[0].url` -> `thumbnailUrl`
- `property.images.map(i => i.url)` -> `images` array

Or the backend can keep returning the full `PropertyImage` objects and let the frontend handle the mapping (consistent with how other endpoints return data).

## Technical Decisions

### 1. ID Type: UUID (not CUID)
The phase spec suggested `@default(cuid())` but this codebase exclusively uses `@default(uuid()) @db.Uuid` for all model IDs. **Use UUID to maintain consistency.**

### 2. Idempotent Add via Prisma `upsert`
For WISH-04 (duplicate add is idempotent):
```typescript
return this.prisma.wishlistItem.upsert({
  where: {
    userId_propertyId: { userId, propertyId },
  },
  create: { userId, propertyId },
  update: {}, // No-op on duplicate
  include: { property: { include: { images: { orderBy: { order: 'asc' } } } } },
});
```
This uses the `@@unique([userId, propertyId])` compound unique constraint.

### 3. Silent Remove (no error if not found)
For DELETE, use `deleteMany` with the compound filter instead of `delete`:
```typescript
await this.prisma.wishlistItem.deleteMany({
  where: { userId, propertyId },
});
```
This returns `{ count: 0 }` if not found (no error), making it idempotent.

### 4. Property Validation on Add
When adding to wishlist, verify the property exists and is not DRAFT:
```typescript
const property = await this.prisma.property.findUnique({
  where: { id: propertyId },
});
if (!property) throw new NotFoundException('Property not found');
if (property.status === 'DRAFT') throw new NotFoundException('Property not found');
```

### 5. Ordering
Return wishlist items ordered by `createdAt DESC` (most recently added first).

### 6. No Pagination (For Now)
Wishlist size is naturally bounded (a user won't save thousands of properties). Return all items without pagination. Can be added later if needed.

## Risk Areas

### 1. Schema Migration (LOW risk)
Adding a new model with relations to `User` and `Property` requires adding relation fields to those models. This is a schema-only change with no data migration needed, so risk is minimal.

### 2. Cascade Deletion (LOW risk)
If a property is deleted, its wishlist entries are automatically deleted via `onDelete: Cascade`. This is the correct behavior - no orphan records.

### 3. N+1 Query Risk (LOW risk)
The GET endpoint uses Prisma `include` which generates a JOIN, not N+1 queries. As long as we use `include` properly, performance is fine.

### 4. Frontend Migration (MEDIUM risk)
The biggest change is on the frontend side - switching from localStorage to API calls. This involves:
- Adding authenticated API calls to the wishlist store
- Handling loading/error states
- Potentially caching the wishlist locally for `isWishlisted()` checks (used on every property card)
- This is frontend work, not backend, but the API design should make it easy.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Idempotent upsert | Manual check-then-insert | Prisma `upsert` with compound unique | Race condition free, atomic |
| Auth/role checking | Custom middleware | `@Roles(Role.TENANT)` + global guards | Already configured globally |
| Input validation | Manual validation | `class-validator` + `ValidationPipe` | Already configured globally |
| UUID validation | Regex in controller | `ParseUUIDPipe` | Built-in NestJS pipe |

## Common Pitfalls

### Pitfall 1: Forgetting `.js` Extension in Imports
**What goes wrong:** TypeScript compilation fails with module resolution errors.
**Why it happens:** The project uses `moduleResolution: "nodenext"` which requires explicit `.js` extensions.
**How to avoid:** Always use `.js` extension in relative imports: `import { X } from './x.js';`

### Pitfall 2: Not Adding Relations to User/Property Models
**What goes wrong:** Prisma schema validation fails.
**Why it happens:** Prisma requires both sides of a relation to be defined.
**How to avoid:** Add `wishlistItems WishlistItem[]` to both `User` and `Property` models.

### Pitfall 3: Using `delete` Instead of `deleteMany` for Remove
**What goes wrong:** Throws a P2025 error if the record doesn't exist.
**Why it happens:** Prisma `delete` requires the record to exist.
**How to avoid:** Use `deleteMany` with the compound filter for idempotent deletes, or use `findFirst` then `delete`.

### Pitfall 4: Not Filtering DRAFT Properties
**What goes wrong:** Tenant sees DRAFT (unpublished) properties in their wishlist.
**Why it happens:** The property was added when available, then landlord set it back to DRAFT.
**How to avoid:** Either filter DRAFT properties out in the GET response, or include them but let the frontend handle the status display (property cards already handle the "rented" status).

### Pitfall 5: Missing Swagger Decorators
**What goes wrong:** API documentation is incomplete.
**Why it happens:** Forgetting `@ApiBearerAuth()` or `@ApiOperation()`.
**How to avoid:** Follow the existing controller template exactly.

## Code Examples

### Complete Service Implementation Pattern

```typescript
// Source: Derived from existing patterns in properties.service.ts and visits.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { PropertyStatus } from '../common/enums/index.js';

const PROPERTY_INCLUDE = {
  images: { orderBy: { order: 'asc' as const } },
};

@Injectable()
export class WishlistsService {
  constructor(private readonly prisma: PrismaService) {}

  async addItem(userId: string, propertyId: string) {
    // Verify property exists and is not a draft
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });
    if (!property || property.status === PropertyStatus.DRAFT) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    // Upsert for idempotent add (WISH-04)
    return this.prisma.wishlistItem.upsert({
      where: { userId_propertyId: { userId, propertyId } },
      create: { userId, propertyId },
      update: {},
      include: {
        property: { include: PROPERTY_INCLUDE },
      },
    });
  }

  async removeItem(userId: string, propertyId: string): Promise<void> {
    await this.prisma.wishlistItem.deleteMany({
      where: { userId, propertyId },
    });
  }

  async findAll(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: {
        property: { include: PROPERTY_INCLUDE },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
```

### Complete DTO Pattern

```typescript
// Source: Derived from existing dto patterns (create-property.dto.ts)
import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddWishlistItemDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID of the property to add to wishlist',
  })
  @IsUUID()
  propertyId!: string;
}
```

### Complete Controller Pattern

```typescript
// Source: Derived from visits.controller.ts pattern
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/role.enum.js';
import { WishlistsService } from './wishlists.service.js';
import { AddWishlistItemDto } from './dto/index.js';

@ApiTags('wishlists')
@Controller('wishlists')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Post('items')
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Add property to wishlist' })
  @ApiCreatedResponse({ description: 'Property added to wishlist' })
  async addItem(
    @CurrentUser('id') userId: string,
    @Body() dto: AddWishlistItemDto,
  ) {
    return this.wishlistsService.addItem(userId, dto.propertyId);
  }

  @Delete('items/:propertyId')
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove property from wishlist' })
  @ApiNoContentResponse({ description: 'Property removed from wishlist' })
  async removeItem(
    @CurrentUser('id') userId: string,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ): Promise<void> {
    return this.wishlistsService.removeItem(userId, propertyId);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.TENANT)
  @ApiOperation({ summary: 'Get all wishlist items with property data' })
  @ApiOkResponse({ description: 'List of wishlist items' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.wishlistsService.findAll(userId);
  }
}
```

### Module Registration Pattern

```typescript
// wishlists.module.ts
import { Module } from '@nestjs/common';
import { WishlistsController } from './wishlists.controller.js';
import { WishlistsService } from './wishlists.service.js';

@Module({
  controllers: [WishlistsController],
  providers: [WishlistsService],
  exports: [WishlistsService],
})
export class WishlistsModule {}
```

## Estimated Plans

This feature is small enough for a single PLAN with 3 tasks:

### Task 1: Prisma Schema & Migration
- Add `WishlistItem` model to `schema.prisma`
- Add relation fields to `User` and `Property` models
- Run migration
- Generate Prisma client

### Task 2: WishlistsModule (Service + Controller + DTOs)
- Create `src/wishlists/` directory
- Create `AddWishlistItemDto` with validation
- Create `WishlistsService` with addItem, removeItem, findAll
- Create `WishlistsController` with POST, DELETE, GET endpoints
- Create `WishlistsModule` and register in `AppModule`

### Task 3: Verification & Smoke Test
- Start the dev server
- Verify Swagger docs show the 3 endpoints
- Test the endpoints using curl or Swagger UI

## Open Questions

1. **Should DRAFT properties be filterable from wishlist GET response?**
   - A property could become DRAFT after being wishlisted.
   - Recommendation: Include all wishlisted properties regardless of status. The frontend already handles the "rented" status badge. Let the frontend decide what to show.

2. **Should the wishlist count be exposed separately?**
   - The frontend shows a count badge. Currently derived from array length.
   - Recommendation: Not needed as a separate endpoint. The GET response length provides the count. If needed later, a simple `GET /wishlists/count` can be added.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct examination of all relevant source files:
  - `prisma/schema.prisma` - Full schema with 25+ models, all using UUID and snake_case mapping
  - `src/properties/` - Complete CRUD module pattern with controller/service/DTOs
  - `src/insurance/` - Minimal module pattern (service + controller, no DB)
  - `src/visits/visits.controller.ts` - Tenant-facing controller with `@Roles(Role.TENANT)`
  - `src/auth/decorators/` - `@CurrentUser()`, `@Roles()`, `@Public()` decorators
  - `src/auth/guards/` - `SupabaseAuthGuard` and `RolesGuard` (global guards)
  - `src/database/prisma.service.ts` - `PrismaService` extending `PrismaClient` with pg adapter
  - `src/database/prisma.module.ts` - `@Global()` module exporting `PrismaService`
  - `src/app.module.ts` - Module registration pattern with global guards
  - `tsconfig.json` - `moduleResolution: "nodenext"` requiring `.js` imports
  - `package.json` - NestJS 11, Prisma 7.3.0, class-validator 0.14.3

- **Frontend codebase** - Direct examination:
  - `front/src/lib/stores/wishlist.tsx` - localStorage-based wishlist with add/remove/toggle/getAll
  - `front/src/app/inquilino/guardados/page.tsx` - Saved properties page consuming Property type
  - `front/src/lib/types/property.ts` - Frontend Property interface with expected fields

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Direct codebase analysis, no external dependencies needed
- Architecture: HIGH - Follows exact patterns already established in 18+ existing modules
- Pitfalls: HIGH - Identified from actual codebase conventions (nodenext, UUID, Prisma patterns)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable - feature is pattern-based, no external dependencies)
