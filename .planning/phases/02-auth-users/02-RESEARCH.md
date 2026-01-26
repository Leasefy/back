# Phase 2: Auth & Users - Research

**Researched:** 2026-01-25
**Domain:** Supabase Auth, NestJS guards, JWT verification, RBAC, user profile management
**Confidence:** HIGH

## Summary

Phase 2 implements authentication and user management using Supabase Auth as the identity provider with NestJS guards for route protection. The research confirms that the standard approach is to use Supabase's JWT tokens verified via `passport-jwt` strategy, with a custom `User` model in the public schema synced via database triggers.

Key findings:
- Use `@nestjs/passport` with `passport-jwt` to validate Supabase JWTs
- Verify JWTs using the `SUPABASE_JWT_SECRET` from Supabase Dashboard (Settings > API)
- Create a `User` model in Prisma with same UUID as Supabase Auth user
- Sync users via Postgres trigger on `auth.users` INSERT
- Implement RBAC with custom `@Roles()` decorator and `RolesGuard`
- Use `@Public()` decorator to skip auth on specific routes
- Create `@CurrentUser()` decorator to extract user from request

**Primary recommendation:** Use `passport-jwt` strategy with Supabase JWT secret for token validation, create a Prisma User model with role enum (TENANT/LANDLORD/BOTH), sync via database trigger, and implement guards following NestJS official patterns.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/passport | ^11.x | Passport integration | Official NestJS auth module |
| passport | ^0.7.x | Auth middleware | Industry standard for Node.js auth |
| passport-jwt | ^4.0.x | JWT strategy | Standard for JWT-based auth |
| @supabase/supabase-js | ^2.x | Supabase client | Official client for auth operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/passport-jwt | ^4.0.x | TypeScript types | Development only |
| bcrypt | - | NOT needed | Supabase handles password hashing |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| passport-jwt | nestjs-supabase-auth | Less control, additional dependency |
| passport-jwt | nest-supabase-guard | Less flexible, opinionated |
| Custom guards | @nestjsx/nest-access-control | Overkill for simple role-based access |

**Installation:**
```bash
npm install @nestjs/passport passport passport-jwt @supabase/supabase-js
npm install -D @types/passport-jwt
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── auth/
│   ├── auth.module.ts           # Auth module
│   ├── auth.controller.ts       # Login/logout endpoints (optional)
│   ├── auth.service.ts          # Auth business logic
│   ├── strategies/
│   │   └── supabase.strategy.ts # JWT validation strategy
│   ├── guards/
│   │   ├── supabase-auth.guard.ts   # JWT auth guard
│   │   └── roles.guard.ts           # Role-based access guard
│   └── decorators/
│       ├── public.decorator.ts      # @Public() decorator
│       ├── roles.decorator.ts       # @Roles() decorator
│       └── current-user.decorator.ts # @CurrentUser() decorator
├── users/
│   ├── users.module.ts          # Users module
│   ├── users.controller.ts      # Profile endpoints
│   ├── users.service.ts         # User business logic
│   └── dto/
│       └── update-profile.dto.ts
└── common/
    └── enums/
        └── role.enum.ts         # TENANT, LANDLORD, BOTH
```

### Pattern 1: Supabase JWT Strategy
**What:** Passport strategy that validates Supabase-issued JWTs
**When to use:** Always - this is the core auth mechanism
**Example:**
```typescript
// src/auth/strategies/supabase.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../../users/users.service';

export interface SupabaseJwtPayload {
  iss: string;       // Issuer
  sub: string;       // User UUID
  aud: string;       // Audience
  exp: number;       // Expiration
  iat: number;       // Issued at
  email: string;     // User email
  phone: string;     // User phone
  role: string;      // 'authenticated' | 'anon'
  aal: string;       // Auth assurance level
  session_id: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('SUPABASE_JWT_SECRET'),
    });
  }

  async validate(payload: SupabaseJwtPayload) {
    // payload.sub is the Supabase Auth user UUID
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user; // This becomes request.user
  }
}
```
**Source:** [NestJS Passport](https://docs.nestjs.com/security/authentication), [Supabase JWT Claims](https://supabase.com/docs/guides/auth/jwt-fields)

### Pattern 2: Custom Auth Guard with Public Route Support
**What:** Guard that validates JWT but allows public routes
**When to use:** Register globally, use @Public() to skip
**Example:**
```typescript
// src/auth/guards/supabase-auth.guard.ts
import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class SupabaseAuthGuard extends AuthGuard('supabase') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
```
**Source:** [DEV.to - Exclude routes from AuthGuard](https://dev.to/dannypule/exclude-route-from-nest-js-authgaurd-h0)

### Pattern 3: Role-Based Access Control
**What:** Decorator + Guard combo for restricting by user role
**When to use:** Endpoints that require specific roles (LANDLORD-only, etc.)
**Example:**
```typescript
// src/common/enums/role.enum.ts
export enum Role {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  BOTH = 'BOTH',
}

// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../../common/enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // No roles required
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Handle BOTH role - user can access TENANT or LANDLORD routes
    if (user.role === Role.BOTH) {
      return true;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
```
**Source:** [DEV.to - Custom RBAC in NestJS](https://dev.to/imzihad21/custom-role-based-access-control-in-nestjs-using-custom-guards-jol)

### Pattern 4: Custom Parameter Decorators
**What:** Decorators to extract user data from request
**When to use:** In controllers to get current user
**Example:**
```typescript
// src/auth/decorators/public.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// src/auth/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;
    return data ? user?.[data] : user;
  },
);
```
**Source:** [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators)

### Pattern 5: Prisma User Model with Supabase Sync
**What:** User model in public schema linked to auth.users via trigger
**When to use:** Always - keeps app data separate from auth data
**Example:**
```prisma
// prisma/schema.prisma
enum Role {
  TENANT
  LANDLORD
  BOTH
}

model User {
  id        String   @id @db.Uuid // Same as auth.users.id
  email     String   @unique
  role      Role     @default(TENANT)
  firstName String?  @map("first_name")
  lastName  String?  @map("last_name")
  phone     String?
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

```sql
-- Run after prisma migrate: SQL trigger to sync auth.users -> public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, role, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'TENANT'),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
**Source:** [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data)

### Anti-Patterns to Avoid
- **Using getSession() on server:** Never trust `getSession()` server-side; use JWT verification or `getUser()` for security
- **Cross-schema foreign keys in Prisma:** Prisma doesn't support foreign keys to `auth.users`; use triggers instead
- **Storing passwords:** Never store passwords; Supabase Auth handles this
- **Hardcoding JWT secret:** Always use environment variables
- **Skipping user sync:** Always sync Supabase users to your User table for app-specific data

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT validation | Manual decode + verify | passport-jwt | Edge cases, signature verification |
| Password hashing | bcrypt implementation | Supabase Auth | Secure by default, handles salting |
| Session management | Custom session table | Supabase Auth | Built-in refresh, secure cookies |
| Email verification | Custom email flow | Supabase Auth | Templates, rate limiting |
| Auth guards | Manual token checking | @nestjs/passport | Integration with NestJS DI |
| Role metadata | Custom table | SetMetadata + Reflector | NestJS standard pattern |
| User sync | Polling or manual | Database trigger | Real-time, transactional |

**Key insight:** Supabase Auth handles the hard parts (passwords, sessions, email). Your backend only needs to validate tokens and manage app-specific user data.

## Common Pitfalls

### Pitfall 1: Wrong JWT Secret
**What goes wrong:** "Invalid signature" errors on all authenticated requests
**Why it happens:** Using anon key instead of JWT secret
**How to avoid:** Get JWT secret from Supabase Dashboard > Settings > API > JWT Settings > JWT Secret
**Warning signs:** Auth works in frontend but fails in backend

### Pitfall 2: Not Syncing Users to Public Schema
**What goes wrong:** Can't add app-specific fields (role, profile data) to users
**Why it happens:** Prisma can't access auth schema, auth.users is Supabase-managed
**How to avoid:** Create public.users table, sync via trigger on auth.users INSERT
**Warning signs:** Need to query auth schema directly for user data

### Pitfall 3: Trusting Frontend Role
**What goes wrong:** Users can escalate privileges by modifying frontend
**Why it happens:** Reading role from JWT user_metadata (user-writable)
**How to avoid:** Store role in your User table (backend-controlled), validate there
**Warning signs:** Role stored in user_metadata, not app_metadata

### Pitfall 4: Guard Order Matters
**What goes wrong:** RolesGuard runs before AuthGuard, user undefined
**Why it happens:** Global guards execute in registration order
**How to avoid:** Register AuthGuard first, then RolesGuard in APP_GUARD providers
**Warning signs:** "Cannot read property 'role' of undefined" in RolesGuard

### Pitfall 5: Forgetting @Public() on Auth Endpoints
**What goes wrong:** Can't login because login endpoint requires auth
**Why it happens:** Global auth guard blocks all routes by default
**How to avoid:** Add @Public() decorator to login, register, health endpoints
**Warning signs:** 401 on login/register endpoints

### Pitfall 6: Not Handling BOTH Role
**What goes wrong:** Users with BOTH role can't access TENANT or LANDLORD routes
**Why it happens:** Strict role check doesn't account for multi-role users
**How to avoid:** In RolesGuard, if user.role === BOTH, allow access to all role-specific routes
**Warning signs:** Users switching between roles get 403 errors

## Code Examples

Verified patterns from official sources:

### Auth Module Setup
```typescript
// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { SupabaseStrategy } from './strategies/supabase.strategy';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase' }),
    UsersModule,
  ],
  providers: [SupabaseStrategy, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
```

### Global Guard Registration
```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [AuthModule, ...],
  providers: [
    // Order matters: AuthGuard first, then RolesGuard
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
```

### Users Controller with Auth
```typescript
// src/users/users.controller.ts
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { User } from '@prisma/client';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(userId, dto);
  }

  @Patch('me/role')
  @Roles(Role.BOTH)
  @ApiOperation({ summary: 'Switch active role (BOTH users only)' })
  switchRole(
    @CurrentUser('id') userId: string,
    @Body('activeRole') activeRole: Role.TENANT | Role.LANDLORD,
  ) {
    return this.usersService.setActiveRole(userId, activeRole);
  }
}
```

### Users Service
```typescript
// src/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async setActiveRole(userId: string, activeRole: Role.TENANT | Role.LANDLORD) {
    // For users with BOTH role, track which role they're currently using
    // Could store in session or as activeRole field
    return this.prisma.user.update({
      where: { id: userId },
      data: { activeRole },
    });
  }
}
```

### Environment Variables
```env
# Add to .env.example
# Supabase Auth
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="eyJ..."
SUPABASE_JWT_SECRET="your-jwt-secret-from-dashboard"
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| getSession() for verification | getUser() or getClaims() | 2024 | Security fix, prevents trusting tampered tokens |
| HS256 JWT signing | Asymmetric (RS256/ES256) | 2024 | Better security, key rotation |
| Manual token refresh | Supabase handles automatically | Always | Less client code |
| @nestjs/jwt for signing | Supabase Auth for signing | N/A | Backend only verifies, not signs |

**Deprecated/outdated:**
- `supabase.auth.session()` - Replaced by `getSession()`
- Manual password handling - Always use Supabase Auth
- Storing JWT secret in code - Environment variables only

## Open Questions

Things that couldn't be fully resolved:

1. **Active Role for BOTH Users**
   - What we know: Users with BOTH role need to switch context between TENANT/LANDLORD
   - What's unclear: Best way to persist active role (database field vs session)
   - Recommendation: Add `activeRole` field to User model, default to TENANT

2. **Frontend Token Handling**
   - What we know: Frontend handles Supabase auth, sends token to backend
   - What's unclear: Whether frontend already handles token refresh
   - Recommendation: Frontend should use `supabase.auth.getSession()` and send `access_token`

## Sources

### Primary (HIGH confidence)
- [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/jwts) - JWT structure, verification
- [Supabase JWT Claims Reference](https://supabase.com/docs/guides/auth/jwt-fields) - All available claims
- [Supabase User Management](https://supabase.com/docs/guides/auth/managing-user-data) - Profile sync pattern
- [NestJS Authentication](https://docs.nestjs.com/security/authentication) - Passport integration
- [NestJS Custom Decorators](https://docs.nestjs.com/custom-decorators) - Parameter decorators

### Secondary (MEDIUM confidence)
- [hiro1107/nestjs-supabase-auth](https://github.com/hiro1107/nestjs-supabase-auth) - Strategy pattern reference
- [DEV.to - Custom RBAC in NestJS](https://dev.to/imzihad21/custom-role-based-access-control-in-nestjs-using-custom-guards-jol) - RBAC implementation
- [DEV.to - Exclude routes from AuthGuard](https://dev.to/dannypule/exclude-route-from-nest-js-authgaurd-h0) - Public decorator pattern
- [nest-supabase-guard](https://github.com/MichaelMilstead/nest-supabase-guard) - Guard implementation reference

### Tertiary (LOW confidence)
- None - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official NestJS/Supabase patterns
- Architecture: HIGH - Follows NestJS conventions, verified patterns
- Pitfalls: HIGH - Documented in official guides and community discussions
- User sync: HIGH - Official Supabase documentation

**Research date:** 2026-01-25
**Valid until:** 2026-02-25 (30 days - stable technologies)
