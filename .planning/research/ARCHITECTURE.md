# Architecture Research: NestJS + Supabase

**Date:** 2026-01-24
**Confidence:** HIGH

---

## Executive Summary

Arquitectura modular con separación clara entre capas:
- **Controllers** - HTTP handlers
- **Services** - Business logic
- **Repositories** - Data access (Prisma)
- **Processors** - Background jobs (BullMQ)
- **Engines** - Domain-specific logic (Scoring)

---

## Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              NestJS Application                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │ Properties  │  │Applications │  │  Scoring    │        │
│  │   Module    │  │   Module    │  │   Module    │  │   Module    │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│         │                │                │                │                │
│  ┌──────▼──────────────────────────────────────────────────▼──────┐        │
│  │                        Service Layer                           │        │
│  │  AuthService, PropertyService, ApplicationService, ScoringService       │
│  └──────┬──────────────────────────────────────────────────┬──────┘        │
│         │                                                  │                │
│  ┌──────▼──────┐                              ┌────────────▼────────────┐  │
│  │   Prisma    │                              │    Scoring Engines      │  │
│  │   Service   │                              │  ┌──────────────────┐   │  │
│  │             │                              │  │ FeatureBuilder   │   │  │
│  │ Repository  │                              │  │ IntegrityEngine  │   │  │
│  │   Pattern   │                              │  │ FinancialModel   │   │  │
│  └──────┬──────┘                              │  │ StabilityModel   │   │  │
│         │                                      │  │ HistoryModel     │   │  │
│         │                                      │  │ DocumentAnalyzer │   │  │
│         │                                      │  │ Aggregator       │   │  │
│         │                                      │  └──────────────────┘   │  │
│         │                                      └────────────┬────────────┘  │
│         │                                                   │               │
│  ┌──────▼───────────────────────────────────────────────────▼──────┐       │
│  │                      Background Jobs (BullMQ)                    │       │
│  │    ScoringProcessor    NotificationProcessor    CleanupProcessor │       │
│  └──────┬───────────────────────────────────────────────────┬──────┘       │
│         │                                                   │               │
└─────────┼───────────────────────────────────────────────────┼───────────────┘
          │                                                   │
          ▼                                                   ▼
┌─────────────────────┐                         ┌─────────────────────┐
│      Supabase       │                         │    External APIs    │
│  ┌───────────────┐  │                         │  ┌───────────────┐  │
│  │  PostgreSQL   │  │                         │  │  Claude API   │  │
│  │   (Prisma)    │  │                         │  │  (Anthropic)  │  │
│  ├───────────────┤  │                         │  ├───────────────┤  │
│  │     Auth      │  │                         │  │    Resend     │  │
│  ├───────────────┤  │                         │  │   (Email)     │  │
│  │    Storage    │  │                         │  └───────────────┘  │
│  ├───────────────┤  │                         └─────────────────────┘
│  │   Realtime    │  │
│  └───────────────┘  │
└─────────────────────┘
```

---

## Module Structure

### Recommended Organization

```
src/
├── main.ts                          # Bootstrap
├── app.module.ts                    # Root module
│
├── common/                          # Shared utilities
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   └── roles.decorator.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── guards/
│   │   ├── supabase-auth.guard.ts
│   │   └── roles.guard.ts
│   ├── interceptors/
│   │   └── transform.interceptor.ts
│   └── pipes/
│       └── parse-uuid.pipe.ts
│
├── config/
│   ├── config.module.ts
│   ├── configuration.ts
│   └── validation.ts
│
├── database/
│   ├── database.module.ts
│   ├── prisma.service.ts
│   └── prisma.extension.ts          # Soft delete, etc.
│
├── modules/
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   └── supabase.strategy.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── register.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.repository.ts
│   │   └── dto/
│   │
│   ├── properties/
│   │   ├── properties.module.ts
│   │   ├── properties.controller.ts
│   │   ├── properties.service.ts
│   │   ├── properties.repository.ts
│   │   └── dto/
│   │       ├── create-property.dto.ts
│   │       ├── update-property.dto.ts
│   │       └── filter-property.dto.ts
│   │
│   ├── applications/
│   │   ├── applications.module.ts
│   │   ├── applications.controller.ts
│   │   ├── applications.service.ts
│   │   ├── applications.repository.ts
│   │   ├── state-machine/
│   │   │   ├── application.states.ts
│   │   │   └── application.transitions.ts
│   │   └── dto/
│   │
│   ├── documents/
│   │   ├── documents.module.ts
│   │   ├── documents.controller.ts
│   │   ├── documents.service.ts
│   │   └── storage/
│   │       └── supabase-storage.service.ts
│   │
│   ├── scoring/                     # Core differentiator
│   │   ├── scoring.module.ts
│   │   ├── scoring.service.ts       # Orchestrates scoring
│   │   ├── scoring.controller.ts
│   │   ├── engines/
│   │   │   ├── feature-builder.engine.ts
│   │   │   ├── integrity.engine.ts
│   │   │   ├── financial.engine.ts
│   │   │   ├── stability.engine.ts
│   │   │   ├── history.engine.ts
│   │   │   ├── document-analyzer.engine.ts
│   │   │   └── aggregator.engine.ts
│   │   ├── processors/
│   │   │   └── scoring.processor.ts
│   │   └── dto/
│   │       └── score-result.dto.ts
│   │
│   ├── candidates/
│   │   ├── candidates.module.ts
│   │   ├── candidates.controller.ts
│   │   ├── candidates.service.ts
│   │   └── dto/
│   │
│   └── notifications/
│       ├── notifications.module.ts
│       ├── notifications.service.ts
│       ├── processors/
│       │   └── email.processor.ts
│       └── templates/
│           ├── application-received.tsx
│           └── status-changed.tsx
│
├── shared/
│   ├── types/
│   │   ├── index.ts
│   │   └── pagination.ts
│   └── utils/
│       ├── hash.util.ts
│       └── date.util.ts
│
└── prisma/
    ├── schema.prisma
    ├── migrations/
    └── seed.ts
```

---

## Service Layer Patterns

### Repository Pattern

```typescript
// users.repository.ts
@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(data: CreateUserData): Promise<User> {
    return this.prisma.user.create({ data });
  }
}

// users.service.ts
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async getUser(id: string): Promise<User> {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
```

### Why Repository Pattern?
- Testability (mock repository, not Prisma)
- Single responsibility
- Query encapsulation
- Easy to switch data source

---

## Scoring Engine Architecture

### Pipeline Pattern

```typescript
// scoring.service.ts
@Injectable()
export class ScoringService {
  constructor(
    private readonly featureBuilder: FeatureBuilderEngine,
    private readonly integrityEngine: IntegrityEngine,
    private readonly financialEngine: FinancialEngine,
    private readonly stabilityEngine: StabilityEngine,
    private readonly historyEngine: HistoryEngine,
    private readonly documentAnalyzer: DocumentAnalyzerEngine,
    private readonly aggregator: AggregatorEngine,
  ) {}

  async calculateScore(application: Application): Promise<RiskScoreResult> {
    // 1. Extract features
    const features = await this.featureBuilder.extract(application);

    // 2. Run engines in parallel where possible
    const [integrity, financial, stability, history, documents] = await Promise.all([
      this.integrityEngine.evaluate(features),
      this.financialEngine.evaluate(features),
      this.stabilityEngine.evaluate(features),
      this.historyEngine.evaluate(features),
      this.documentAnalyzer.analyze(application.documents),
    ]);

    // 3. Aggregate
    const result = this.aggregator.aggregate({
      integrity,
      financial,
      stability,
      history,
      documents,
    });

    return result;
  }
}
```

### Engine Interface

```typescript
// engine.interface.ts
export interface ScoringEngine<TInput, TOutput> {
  evaluate(input: TInput): Promise<TOutput>;
}

export interface EngineResult {
  score: number;           // 0-100
  weight: number;          // Weight for aggregation
  drivers: string[];       // Reasons
  flags: RiskFlag[];       // Warnings
  confidence: number;      // 0-1
}
```

---

## Event-Driven Patterns

### For Scoring Pipeline

```typescript
// Using NestJS Events
@Injectable()
export class ApplicationsService {
  constructor(private readonly eventEmitter: EventEmitter2) {}

  async submitApplication(id: string): Promise<void> {
    // Update status
    await this.updateStatus(id, 'SUBMITTED');

    // Emit event for async processing
    this.eventEmitter.emit('application.submitted', { applicationId: id });
  }
}

// Listener
@Injectable()
export class ScoringListener {
  constructor(
    @InjectQueue('scoring') private scoringQueue: Queue,
  ) {}

  @OnEvent('application.submitted')
  async handleApplicationSubmitted(payload: { applicationId: string }) {
    await this.scoringQueue.add('calculate-score', payload);
  }
}
```

---

## Supabase Integration

### Auth Guard

```typescript
// supabase-auth.guard.ts
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) throw new UnauthorizedException();

    const { data: { user }, error } = await this.supabaseService.client.auth.getUser(token);

    if (error || !user) throw new UnauthorizedException();

    request.user = user;
    return true;
  }

  private extractToken(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
```

### Storage Service

```typescript
// supabase-storage.service.ts
@Injectable()
export class SupabaseStorageService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async upload(bucket: string, path: string, file: Buffer, contentType: string): Promise<string> {
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .upload(path, file, { contentType });

    if (error) throw new InternalServerErrorException('Upload failed');
    return data.path;
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw new InternalServerErrorException('Failed to generate URL');
    return data.signedUrl;
  }
}
```

---

## Error Handling

### Global Exception Filter

```typescript
// http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: Logger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException
      ? exception.getResponse()
      : 'Internal server error';

    this.logger.error(`${request.method} ${request.url}`, exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message,
    });
  }
}
```

---

## Build Order (Dependencies)

```
Phase 1: Foundation
├── Project scaffold (NestJS CLI)
├── Config module
├── Database module (Prisma + Supabase)
└── Common utilities

Phase 2: Auth & Users
├── Supabase Auth integration
├── Auth module (guards, decorators)
└── Users module

Phase 3: Properties
├── Properties CRUD
├── Image upload (Supabase Storage)
└── Filtering & pagination

Phase 4: Applications Core
├── Applications CRUD
├── State machine
└── Documents upload

Phase 5: Scoring Engine
├── Feature builder
├── Basic engines (financial, stability)
├── Aggregator
└── Queue integration

Phase 6: Document Analysis
├── Claude API integration
├── Document analyzer engine
└── Integration with scoring

Phase 7: Landlord Features
├── Candidates module
├── Decision actions
└── Notes

Phase 8: Notifications
├── Email service (Resend)
├── Templates
└── Notification queue

Phase 9: Polish
├── API documentation (Swagger)
├── Rate limiting
├── Logging & monitoring
```

---

## Sources

- [NestJS Official Documentation](https://docs.nestjs.com/)
- [NestJS Best Practices](https://docs.nestjs.com/faq/common-errors)
- [Clean Architecture with NestJS](https://blog.nashtechglobal.com/mastering-bullmq-in-nestjs-a-step-by-step-introduction-part-1/)
- [Supabase + NestJS](https://ititans.com/blog/backend-choices-baas-vs-supabase-vs-nestjs/)
- [Repository Pattern](https://docs.nestjs.com/recipes/sql-typeorm)
