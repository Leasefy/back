# Phase 16: Tenant Preferences & Profile - Research

**Researched:** 2026-02-07
**Domain:** NestJS 11 + Prisma 7 tenant profile aggregation, search preferences persistence, cross-device sync
**Confidence:** HIGH

## Summary

Phase 16 implements tenant search preferences persistence and a unified tenant profile endpoint that aggregates data from multiple sources (User, TenantPreference, Application, RiskScore). This enables cross-device preference sync for property searches and provides a complete tenant profile for use in future recommendation systems (Phase 19).

The implementation follows established codebase patterns: a new `TenantPreference` model with user-scoped CRUD operations, and a profile aggregation endpoint that joins data from existing tables. The preference model stores search filters (cities, bedrooms, property types, budget range, pet-friendly, move-in date), while the profile endpoint returns a unified view combining basic user info, preferences, latest application data (income, employment), and risk assessment.

**Primary recommendation:** Create a `TenantPreference` model with `@unique([userId])` constraint for 1:1 user relationship, implement PATCH/GET endpoints for preferences using upsert semantics (idempotent updates), and add a GET `/tenants/me/profile` endpoint that aggregates User + TenantPreference + latest Application data + RiskScoreResult into a single response.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | 11.x | NestJS framework | Established in codebase |
| @prisma/client | 7.3.0 | Database ORM | Used across all modules |
| class-validator | 0.14.3 | DTO validation | Standard validation library |
| class-transformer | 0.5.1 | Request transformation | Type coercion for queries |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/swagger | 11.2.5 | API documentation | All endpoints |
| @Type() decorator | - | Transform arrays/numbers | Query param coercion |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate model | User metadata JSON | TenantPreference model is cleaner, queryable, and type-safe |
| Multiple endpoints | Single mega endpoint | Separate GET preferences + GET profile provides better flexibility |
| Manual aggregation | Prisma include | Prisma includes are more efficient (single query with JOIN) |

**Installation:**
No new dependencies needed - all libraries already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts       # Add profile endpoints here
│   ├── users.service.ts          # Add profile aggregation logic
│   └── dto/
│       ├── update-preferences.dto.ts  # NEW
│       ├── tenant-profile.dto.ts      # NEW (response DTO)
│       └── index.ts
└── common/
    └── enums/
        └── property-type.enum.ts  # Already exists
```

**Why users/ and not tenants/?**
- The codebase follows a role-based architecture where `UsersModule` handles all user-related operations.
- `@Roles(Role.TENANT)` decorator restricts endpoints to tenant users.
- Existing pattern: `/users/me` (profile), `/users/me/documents` (vault), `/users/me/onboarding` (setup).
- New endpoints follow this convention: `/users/me/preferences`, `/users/me/profile`.

### Pattern 1: TenantPreference Model (1:1 with User)
**What:** Prisma model storing tenant search preferences with unique userId constraint
**When to use:** Always - this is the persistence layer for preferences
**Example:**
```prisma
model TenantPreference {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid

  // Search filters
  preferredCities        String[] @default([])
  preferredBedrooms      Int?
  preferredPropertyTypes String[] @default([])
  minBudget              Int?
  maxBudget              Int?

  // Additional preferences
  petFriendly            Boolean  @default(false) @map("pet_friendly")
  moveInDate             DateTime? @map("move_in_date") @db.Date

  updatedAt              DateTime @updatedAt @map("updated_at")

  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("tenant_preferences")
}
```

**Key design decisions:**
- `@unique([userId])` ensures 1:1 relationship (one preference record per user).
- `@db.Uuid` for userId to match User.id type (UUID).
- `String[]` for cities and property types (PostgreSQL array type).
- `preferredPropertyTypes` stores enum values as strings (`["APARTMENT", "HOUSE"]`).
- `preferredBedrooms` is singular (exact match or minimum), nullable for "any".
- `Int?` for budget allows null (no preference) vs 0 (invalid).
- `petFriendly` is boolean with default false (explicit filter).
- `moveInDate` as Date only (no time component needed).
- `onDelete: Cascade` - delete preferences when user is deleted.
- No `createdAt` - only `updatedAt` matters for preferences.
- Requires adding `tenantPreference TenantPreference?` to User model.

### Pattern 2: Upsert for Preferences Update
**What:** Use Prisma upsert to create-or-update preferences idempotently
**When to use:** PATCH /users/me/preferences endpoint
**Example:**
```typescript
async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
  return this.prisma.tenantPreference.upsert({
    where: { userId },
    create: {
      userId,
      preferredCities: dto.preferredCities ?? [],
      preferredBedrooms: dto.preferredBedrooms,
      preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      petFriendly: dto.petFriendly ?? false,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
    update: {
      preferredCities: dto.preferredCities ?? [],
      preferredBedrooms: dto.preferredBedrooms,
      preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      petFriendly: dto.petFriendly ?? false,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
  });
}
```

**Why upsert?**
- First PATCH creates the record, subsequent PATCHes update it.
- No need for separate POST/PUT endpoints or existence checks.
- Idempotent - frontend can call PATCH without checking if preferences exist.
- Matches the wishlist pattern (14-01) for consistency.

### Pattern 3: Profile Aggregation with Prisma Include
**What:** Single query joining User + TenantPreference + Application + RiskScore
**When to use:** GET /users/me/profile endpoint
**Example:**
```typescript
async getTenantProfile(userId: string) {
  // Get latest submitted application with risk score
  const latestApplication = await this.prisma.application.findFirst({
    where: {
      tenantId: userId,
      status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PREAPPROVED', 'APPROVED'] },
    },
    include: {
      riskScore: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Get user with preferences
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantPreference: true,
    },
  });

  if (!user) throw new NotFoundException('User not found');

  // Extract application data
  const applicationData = latestApplication ? {
    income: (latestApplication.incomeInfo as any)?.monthlySalary,
    employment: (latestApplication.employmentInfo as any)?.employmentType,
    employmentCompany: (latestApplication.employmentInfo as any)?.companyName,
  } : null;

  // Extract risk score
  const riskData = latestApplication?.riskScore ? {
    totalScore: latestApplication.riskScore.totalScore,
    level: latestApplication.riskScore.level,
  } : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    },
    preferences: user.tenantPreference || null,
    applicationData,
    riskData,
  };
}
```

**Why this structure?**
- Two queries: (1) latest application with risk score, (2) user with preferences.
- Could be a single query with nested includes, but separating makes logic clearer.
- Application data is JSON fields - cast to `any` to access properties (validated at write time).
- Returns null for applicationData/riskData if no applications exist (new tenant).
- Frontend can check for null values to conditionally render sections.

### Pattern 4: DTO with Array and Enum Validation
**What:** Validate arrays of strings and enums for preferences
**When to use:** UpdatePreferencesDto for PATCH endpoint
**Example:**
```typescript
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsInt,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '../../common/enums/index.js';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred cities',
    example: ['Bogota', 'Medellin'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  preferredCities?: string[];

  @ApiPropertyOptional({
    description: 'Preferred number of bedrooms',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  preferredBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Preferred property types',
    example: ['APARTMENT', 'HOUSE'],
    enum: PropertyType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  preferredPropertyTypes?: PropertyType[];

  @ApiPropertyOptional({
    description: 'Minimum monthly budget in COP',
    example: 1000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBudget?: number;

  @ApiPropertyOptional({
    description: 'Maximum monthly budget in COP',
    example: 3000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional({
    description: 'Looking for pet-friendly properties',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Desired move-in date',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  moveInDate?: string;
}
```

**Validation patterns:**
- `@IsArray()` + `@IsString({ each: true })` for string arrays.
- `@IsEnum(PropertyType, { each: true })` for enum arrays.
- `@Type(() => Number)` for numeric fields (auto-coercion from query params if needed).
- `@ArrayMaxSize(10)` to prevent abuse (reasonable limit for cities).
- `@Min(0)` for budget (negative values are invalid).
- All fields `@IsOptional()` - partial updates allowed.
- `@ApiPropertyOptional()` with examples for Swagger docs.

### Pattern 5: Response DTO for Profile
**What:** Typed response DTO for the aggregated profile endpoint
**When to use:** Return type for GET /users/me/profile
**Example:**
```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RiskLevel } from '../../common/enums/index.js';

class UserBasicDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  phone!: string | null;
}

class PreferencesDto {
  @ApiProperty({ type: [String] })
  preferredCities!: string[];

  @ApiPropertyOptional()
  preferredBedrooms?: number | null;

  @ApiProperty({ type: [String] })
  preferredPropertyTypes!: string[];

  @ApiPropertyOptional()
  minBudget?: number | null;

  @ApiPropertyOptional()
  maxBudget?: number | null;

  @ApiProperty()
  petFriendly!: boolean;

  @ApiPropertyOptional()
  moveInDate?: Date | null;
}

class ApplicationDataDto {
  @ApiPropertyOptional({ description: 'Monthly salary from latest application' })
  income?: number | null;

  @ApiPropertyOptional({ description: 'Employment type from latest application' })
  employment?: string | null;

  @ApiPropertyOptional({ description: 'Company name from latest application' })
  employmentCompany?: string | null;
}

class RiskDataDto {
  @ApiProperty({ description: 'Total risk score (0-100)' })
  totalScore!: number;

  @ApiProperty({ enum: RiskLevel, description: 'Risk level (A/B/C/D)' })
  level!: RiskLevel;
}

export class TenantProfileDto {
  @ApiProperty({ type: UserBasicDto })
  user!: UserBasicDto;

  @ApiProperty({ type: PreferencesDto, nullable: true })
  preferences!: PreferencesDto | null;

  @ApiProperty({ type: ApplicationDataDto, nullable: true })
  applicationData!: ApplicationDataDto | null;

  @ApiProperty({ type: RiskDataDto, nullable: true })
  riskData!: RiskDataDto | null;
}
```

**Why nested DTOs?**
- Clear structure matching the aggregation pattern.
- Each section (user, preferences, applicationData, riskData) is a separate object.
- `nullable: true` for optional sections (new tenant has no preferences/applications).
- Frontend can destructure: `const { user, preferences, applicationData, riskData } = profile`.
- Swagger generates accurate documentation with nested schemas.

## Integration Points

### 1. Prisma Schema (schema.prisma)
- Add `TenantPreference` model after `User` model.
- Add `tenantPreference TenantPreference?` to User model relations section.
- Run `npx prisma migrate dev --name add-tenant-preferences` to create migration.
- Run `npx prisma generate` to update Prisma client.

### 2. UsersModule (src/users/users.module.ts)
- No changes needed - UsersService and UsersController already exist.
- Add new methods to existing service/controller files.

### 3. UsersService (src/users/users.service.ts)
- Add `updatePreferences(userId: string, dto: UpdatePreferencesDto)` method.
- Add `getPreferences(userId: string)` method.
- Add `getTenantProfile(userId: string)` method.

### 4. UsersController (src/users/users.controller.ts)
- Add `PATCH /users/me/preferences` endpoint (tenant-only).
- Add `GET /users/me/preferences` endpoint (tenant-only).
- Add `GET /users/me/profile` endpoint (tenant-only).

### 5. Enums
- `PropertyType` enum already exists in `src/common/enums/property-type.enum.ts`.
- `RiskLevel` enum already exists in `src/common/enums/risk-level.enum.ts`.

### 6. Existing Dependencies
- Application model already has `incomeInfo`, `employmentInfo` JSON fields.
- RiskScoreResult model already exists with `totalScore` and `level` fields.
- No schema changes needed for existing models.

## Frontend Contract

### Frontend Context Files
From phase description:
- `src/lib/context/TenantProfileContext.tsx` - Profile with preferences
- `src/lib/context/UserProfileContext.tsx` - User profile management

### Expected Data Structure
The frontend expects:
- `preferredCities: string[]` - Array of city names
- `preferredBedrooms: number` - Number of bedrooms
- `preferredPropertyTypes: PropertyType[]` - Array of property type enums
- `budget: { min: number, max: number }` - Budget range object

### API Response Mapping
Backend stores `minBudget` and `maxBudget` separately. Frontend needs to map:
```typescript
const budget = preferences ? {
  min: preferences.minBudget ?? 0,
  max: preferences.maxBudget ?? Infinity,
} : null;
```

Or backend can include a computed `budget` object in the response for convenience.

### Endpoints Expected
```
PATCH /users/me/preferences - Save/update preferences
GET /users/me/preferences - Get preferences only
GET /users/me/profile - Get full profile (user + preferences + application + risk)
```

## Technical Decisions

### 1. String[] vs JSON for Cities/PropertyTypes
**Decision:** Use PostgreSQL `String[]` array type, not JSON.
**Rationale:**
- Native array support in Prisma and PostgreSQL.
- Can use array operators in queries: `contains`, `has`, `hasSome`.
- Type-safe in Prisma (no casting needed).
- Better for future recommendation queries (Phase 19).

### 2. Separate Preferences and Profile Endpoints
**Decision:** Provide both `GET /preferences` and `GET /profile`.
**Rationale:**
- GET /preferences is lightweight (single table lookup).
- GET /profile is heavier (joins multiple tables).
- Frontend may only need preferences for search form prefill.
- Full profile is for dashboard/summary views.

### 3. Latest Application vs All Applications
**Decision:** Profile returns data from the LATEST SUBMITTED application only.
**Rationale:**
- A tenant may have multiple applications across properties.
- Most recent submitted application has the most current data (income, employment).
- DRAFT applications are excluded (incomplete data).
- WITHDRAWN/REJECTED applications are excluded (not relevant for profile).
- Only consider SUBMITTED, UNDER_REVIEW, PREAPPROVED, APPROVED statuses.

### 4. Null Handling for New Tenants
**Decision:** Return null for preferences/applicationData/riskData if not present.
**Rationale:**
- New tenant: no preferences, no applications → all null.
- Frontend checks `if (preferences)` before rendering.
- Clearer than empty objects or default values.
- Swagger `nullable: true` documents this explicitly.

### 5. Partial Updates for Preferences
**Decision:** All DTO fields are `@IsOptional()`, supporting partial updates.
**Rationale:**
- Frontend can update just `preferredCities` without sending other fields.
- Upsert handles undefined fields by preserving existing values? NO.
- **CORRECTION:** Upsert with undefined values will SET NULL.
- Must explicitly handle: `dto.field ?? existingValue` or require full object.
- **REVISED APPROACH:** Require full preferences object on PATCH (simpler).

**Revised upsert pattern:**
```typescript
async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
  return this.prisma.tenantPreference.upsert({
    where: { userId },
    create: {
      userId,
      ...dto,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
    update: {
      ...dto,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
  });
}
```

If frontend sends partial data, backend overwrites everything (full replacement). This is acceptable for preferences (small object, frontend has full state).

### 6. PropertyType Storage
**Decision:** Store enum values as strings (`"APARTMENT"`, `"HOUSE"`).
**Rationale:**
- Prisma `String[]` stores text values, not enum types.
- Frontend sends `PropertyType[]` as JSON array of strings.
- Validation: `@IsEnum(PropertyType, { each: true })` ensures valid values.
- When querying: `property.type IN preferredPropertyTypes` works with string comparison.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Profile aggregation | Manual joins | Prisma `include` | Generates optimized SQL joins |
| Array validation | Manual loops | `@IsString({ each: true })` | Built into class-validator |
| Date parsing | Manual parsing | `@IsDateString()` + `new Date()` | Validates ISO 8601 format |
| Enum validation | String checks | `@IsEnum(PropertyType, { each: true })` | Type-safe, auto error messages |
| Upsert logic | Find-then-update | Prisma `upsert` | Atomic, race-condition free |
| DTO composition | Manual mapping | Nested DTOs | Type-safe, generates Swagger schemas |

## Common Pitfalls

### Pitfall 1: Forgetting to Add User Relation
**What goes wrong:** Prisma validation fails: "Relation field is missing".
**Why it happens:** TenantPreference has `user` relation, but User model doesn't have reverse relation.
**How to avoid:** Add `tenantPreference TenantPreference?` to User model relations.
**Warning signs:** `npx prisma validate` fails with relation error.

### Pitfall 2: Undefined vs Null in Upsert
**What goes wrong:** Partial PATCH clears existing fields.
**Why it happens:** `dto.field` is `undefined`, upsert interprets as "set to null".
**How to avoid:** Either require full object on PATCH, or manually merge with existing values using `findUnique` then `update`.
**Recommendation:** Require full preferences object (simpler, frontend has full state).

### Pitfall 3: JSON Field Type Casting
**What goes wrong:** TypeScript error accessing Application.incomeInfo fields.
**Why it happens:** Prisma types JSON fields as `Prisma.JsonValue` (not typed).
**How to avoid:** Cast to `any` or create interface and use type assertion: `as IncomeInfo`.
**Example:** `(latestApplication.incomeInfo as any)?.monthlySalary`.

### Pitfall 4: Date Strings in Response
**What goes wrong:** Frontend receives Date objects as ISO strings, parsing needed.
**Why it happens:** NestJS serializes Date to string in JSON response.
**How to avoid:** Accept it (standard behavior) or use `@Transform()` to control serialization.
**Frontend handling:** `new Date(profile.preferences.moveInDate)` for display.

### Pitfall 5: Empty Arrays vs Null
**What goes wrong:** Preferences has `preferredCities: []` (empty array) treated differently than null.
**Why it happens:** Prisma default value is `[]` for arrays.
**How to avoid:** Decide convention: empty array means "any city" or null means "no preference"?
**Recommendation:** Use empty array for "no filter" (query logic: `if (cities.length > 0) filter by cities`).

### Pitfall 6: Missing Role Guard
**What goes wrong:** Landlord can access tenant preferences endpoints.
**Why it happens:** Forgetting `@Roles(Role.TENANT)` decorator.
**How to avoid:** All three endpoints MUST have `@Roles(Role.TENANT)` decorator.
**Verification:** Check build output or test with landlord token.

## Code Examples

### Complete Prisma Schema Addition

```prisma
// Add to prisma/schema.prisma

model TenantPreference {
  id                     String   @id @default(uuid()) @db.Uuid
  userId                 String   @unique @map("user_id") @db.Uuid
  preferredCities        String[] @default([])
  preferredBedrooms      Int?     @map("preferred_bedrooms")
  preferredPropertyTypes String[] @default([]) @map("preferred_property_types")
  minBudget              Int?     @map("min_budget")
  maxBudget              Int?     @map("max_budget")
  petFriendly            Boolean  @default(false) @map("pet_friendly")
  moveInDate             DateTime? @map("move_in_date") @db.Date
  updatedAt              DateTime @updatedAt @map("updated_at")

  user                   User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("tenant_preferences")
}

// Add to User model relations section:
model User {
  // ... existing fields ...

  // Add this to relations section:
  tenantPreference       TenantPreference?

  @@map("users")
}
```

### Complete Service Implementation

```typescript
// src/users/users.service.ts - Add these methods

import { ApplicationStatus } from '@prisma/client';
import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';

/**
 * Update or create tenant search preferences.
 * Uses upsert for idempotent behavior - first call creates, subsequent calls update.
 */
async updatePreferences(userId: string, dto: UpdatePreferencesDto) {
  return this.prisma.tenantPreference.upsert({
    where: { userId },
    create: {
      userId,
      preferredCities: dto.preferredCities ?? [],
      preferredBedrooms: dto.preferredBedrooms,
      preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      petFriendly: dto.petFriendly ?? false,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
    update: {
      preferredCities: dto.preferredCities ?? [],
      preferredBedrooms: dto.preferredBedrooms,
      preferredPropertyTypes: dto.preferredPropertyTypes ?? [],
      minBudget: dto.minBudget,
      maxBudget: dto.maxBudget,
      petFriendly: dto.petFriendly ?? false,
      moveInDate: dto.moveInDate ? new Date(dto.moveInDate) : null,
    },
  });
}

/**
 * Get tenant search preferences.
 * Returns null if preferences haven't been set yet.
 */
async getPreferences(userId: string) {
  return this.prisma.tenantPreference.findUnique({
    where: { userId },
  });
}

/**
 * Get full tenant profile with aggregated data.
 * Combines user info, preferences, latest application data, and risk score.
 */
async getTenantProfile(userId: string) {
  // Get user with preferences
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenantPreference: true,
    },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  // Get latest submitted application with risk score
  const latestApplication = await this.prisma.application.findFirst({
    where: {
      tenantId: userId,
      status: {
        in: [
          ApplicationStatus.SUBMITTED,
          ApplicationStatus.UNDER_REVIEW,
          ApplicationStatus.PREAPPROVED,
          ApplicationStatus.APPROVED,
        ],
      },
    },
    include: {
      riskScore: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Extract application data (JSON fields)
  const applicationData = latestApplication
    ? {
        income: (latestApplication.incomeInfo as any)?.monthlySalary,
        employment: (latestApplication.employmentInfo as any)?.employmentType,
        employmentCompany: (latestApplication.employmentInfo as any)?.companyName,
      }
    : null;

  // Extract risk score
  const riskData = latestApplication?.riskScore
    ? {
        totalScore: latestApplication.riskScore.totalScore,
        level: latestApplication.riskScore.level,
      }
    : null;

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
    },
    preferences: user.tenantPreference,
    applicationData,
    riskData,
  };
}
```

### Complete Controller Implementation

```typescript
// src/users/users.controller.ts - Add these endpoints

import { UpdatePreferencesDto } from './dto/update-preferences.dto.js';

/**
 * Update tenant search preferences.
 * Creates preferences on first call, updates on subsequent calls (upsert).
 */
@Patch('me/preferences')
@Roles(Role.TENANT)
@ApiOperation({ summary: 'Save/update tenant search preferences' })
@ApiOkResponse({ description: 'Preferences updated successfully' })
async updatePreferences(
  @CurrentUser('id') userId: string,
  @Body() dto: UpdatePreferencesDto,
) {
  return this.usersService.updatePreferences(userId, dto);
}

/**
 * Get tenant search preferences.
 * Returns null if preferences haven't been set yet.
 */
@Get('me/preferences')
@Roles(Role.TENANT)
@ApiOperation({ summary: 'Get tenant search preferences' })
@ApiOkResponse({ description: 'Tenant preferences retrieved' })
async getPreferences(@CurrentUser('id') userId: string) {
  return this.usersService.getPreferences(userId);
}

/**
 * Get full tenant profile with aggregated data.
 * Includes user info, preferences, latest application data, and risk score.
 */
@Get('me/profile')
@Roles(Role.TENANT)
@ApiOperation({ summary: 'Get full tenant profile' })
@ApiOkResponse({ description: 'Tenant profile retrieved' })
async getTenantProfile(@CurrentUser('id') userId: string) {
  return this.usersService.getTenantProfile(userId);
}
```

## Estimated Plans

This phase can be implemented in **2 plans**:

### Plan 16-01: TenantPreference Model + Preferences Endpoints
**Tasks:**
1. Add TenantPreference model to Prisma schema
2. Add relation to User model
3. Run migration and generate client
4. Create UpdatePreferencesDto
5. Implement updatePreferences() and getPreferences() in UsersService
6. Add PATCH/GET /users/me/preferences endpoints to UsersController
7. Verify with Swagger and test with curl

**Deliverables:**
- `TenantPreference` model in database
- `PATCH /users/me/preferences` endpoint (upsert)
- `GET /users/me/preferences` endpoint

### Plan 16-02: Tenant Profile Aggregation Endpoint
**Tasks:**
1. Create TenantProfileDto (response DTO)
2. Implement getTenantProfile() in UsersService
3. Add GET /users/me/profile endpoint to UsersController
4. Verify aggregation includes all data sources
5. Test with tenant who has applications and one without

**Deliverables:**
- `GET /users/me/profile` endpoint
- Aggregated response with user + preferences + application + risk data

## Open Questions

1. **Should preferences include amenities filter?**
   - Not in spec, but PropertyFilter supports amenities array.
   - Recommendation: Start without, add in Phase 19 if needed for recommendations.

2. **Should moveInDate be validated as future date?**
   - Tenants might want to track past searches.
   - Recommendation: No validation, accept any date (past or future).

3. **Should profile endpoint support role parameter for future landlord profiles?**
   - Currently spec is tenant-only.
   - Recommendation: Keep tenant-only for now, add landlord profile in separate phase if needed.

4. **Should preferences be versioned for A/B testing or ML training?**
   - Not in spec, but could help Phase 19 recommendations.
   - Recommendation: Not needed for Phase 16, add `updatedAt` tracking only.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct examination:
  - `prisma/schema.prisma` - Full schema, UUID pattern, array types, relation patterns
  - `src/users/users.service.ts` - Existing profile/onboarding patterns
  - `src/users/users.controller.ts` - `/users/me/*` endpoint patterns
  - `src/wishlists/wishlists.service.ts` - Upsert pattern for idempotent operations
  - `src/applications/dto/` - DTO patterns with arrays, enums, validation
  - `src/properties/dto/filter-properties.dto.ts` - PropertyType enum usage in arrays
  - `src/scoring/scoring.service.ts` - Aggregation patterns with Prisma includes
  - `package.json` - Versions: NestJS 11, Prisma 7.3.0, class-validator 0.14.3

- **Phase specification** - Requirements document:
  - Model structure: preferredCities[], preferredBedrooms, preferredPropertyTypes[], budget range
  - Endpoints: PATCH/GET preferences, GET profile
  - Dependencies: Phase 2 (Auth), Phase 4 (Applications)
  - Frontend references: TenantProfileContext.tsx, UserProfileContext.tsx

### Secondary (MEDIUM confidence)
- **Prisma documentation** - Upsert, array types, includes:
  - https://www.prisma.io/docs/concepts/components/prisma-client/crud#upsert
  - https://www.prisma.io/docs/concepts/components/prisma-schema/data-model#arrays

### Tertiary (LOW confidence - assumptions)
- PropertyType enum storage as strings (verified in codebase but could be optimized with Prisma enums in future)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, all patterns exist in codebase
- Architecture: HIGH - Direct mapping to Users module, follows /users/me/* pattern
- Pitfalls: HIGH - Identified from actual codebase patterns (JSON casting, upsert semantics)
- Integration: HIGH - All integration points exist (User, Application, RiskScore models)

**Research date:** 2026-02-07
**Valid until:** 2026-03-07 (stable - feature uses established patterns, no external dependencies)
