# Stack Research: NestJS Backend 2026

**Date:** 2026-01-24
**Confidence:** HIGH

---

## Executive Summary

Stack recomendado para backend NestJS + Supabase en 2026:

| Capa | Tecnología | Versión |
|------|------------|---------|
| Framework | NestJS | 10.x |
| ORM | Prisma | 5.x |
| Database | PostgreSQL (Supabase) | 15+ |
| Auth | Supabase Auth | - |
| Storage | Supabase Storage | - |
| Queue | BullMQ + Redis | 5.x |
| Email | Resend | - |
| Validation | class-validator + class-transformer | - |
| Docs | Swagger/OpenAPI | - |

---

## Core Framework

### NestJS 10.x
**Confidence:** HIGH

NestJS es el framework enterprise más maduro para Node.js:
- Arquitectura modular con Dependency Injection
- Decoradores para controllers, guards, interceptors
- Soporte nativo para microservicios
- Ecosystem maduro (>50k stars GitHub)

**Versión actual:** 10.4.x (Enero 2026)

**NO usar:**
- Express puro (sin estructura, difícil escalar)
- Fastify standalone (menos ecosystem que NestJS)

---

## Database & ORM

### Prisma 5.x + Supabase PostgreSQL
**Confidence:** HIGH

**Por qué Prisma sobre TypeORM/Drizzle:**
- Type-safety superior (genera tipos desde schema)
- Mejor DX con Prisma Studio
- Consistente con frontend (ya usa Prisma schema)
- Migrations robustas

**Configuración con Supabase:**
```env
DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
```

**Best Practices:**
- Usar connection pooler de Supabase (pgbouncer)
- `DIRECT_URL` para migrations
- Prisma service como módulo global
- Repository pattern sobre Prisma Client

**Alternativa considerada - Drizzle ORM:**
- Más performante (queries SQL directos)
- Mejor para proyectos nuevos sin legacy
- PERO: Frontend ya usa Prisma, mantener consistencia

---

## Authentication

### Supabase Auth
**Confidence:** HIGH

**Integración con NestJS:**
```typescript
// supabase.guard.ts
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw new UnauthorizedException();
    request.user = user;
    return true;
  }
}
```

**Features incluidos:**
- Magic links / OTP
- OAuth (Google, GitHub, etc.)
- Row Level Security (RLS)
- JWT tokens automáticos

---

## File Storage

### Supabase Storage
**Confidence:** HIGH

**Patrones recomendados:**
- Buckets separados por tipo (documents, images)
- Signed URLs para acceso seguro (expiran)
- RLS policies para control de acceso
- Transformaciones de imagen on-the-fly

```typescript
// Subir documento
const { data, error } = await supabase.storage
  .from('documents')
  .upload(`applications/${applicationId}/${filename}`, file);

// Obtener URL firmada (1 hora)
const { data: { signedUrl } } = await supabase.storage
  .from('documents')
  .createSignedUrl(path, 3600);
```

---

## Background Jobs

### BullMQ + Redis
**Confidence:** HIGH

BullMQ es el estándar para queues en NestJS:

**Instalación:**
```bash
npm install @nestjs/bullmq bullmq ioredis
```

**Configuración:**
```typescript
// app.module.ts
BullModule.forRoot({
  connection: {
    host: 'localhost',
    port: 6379,
  },
}),
BullModule.registerQueue({ name: 'scoring' }),
BullModule.registerQueue({ name: 'notifications' }),
```

**Processor pattern:**
```typescript
@Processor('scoring')
export class ScoringProcessor extends WorkerHost {
  async process(job: Job<ScoringJobData>): Promise<RiskScoreResult> {
    // Ejecutar scoring
  }
}
```

**Best Practices:**
- Dead Letter Queue (DLQ) para jobs fallidos
- Bull Board para monitoreo visual
- Retry con backoff exponencial
- Limpiar jobs completados periódicamente

**Alternativa - Supabase Edge Functions:**
- Sin Redis (serverless)
- PERO: Menos control, debugging más difícil

---

## Email

### Resend
**Confidence:** HIGH

Resend es el servicio de email moderno recomendado:
- API simple y clara
- React Email para templates
- 3,000 emails/mes gratis
- Excelente deliverability

**Instalación:**
```bash
npm install nestjs-resend resend
```

**Configuración:**
```typescript
// email.module.ts
ResendModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: (config: ConfigService) => ({
    apiKey: config.get('RESEND_API_KEY'),
  }),
  inject: [ConfigService],
}),
```

**Templates:**
- Usar React Email para templates type-safe
- O HTML templates con handlebars

---

## Validation

### class-validator + class-transformer
**Confidence:** HIGH

Estándar en NestJS para validación de DTOs:

```typescript
// create-application.dto.ts
export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsNumber()
  @Min(0)
  monthlySalary: number;

  @IsEnum(EmploymentStatus)
  employmentStatus: EmploymentStatus;
}
```

**Global validation pipe:**
```typescript
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));
```

**Alternativa - Zod:**
- Más moderno, mejor inference
- PERO: Menos integración nativa con NestJS decorators

---

## API Documentation

### Swagger/OpenAPI
**Confidence:** HIGH

```bash
npm install @nestjs/swagger swagger-ui-express
```

```typescript
// main.ts
const config = new DocumentBuilder()
  .setTitle('Arriendo Fácil API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();
const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api', app, document);
```

---

## Testing

### Jest + Supertest
**Confidence:** HIGH

**Stack de testing:**
- Jest (unit tests)
- Supertest (e2e tests)
- Prisma mocking con `jest-mock-extended`

**Estructura:**
```
src/
  modules/
    properties/
      properties.service.ts
      properties.service.spec.ts  # Unit tests
  test/
    properties.e2e-spec.ts        # E2E tests
```

---

## Project Structure

### Modular Architecture
**Confidence:** HIGH

```
src/
├── main.ts
├── app.module.ts
├── common/
│   ├── decorators/
│   ├── filters/
│   ├── guards/
│   ├── interceptors/
│   └── pipes/
├── config/
│   └── configuration.ts
├── database/
│   ├── prisma.module.ts
│   └── prisma.service.ts
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── guards/
│   │   └── dto/
│   ├── properties/
│   ├── applications/
│   ├── candidates/
│   ├── scoring/
│   │   ├── scoring.module.ts
│   │   ├── scoring.service.ts
│   │   ├── engines/
│   │   │   ├── feature-builder.ts
│   │   │   ├── financial-model.ts
│   │   │   ├── stability-model.ts
│   │   │   └── document-analyzer.ts
│   │   └── processors/
│   │       └── scoring.processor.ts
│   ├── documents/
│   ├── notifications/
│   └── users/
├── shared/
│   ├── types/
│   └── utils/
└── prisma/
    └── schema.prisma
```

---

## Dependencies Summary

```json
{
  "dependencies": {
    "@nestjs/common": "^10.4.0",
    "@nestjs/core": "^10.4.0",
    "@nestjs/platform-express": "^10.4.0",
    "@nestjs/config": "^3.2.0",
    "@nestjs/swagger": "^7.4.0",
    "@nestjs/bullmq": "^10.2.0",
    "@prisma/client": "^5.19.0",
    "@supabase/supabase-js": "^2.45.0",
    "bullmq": "^5.12.0",
    "class-validator": "^0.14.1",
    "class-transformer": "^0.5.1",
    "nestjs-resend": "^1.5.0",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "prisma": "^5.19.0",
    "@nestjs/testing": "^10.4.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

---

## Sources

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [Prisma + Supabase Integration](https://supabase.com/partners/integrations/prisma)
- [NestJS + Prisma Guide](https://www.prisma.io/docs/guides/nestjs)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [NestJS Queues](https://docs.nestjs.com/techniques/queues)
- [Resend Node.js](https://resend.com/nodejs)
- [nestjs-resend GitHub](https://github.com/jiangtaste/nestjs-resend)
- [2025 NestJS Roadmap](https://dev.to/tak089/nestjs-roadmap-for-2025-5jj)
