# Configuración de Supabase - Backend NestJS

Este documento detalla toda la configuración realizada para integrar Supabase con el backend NestJS.

---

## 1. Variables de Entorno

### Archivo `.env`

```env
# Supabase PostgreSQL - Transaction Pooler (para aplicación)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-west-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase PostgreSQL - Direct connection (para migraciones)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-us-west-2.pooler.supabase.com:5432/postgres"

# Supabase Auth
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[tu-anon-key]"
SUPABASE_JWKS_URL="https://[project-ref].supabase.co/auth/v1/.well-known/jwks.json"

# Application
PORT=3000
NODE_ENV=development
```

### Dónde obtener las credenciales en Supabase:

| Variable | Ubicación en Supabase Dashboard |
|----------|--------------------------------|
| `DATABASE_URL` | Settings > Database > Connection string > Transaction pooler (puerto 6543) |
| `DIRECT_URL` | Settings > Database > Connection string > Direct connection (puerto 5432) |
| `SUPABASE_URL` | Settings > API > URL |
| `SUPABASE_ANON_KEY` | Settings > API > anon (public) key |
| `SUPABASE_JWKS_URL` | Construir: `https://[project-ref].supabase.co/auth/v1/.well-known/jwks.json` |

---

## 2. Dependencias Instaladas

```bash
# Autenticación con Passport y JWT
npm install @nestjs/passport passport passport-jwt jwks-rsa

# Tipos para TypeScript
npm install -D @types/passport-jwt

# Base de datos
npm install @prisma/client pg
npm install -D prisma
```

---

## 3. Configuración de Prisma

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

enum Role {
  TENANT
  LANDLORD
  BOTH
}

model User {
  id         String   @id @db.Uuid
  email      String   @unique
  role       Role     @default(TENANT)
  activeRole Role?    @map("active_role")
  firstName  String?  @map("first_name")
  lastName   String?  @map("last_name")
  phone      String?
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("users")
}
```

### `prisma.config.ts`

```typescript
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Usa DIRECT_URL para migraciones (evita el pooler que causa cuelgues)
    url: process.env["DIRECT_URL"] || process.env["DATABASE_URL"],
  },
});
```

**Importante:** Usar `DIRECT_URL` (puerto 5432) para `prisma db push` porque el pooler (puerto 6543) causa que el comando se cuelgue.

---

## 4. Trigger de Sincronización de Usuarios

### Ejecutar manualmente en Supabase SQL Editor

Archivo: `supabase/migrations/00001_user_sync_trigger.sql`

```sql
-- Función que maneja la creación de usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (
    id, email, role, first_name, last_name, created_at, updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      CASE
        WHEN NEW.raw_user_meta_data ->> 'role' IN ('TENANT', 'LANDLORD', 'BOTH')
        THEN (NEW.raw_user_meta_data ->> 'role')::"Role"
        ELSE NULL
      END,
      'TENANT'::"Role"
    ),
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$;

-- Trigger que se ejecuta al crear usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Pasos:**
1. Ir a Supabase Dashboard > SQL Editor
2. Pegar el código SQL
3. Ejecutar

---

## 5. Validación de Variables de Entorno

### `src/config/env.validation.ts`

```typescript
import { plainToInstance } from 'class-transformer';
import { IsNotEmpty, IsString, IsUrl, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsUrl()
  DATABASE_URL: string;

  @IsUrl()
  DIRECT_URL: string;

  @IsUrl()
  SUPABASE_URL: string;

  @IsNotEmpty()
  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsUrl()
  SUPABASE_JWKS_URL: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```

### `src/config/config.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
  ],
})
export class ConfigModule {}
```

---

## 6. Estrategia de Autenticación JWT

### `src/auth/strategies/supabase.strategy.ts`

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import { PrismaService } from '../../prisma/prisma.service';
import { User } from '@prisma/client';

interface SupabaseJwtPayload {
  sub: string;      // UUID del usuario
  email?: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
  role: string;     // 'authenticated' o 'anon'
}

@Injectable()
export class SupabaseStrategy extends PassportStrategy(Strategy, 'supabase') {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const supabaseUrl = configService.get<string>('SUPABASE_URL');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: `${supabaseUrl}/auth/v1`,
      algorithms: ['ES256'],  // Algoritmo usado por Supabase
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: configService.get<string>('SUPABASE_JWKS_URL'),
      }),
    });
  }

  async validate(payload: SupabaseJwtPayload): Promise<User> {
    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException(
        'User not found. Please ensure your account is set up correctly.',
      );
    }

    return user;
  }
}
```

**Puntos clave:**
- Usa `ES256` como algoritmo (el que usa Supabase)
- Obtiene la clave pública desde JWKS (no necesita secret hardcoded)
- Valida que el usuario exista en `public.users`

---

## 7. Guards de Autenticación

### `src/auth/guards/supabase-auth.guard.ts`

```typescript
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
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

### `src/auth/guards/roles.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { User } from '@prisma/client';
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
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // BOTH tiene acceso a todo
    if (user.role === Role.BOTH) {
      return true;
    }

    const hasRole = requiredRoles.includes(user.role as Role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
```

---

## 8. Decoradores

### `src/auth/decorators/public.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### `src/auth/decorators/roles.decorator.ts`

```typescript
import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

### `src/auth/decorators/current-user.decorator.ts`

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    return data ? user[data] : user;
  },
);
```

### `src/common/enums/role.enum.ts`

```typescript
export enum Role {
  TENANT = 'TENANT',
  LANDLORD = 'LANDLORD',
  BOTH = 'BOTH',
}
```

---

## 9. Módulo de Autenticación

### `src/auth/auth.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { SupabaseStrategy } from './strategies/supabase.strategy';
import { SupabaseAuthGuard } from './guards/supabase-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'supabase' }),
    PrismaModule,
  ],
  providers: [SupabaseStrategy, SupabaseAuthGuard, RolesGuard],
  exports: [SupabaseAuthGuard, RolesGuard],
})
export class AuthModule {}
```

---

## 10. Registro Global de Guards

### `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SupabaseAuthGuard } from './auth/guards/supabase-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';

@Module({
  imports: [ConfigModule, PrismaModule, AuthModule],
  providers: [
    // ORDEN IMPORTANTE: Auth primero, luego Roles
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

---

## 11. Uso en Controladores

### Ejemplo de uso de los decoradores:

```typescript
import { Controller, Get, Patch, Body } from '@nestjs/common';
import { User } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('users')
export class UsersController {
  // Ruta pública (sin autenticación)
  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  // Ruta protegida (requiere JWT válido)
  @Get('me')
  getProfile(@CurrentUser() user: User) {
    return user;
  }

  // Ruta restringida por rol
  @Roles(Role.LANDLORD)
  @Get('properties')
  getProperties(@CurrentUser() user: User) {
    // Solo LANDLORD o BOTH pueden acceder
    return { userId: user.id };
  }

  // Obtener solo el ID del usuario
  @Get('my-id')
  getMyId(@CurrentUser('id') userId: string) {
    return { id: userId };
  }
}
```

---

## 12. Flujo de Autenticación

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Usuario se registra/login con Supabase Auth                 │
│  2. Supabase retorna access_token (JWT)                         │
│  3. Frontend guarda el token                                    │
│  4. Envía requests con: Authorization: Bearer <token>           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  1. SupabaseAuthGuard extrae JWT del header                     │
│  2. SupabaseStrategy valida firma con JWKS                      │
│  3. Busca usuario en public.users por UUID (payload.sub)        │
│  4. Asigna User a request.user                                  │
│  5. RolesGuard verifica permisos de rol                         │
│  6. Controlador usa @CurrentUser() para acceder al usuario      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       SUPABASE                                   │
├─────────────────────────────────────────────────────────────────┤
│  - auth.users: Tabla de autenticación (gestionada por Supabase) │
│  - Trigger on_auth_user_created → public.users                  │
│  - JWKS endpoint para verificar JWTs                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 13. Comandos Útiles

```bash
# Generar cliente Prisma
npx prisma generate

# Sincronizar schema con BD (desarrollo)
npx prisma db push

# Ver datos en Prisma Studio
npx prisma studio

# Ejecutar el servidor
npm run start:dev
```

---

## 14. Solución de Problemas

### Error: `prisma db push` se cuelga

**Causa:** El connection pooler (puerto 6543) no es compatible con comandos de schema.

**Solución:** Usar `DIRECT_URL` en `prisma.config.ts` para migraciones.

### Error: `Algorithm not supported`

**Causa:** Supabase usa ES256, no RS256.

**Solución:** Configurar `algorithms: ['ES256']` en la estrategia JWT.

### Error: `User not found`

**Causa:** El trigger no creó el usuario en `public.users`.

**Solución:**
1. Verificar que el trigger existe en Supabase
2. Ejecutar manualmente el SQL del trigger
3. Verificar que la tabla `public.users` existe (`prisma db push`)

---

## 15. Estructura de Archivos

```
src/
├── auth/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── index.ts
│   ├── guards/
│   │   ├── roles.guard.ts
│   │   ├── supabase-auth.guard.ts
│   │   └── index.ts
│   ├── strategies/
│   │   ├── supabase.strategy.ts
│   │   └── index.ts
│   └── auth.module.ts
├── common/
│   └── enums/
│       └── role.enum.ts
├── config/
│   ├── config.module.ts
│   └── env.validation.ts
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
└── app.module.ts

prisma/
└── schema.prisma

supabase/
└── migrations/
    └── 00001_user_sync_trigger.sql
```
