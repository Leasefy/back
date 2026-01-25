# Phase 1: Foundation - Research

**Researched:** 2026-01-24
**Domain:** NestJS project scaffolding, Prisma + Supabase configuration, environment validation
**Confidence:** HIGH

## Summary

Phase 1 establishes the foundational NestJS project with Prisma ORM connected to Supabase PostgreSQL. The research confirms that NestJS 10.x with TypeScript strict mode, Prisma 5.x, and Supabase's connection pooler (Supavisor) are the correct choices for this project.

Key findings:
- Use `nest new --strict` for TypeScript strict mode from the start
- Configure dual DATABASE_URL (pooler) and DIRECT_URL (direct) for Prisma + Supabase
- Validate environment variables at startup using class-validator with ConfigModule
- Use @nestjs/terminus for health checks with custom Prisma health indicator
- Set up global exception filter for consistent error responses

**Primary recommendation:** Scaffold with `nest new arriendo-facil-api --strict --package-manager=npm`, then add Prisma, ConfigModule with validation, Swagger, health check, and global exception filter.

## Standard Stack

The established libraries/tools for this phase:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/core | ^10.4.x | Framework core | Latest stable, well-maintained |
| @nestjs/common | ^10.4.x | Common utilities | Required by NestJS |
| @nestjs/platform-express | ^10.4.x | HTTP adapter | Default, most ecosystem support |
| @nestjs/config | ^3.2.x | Environment config | Official module, validated patterns |
| @nestjs/swagger | ^7.4.x | OpenAPI docs | Official module, decorator-based |
| @nestjs/terminus | ^10.x | Health checks | Official module, Kubernetes-ready |
| @prisma/client | ^5.19.x | Database ORM | Type-safe, consistent with frontend |
| prisma | ^5.19.x | CLI & migrations | Required for Prisma workflow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | ^0.14.x | DTO validation | All request validation |
| class-transformer | ^0.5.x | DTO transformation | With class-validator |
| swagger-ui-express | ^5.x | Swagger UI | Serve API docs |
| reflect-metadata | ^0.2.x | Decorator support | Required by NestJS |
| rxjs | ^7.8.x | Reactive patterns | Required by NestJS |
| @supabase/supabase-js | ^2.45.x | Supabase client | For Auth/Storage (Phase 2+) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Express | Fastify | Fastify faster but smaller ecosystem |
| Prisma | Drizzle ORM | Drizzle more performant but frontend uses Prisma |
| class-validator | Zod | Zod more modern but less NestJS integration |
| npm | pnpm | pnpm faster but has build script warnings with NestJS |

**Installation:**
```bash
# Scaffold project
npx @nestjs/cli@latest new arriendo-facil-api --strict --package-manager=npm

# Core dependencies
npm install @nestjs/config @nestjs/swagger @nestjs/terminus
npm install @prisma/client class-validator class-transformer
npm install swagger-ui-express

# Dev dependencies
npm install -D prisma
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── main.ts                    # Bootstrap, Swagger, global pipes
├── app.module.ts              # Root module
├── common/
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── decorators/            # Custom decorators (Phase 2+)
│   ├── guards/                # Auth guards (Phase 2+)
│   └── interceptors/          # Response transformers (future)
├── config/
│   ├── config.module.ts       # ConfigModule wrapper
│   ├── configuration.ts       # Configuration factory
│   └── env.validation.ts      # Environment validation class
├── database/
│   ├── prisma.module.ts       # Prisma module
│   └── prisma.service.ts      # PrismaClient wrapper
├── health/
│   ├── health.module.ts       # Health check module
│   └── health.controller.ts   # Health endpoints
└── modules/                   # Feature modules (Phase 2+)
    └── .gitkeep
prisma/
└── schema.prisma              # Database schema
```

### Pattern 1: Environment Validation with class-validator
**What:** Validate environment variables at startup, fail fast if invalid
**When to use:** Always - prevents runtime errors from missing config
**Example:**
```typescript
// src/config/env.validation.ts
import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, validateSync, Min, Max } from 'class-validator';

export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  DIRECT_URL: string;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  NODE_ENV: string = 'development';
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errors = validateSync(validatedConfig, { skipMissingProperties: false });
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
```
**Source:** [NestJS Configuration Docs](https://docs.nestjs.com/techniques/configuration), [Medium - NestJS Environment Variables](https://mdjamilkashemporosh.medium.com/nestjs-environment-variables-best-practices-for-validating-and-structuring-configs-a24a8e8d93c1)

### Pattern 2: PrismaService with Lifecycle Hooks
**What:** Wrap PrismaClient with NestJS lifecycle management
**When to use:** Always when using Prisma with NestJS
**Example:**
```typescript
// src/database/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```
**Source:** [Prisma NestJS Guide](https://www.prisma.io/docs/guides/nestjs)

### Pattern 3: Global Exception Filter
**What:** Catch all exceptions, format consistently, log appropriately
**When to use:** Always - ensures consistent API error responses
**Example:**
```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: typeof message === 'string' ? message : (message as any).message || message,
    });
  }
}
```
**Source:** [NestJS Exception Filters](https://docs.nestjs.com/exception-filters), [DEV - Global Exception Filter](https://dev.to/nurulislamrimon/creating-a-global-exception-filter-in-nestjs-for-robust-error-handling-4a3n)

### Pattern 4: Health Check with Custom Prisma Indicator
**What:** Expose /health endpoint that verifies database connectivity
**When to use:** Production deployments, container orchestration
**Example:**
```typescript
// src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../database/prisma.service';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.prismaHealthCheck(),
    ]);
  }

  private async prismaHealthCheck(): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { database: { status: 'up' } };
    } catch (error) {
      return { database: { status: 'down', message: error.message } };
    }
  }
}
```
**Source:** [NestJS Terminus](https://github.com/nestjs/terminus), [wanago.io Health Checks](https://wanago.io/2021/10/11/api-nestjs-health-checks-terminus-datadog/)

### Anti-Patterns to Avoid
- **Fat controllers:** Keep controllers thin, delegate to services. Controllers should only handle HTTP concerns.
- **Manual instance creation:** Never `new SomeService()`. Always use dependency injection.
- **Unvalidated environment variables:** Always validate with class-validator at startup.
- **Catching exceptions without logging:** Always log the stack trace before formatting response.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Config loading | Custom dotenv wrapper | @nestjs/config | Caching, validation, module integration |
| Environment validation | Manual checks | class-validator + validate() | Type-safe, declarative, reusable |
| API documentation | Manual OpenAPI JSON | @nestjs/swagger | Decorator-based, auto-generated |
| Health checks | Custom /health handler | @nestjs/terminus | Kubernetes-ready, extensible indicators |
| Exception formatting | try/catch everywhere | Global ExceptionFilter | Centralized, consistent, maintainable |
| Database connection | Raw pg client | Prisma + PrismaService | Type-safe, migrations, connection pooling |
| Connection pooling | Manual pool management | Supabase Supavisor | Built-in, no extra Redis needed |

**Key insight:** NestJS has official modules for most infrastructure concerns. Using them ensures compatibility with future versions and reduces maintenance burden.

## Common Pitfalls

### Pitfall 1: Not Using --strict Flag
**What goes wrong:** TypeScript allows implicit any, null checks disabled, leading to runtime errors
**Why it happens:** Default NestJS scaffold has `strict: false` for easier onboarding
**How to avoid:** Always use `nest new project-name --strict` or enable strict in tsconfig.json immediately
**Warning signs:** No type errors when accessing possibly-undefined properties

### Pitfall 2: Wrong Prisma Connection String for Supabase
**What goes wrong:** Migrations fail with "Can't reach database server" or prepared statement errors
**Why it happens:** Using pooler URL for migrations, or missing `pgbouncer=true` parameter
**How to avoid:** Configure both DATABASE_URL (port 6543 + `?pgbouncer=true`) and DIRECT_URL (port 5432)
**Warning signs:** `npx prisma migrate dev` fails but application queries work

### Pitfall 3: Missing Environment Validation
**What goes wrong:** Application starts but crashes later when accessing undefined config
**Why it happens:** ConfigModule loads without validation, typos go unnoticed
**How to avoid:** Always provide `validate` function to ConfigModule.forRoot()
**Warning signs:** Application starts with undefined DATABASE_URL

### Pitfall 4: Not Registering Global Filter Properly
**What goes wrong:** Some exceptions bypass the filter, inconsistent error responses
**Why it happens:** Using `app.useGlobalFilters()` without module-based registration
**How to avoid:** Register via APP_FILTER provider in AppModule for DI support
**Warning signs:** Logger service undefined in filter, some errors not formatted

### Pitfall 5: Circular Dependency in Modules
**What goes wrong:** Application fails to start with cryptic DI errors
**Why it happens:** Module A imports Module B which imports Module A
**How to avoid:** Use forwardRef() sparingly, prefer service-level DI, restructure modules
**Warning signs:** "Nest cannot resolve dependencies" errors mentioning circular references

### Pitfall 6: Not Disconnecting Prisma on Shutdown
**What goes wrong:** Connection leaks, database connection limit reached
**Why it happens:** Missing onModuleDestroy lifecycle hook
**How to avoid:** Always implement OnModuleDestroy and call $disconnect()
**Warning signs:** "Max client connections reached" errors in Supabase logs

## Code Examples

Verified patterns from official sources:

### main.ts Complete Setup
```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Arriendo Facil API')
    .setDescription('Backend API for Arriendo Facil rental marketplace')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
}
bootstrap();
```

### ConfigModule Setup
```typescript
// src/config/config.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validate } from './env.validation';

@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      validate,
      isGlobal: true,
      cache: true,
    }),
  ],
})
export class ConfigModule {}
```

### Prisma Schema for Supabase
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// Models will be added in Phase 2+
```

### Environment File Template
```env
# .env.example
# Supabase PostgreSQL - Transaction Pooler (for application)
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase PostgreSQL - Direct (for migrations)
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"

# Application
PORT=3000
NODE_ENV=development
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PgBouncer separate | Supavisor built-in | 2023 | No need for separate pooler config |
| `@nestjs/swagger` CLI plugin manual | Auto-decorators via nest-cli.json | 2024 | Less boilerplate in DTOs |
| Prisma `$connect()` manual | Via OnModuleInit hook | Always | Cleaner lifecycle management |
| Environment loaded without validation | class-validator integration | Common pattern | Fail-fast on missing config |

**Deprecated/outdated:**
- Using port 5432 for application connections with Supabase (use 6543 transaction pooler)
- `enableShutdownHooks` workaround in Prisma (fixed in recent versions)
- Separate PgBouncer container for connection pooling (Supavisor handles it)

## Open Questions

Things that couldn't be fully resolved:

1. **Prisma version for frontend compatibility**
   - What we know: Frontend uses Prisma schema, backend should match
   - What's unclear: Exact Prisma version in frontend package.json (not checked)
   - Recommendation: Verify frontend Prisma version and align

2. **Redis for BullMQ in later phases**
   - What we know: Phase 5 will need BullMQ which requires Redis
   - What's unclear: Whether to add Redis config now or defer
   - Recommendation: Defer Redis config to Phase 5, keep foundation minimal

## Sources

### Primary (HIGH confidence)
- [NestJS Official Documentation - Configuration](https://docs.nestjs.com/techniques/configuration)
- [NestJS Official Documentation - Exception Filters](https://docs.nestjs.com/exception-filters)
- [NestJS Official Documentation - OpenAPI](https://docs.nestjs.com/openapi/introduction)
- [Prisma + Supabase Integration](https://www.prisma.io/docs/orm/overview/databases/supabase)
- [Supabase Prisma Guide](https://supabase.com/docs/guides/database/prisma)
- [NestJS Terminus](https://github.com/nestjs/terminus)

### Secondary (MEDIUM confidence)
- [DEV - Robust Environment Variable Validation](https://dev.to/amirfakour/robust-environment-variable-validation-in-nestjs-applications-4om9)
- [Prisma NestJS Guide](https://www.prisma.io/docs/guides/nestjs)
- [Supabase Prisma Troubleshooting](https://supabase.com/docs/guides/database/prisma/prisma-troubleshooting)
- [Medium - 10 Common NestJS Mistakes](https://medium.com/@enguerrandpp/10-common-mistakes-to-avoid-when-using-nest-js-ea96f5f460b0)

### Tertiary (LOW confidence)
- None - all findings verified with official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official NestJS modules, well-documented patterns
- Architecture: HIGH - Follows official NestJS conventions
- Pitfalls: HIGH - Documented in official troubleshooting guides
- Prisma + Supabase: HIGH - Official Prisma documentation verified

**Research date:** 2026-01-24
**Valid until:** 2026-02-24 (30 days - stable technologies)
