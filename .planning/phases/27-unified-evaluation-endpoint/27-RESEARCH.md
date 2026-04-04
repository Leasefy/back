# Phase 27: Unified Evaluation Endpoint - Research

**Researched:** 2026-04-04
**Domain:** Async HTTP orchestration + tier-based pricing enforcement + DB persistence of external agent results
**Confidence:** HIGH

## Summary

Phase 27 is a NestJS orchestration layer that sits between the Leasify backend and an external agent microservice (`localhost:4000`). The landlord/inmobiliaria calls `POST /evaluations/:applicationId`, the backend validates the plan and credits/pricing, calls the micro, stores the result, and returns 202 immediately. A polling endpoint lets the client check when the run completes.

The critical design insight is that there is NO `@nestjs/axios` or `HttpModule` in the current codebase — zero HTTP client infrastructure exists. Phase 27 must introduce one. The idiomatic NestJS choice is `@nestjs/axios` (thin RxJS wrapper around Axios), but since every other async pattern in this codebase uses plain `async/await` (not Observables), using `node-fetch` or plain `fetch()` (Node 18+ built-in) is equally valid and avoids an extra dependency. Using the built-in `fetch` is the recommended path — no new package needed.

The pricing enforcement pattern already exists in `PlanEnforcementService` (uses `ScoringUsage` for monthly limits) and `AgentCreditsService.deductCredits()` (atomic balance decrement). Phase 27 mirrors this exact approach for evaluation credits: PRO gets a monthly evaluation counter (`EvaluationUsage` table or inline count query), STARTER and PRO pay per call, FLEX is free (credits-based model where `evaluationCreditPrice = 0` confirms unlimited free).

The async pattern (202 → poll) is new to this codebase but straightforward: the endpoint enqueues/starts the micro call, stores a `runId` returned by the micro in an `EvaluationResult` row with status `PENDING`, and a separate GET endpoint proxies `GET /tenant-scoring/:runId` to the micro and updates the DB when complete.

**Primary recommendation:** Build a standalone `EvaluationsModule` with three components: (1) Prisma models `EvaluationResult` + `EvaluationTransaction`, (2) a `AgentMicroClient` service wrapping Node's built-in `fetch`, (3) an `EvaluationService` that orchestrates validation → micro call → storage. Mount the controller under `/evaluations`. Import `AgentCreditsModule` + `SubscriptionsModule`.

## Codebase Discoveries

### Confirmed Existing State (code-verified)

- **`AgentCreditsService.deductCredits(userId, amount, applicationId)`** is ready and exported from `AgentCreditsModule`. Phase 27 calls it for STARTER/PRO payments.
- **`SubscriptionsService.getActiveSubscription(userId)`** and **`getUserPlanConfig(userId)`** are exported from `SubscriptionsModule`. These return the `SubscriptionPlanConfig` with `evaluationCreditPrice` field.
- **`evaluationCreditPrice`** is seeded in DB: STARTER=42000, PRO=21000, FLEX=0 (code-verified in `prisma/seed-plans.ts`).
- **No HTTP client library** exists in `package.json`. `@nestjs/axios` is not installed. Node 18+ `fetch` is available (no install needed).
- **No `EvaluationResult` or `EvaluationTransaction` model** exists in `prisma/schema.prisma` — both must be added in plan 27-01.
- **`Application` model** exists with `tenantId`, `personalInfo`, `employmentInfo`, `incomeInfo`, `referencesInfo` JSON fields and `documents` relation. These are the applicant data to forward to the micro.
- **`ApplicationDocument` model** has `storagePath` and `type` — documents to include in the micro payload.
- **`@Roles(Role.LANDLORD)` on the controller class** automatically grants AGENT role access (verified in `RolesGuard`: AGENT can access LANDLORD routes).
- **PRO monthly limit pattern**: `ScoringUsage` model with `userId_month_year` unique index and upsert increment is the exact pattern to replicate for `EvaluationUsage`.
- **FLEX plan**: `evaluationCreditPrice = 0` means FLEX users pay nothing and `AgentCredit.balance` is irrelevant for them (no deduction needed — confirmed by requirement "FLEX ilimitado gratis").
- **`SubscriptionsService.getActiveSubscription`** returns `null` for users with no active subscription. This is the check for EVAL-06 (no active subscription → 403).
- **The `STARTER` tier has no monthly evaluation limit** — only pays per use. Only PRO has the 30/month cap (EVAL-07).

### Tier Logic Summary (code-verified prices)

| Tier | evaluationCreditPrice | PRO limit | Deduct credits? | Require active subscription? |
|------|-----------------------|-----------|-----------------|------------------------------|
| STARTER | 42,000 COP | None | Yes (1 credit = 1 eval) | Yes |
| PRO | 21,000 COP | 30/month | Yes | Yes |
| FLEX | 0 | None | No | Yes (must have FLEX subscription) |

**Note:** "Pay per evaluation" in this model means `AgentCreditsService.deductCredits(userId, evaluationCreditPrice_in_credits, applicationId)`. Since `deductCredits` operates in "credits" (integer units), and STARTER buys credits at $42k each and PRO at $21k each, the deduction amount is always `1` (1 credit = 1 evaluation). The `evaluationCreditPrice` in the plan config records the COP price, not the credit count. The actual deduction is `1 credit` regardless of tier, because FLEX gets free and STARTER/PRO paid for credits that encode the tier price.

Wait — re-reading the requirements and the seed data more carefully: FLEX has `evaluationCreditPrice: 0` (unlimited free, no credits needed), STARTER has `evaluationCreditPrice: 42_000` and PRO has `evaluationCreditPrice: 21_000`. But `AgentCredit.balance` stores integer credits — not COP amounts. The pricing architecture is: STARTER/PRO users buy credit packs at their tier's price, then spend 1 credit per evaluation. FLEX users get unlimited free evaluations — no credit balance check. This means Phase 27 deducts **1 credit** from STARTER and PRO, and deducts **0 credits** from FLEX. The COP price differential is encoded at purchase time (STARTER paid 42k/credit, PRO paid 21k/credit). This is confirmed by `CREDIT_PACK_PRICES` which only has 4 sizes — the per-evaluation credit cost is always 1 unit.

### PRO Monthly Limit Implementation

PRO gets 30 evaluations/month. The existing `ScoringUsage` model pattern:
```prisma
model ScoringUsage {
  userId_month_year (unique composite)
  viewCount Int
}
```
Phase 27 needs an `EvaluationUsage` model or can query `EvaluationResult` directly by month. Querying `EvaluationResult` (count where userId + month + year + status != FAILED) is simpler and avoids a new model. However, if the micro call fails mid-flight, those shouldn't count. Using an `EvaluationUsage` counter table (same pattern as `ScoringUsage`) is cleaner and idempotent.

**Recommendation:** Add `EvaluationUsage` model mirroring `ScoringUsage`. Increment atomically before calling the micro (reserve-then-use), check limit before reserving.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | existing | `EvaluationResult` + `EvaluationTransaction` + `EvaluationUsage` models | All DB operations in project use Prisma |
| NestJS modules | existing | Module/controller/service structure | Established pattern |
| `class-validator` + `class-transformer` | existing | DTO validation | Used in all DTOs |
| Node built-in `fetch` | Node 18+ | HTTP client for micro calls | No new package; sufficient for simple JSON HTTP calls |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/schedule` | existing (in package.json) | Scheduled polling cleanup | Only if implementing a background polling job for run completion |
| `EventEmitter2` | existing | Emit `evaluation.completed` event | If notification on evaluation result is needed |
| `AgentCreditsModule` | Phase 26 | Credit deduction for STARTER/PRO | Import in EvaluationsModule |
| `SubscriptionsModule` | Phase 12 | Plan config + active subscription check | Import in EvaluationsModule |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Built-in `fetch` | `@nestjs/axios` | Axios adds retry/interceptor ecosystem but is overkill for 2 HTTP calls to a local micro; `fetch` is zero-dependency |
| Built-in `fetch` | `axios` directly | Same tradeoff; `fetch` is built-in |
| `EvaluationUsage` table | Count query on `EvaluationResult` | Table is more explicit and consistent with `ScoringUsage` pattern; count query is simpler but brittle if status transitions are complex |

**Installation:**
```bash
# No new packages needed — built-in fetch + existing NestJS modules
```

## Architecture Patterns

### Recommended Module Structure
```
src/evaluations/
├── evaluations.module.ts           # Imports AgentCreditsModule, SubscriptionsModule
├── evaluations.controller.ts       # POST /evaluations/:applicationId, GET /evaluations/:applicationId/result
├── evaluations.service.ts          # Orchestration: validate → deduct → call micro → store
├── agent-micro.client.ts           # HTTP client for localhost:4000
└── dto/
    ├── evaluation-result.dto.ts    # Response shape
    └── index.ts
```

### Prisma Models to Add (Plan 27-01)

```prisma
/// Result of an agent microservice evaluation run for an application
model EvaluationResult {
  id            String   @id @default(uuid()) @db.Uuid
  applicationId String   @unique @map("application_id") @db.Uuid // One evaluation per application (latest)
  requestedBy   String   @map("requested_by") @db.Uuid           // Landlord/agent userId who triggered it
  runId         String   @map("run_id") @db.VarChar(100)         // runId from micro POST /tenant-scoring
  status        EvaluationStatus @default(PENDING)
  result        Json?    // Full response from GET /tenant-scoring/:runId when complete
  error         String?  @db.Text // Error message if FAILED
  
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  application   Application @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  requestedByUser User      @relation("EvaluationRequester", fields: [requestedBy], references: [id])
  transaction   EvaluationTransaction?

  @@index([applicationId])
  @@index([requestedBy])
  @@map("evaluation_results")
}

/// Financial record of an evaluation request (per-tier pricing)
model EvaluationTransaction {
  id               String   @id @default(uuid()) @db.Uuid
  evaluationId     String   @unique @map("evaluation_id") @db.Uuid
  userId           String   @map("user_id") @db.Uuid
  tier             String   @db.VarChar(20)  // STARTER, PRO, FLEX
  amountPaidCop    Int      @map("amount_paid_cop") // 0 for FLEX, 42000 for STARTER, 21000 for PRO
  creditsDeducted  Int      @map("credits_deducted") // 0 or 1
  
  createdAt        DateTime @default(now()) @map("created_at")

  evaluation       EvaluationResult @relation(fields: [evaluationId], references: [id])
  user             User             @relation(fields: [userId], references: [id])

  @@index([userId])
  @@map("evaluation_transactions")
}

/// Monthly evaluation usage counter for PRO tier limit enforcement
model EvaluationUsage {
  id        String @id @default(uuid()) @db.Uuid
  userId    String @map("user_id") @db.Uuid
  month     Int    // 1-12
  year      Int
  count     Int    @default(0) // Evaluations requested this month

  user User @relation(fields: [userId], references: [id])

  @@unique([userId, month, year], name: "userId_month_year")
  @@index([userId])
  @@map("evaluation_usage")
}

enum EvaluationStatus {
  PENDING    // Micro received request, runId returned
  COMPLETED  // Result stored
  FAILED     // Micro returned error or polling timed out
}
```

### Pattern 1: 202 Async with runId
**What:** `POST /evaluations/:applicationId` calls the micro, stores runId in DB, returns 202 immediately.
**When to use:** Per EVAL-01 — the evaluation may take seconds to minutes.

```typescript
// Source: pattern derived from existing 202 patterns in NestJS ecosystem
// verified against project NestJS version (current)
@Post(':applicationId')
@HttpCode(202)
async requestEvaluation(
  @Param('applicationId', ParseUUIDPipe) applicationId: string,
  @CurrentUser() user: User,
) {
  const result = await this.evaluationsService.requestEvaluation(applicationId, user.id);
  return { runId: result.runId, status: 'PENDING' };
}
```

### Pattern 2: Plan + Credit Validation Before Micro Call

```typescript
// Source: verified from src/subscriptions/services/plan-enforcement.service.ts
// and src/agent-credits/agent-credits.service.ts
async validateAndCharge(userId: string, applicationId: string): Promise<{
  tier: string;
  amountPaidCop: number;
  creditsDeducted: number;
}> {
  // 1. Check active subscription
  const subscription = await this.subscriptionsService.getActiveSubscription(userId);
  if (!subscription) {
    throw new ForbiddenException('Se requiere una suscripcion activa para solicitar evaluaciones');
  }
  
  const planConfig = subscription.plan;
  const tier = planConfig.tier; // STARTER | PRO | FLEX
  
  // 2. PRO monthly limit check
  if (tier === 'PRO') {
    const count = await this.getMonthlyEvaluationCount(userId);
    if (count >= 30) {
      throw new HttpException('Limite de 30 evaluaciones mensuales alcanzado', 429);
    }
  }
  
  // 3. FLEX: free, skip credit deduction
  if (tier === 'FLEX') {
    return { tier: 'FLEX', amountPaidCop: 0, creditsDeducted: 0 };
  }
  
  // 4. STARTER/PRO: deduct 1 credit
  const deducted = await this.agentCreditsService.deductCredits(userId, 1, applicationId);
  if (!deducted) {
    throw new BadRequestException('Saldo de creditos insuficiente. Compra mas creditos para continuar.');
  }
  
  return {
    tier,
    amountPaidCop: planConfig.evaluationCreditPrice,
    creditsDeducted: 1,
  };
}
```

### Pattern 3: Agent Micro Client (Node built-in fetch)

```typescript
// Source: Node.js 18+ built-in fetch — no import needed
// Agent micro API: POST /tenant-scoring → 202 { runId }, GET /tenant-scoring/:runId → result
export class AgentMicroClient {
  private readonly baseUrl: string;
  
  constructor(configService: ConfigService) {
    this.baseUrl = configService.get<string>('AGENT_MICRO_URL') ?? 'http://localhost:4000';
  }
  
  async startEvaluation(payload: TenantScoringPayload): Promise<{ runId: string }> {
    const res = await fetch(`${this.baseUrl}/tenant-scoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Micro returned ${res.status}`);
    return res.json() as Promise<{ runId: string }>;
  }
  
  async pollResult(runId: string): Promise<MicroResult | null> {
    const res = await fetch(`${this.baseUrl}/tenant-scoring/${runId}`);
    if (res.status === 202) return null; // Still processing
    if (!res.ok) throw new Error(`Micro poll error: ${res.status}`);
    return res.json() as Promise<MicroResult>;
  }
}
```

### Pattern 4: PRO Monthly Counter (mirrors ScoringUsage)

```typescript
// Source: verified from src/subscriptions/services/plan-enforcement.service.ts
// recordScoringView() and canViewScoring() are the exact model to follow
private async incrementEvaluationCount(userId: string): Promise<number> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const usage = await this.prisma.evaluationUsage.upsert({
    where: { userId_month_year: { userId, month, year } },
    create: { userId, month, year, count: 1 },
    update: { count: { increment: 1 } },
  });
  
  return usage.count;
}

private async getMonthlyEvaluationCount(userId: string): Promise<number> {
  const now = new Date();
  const usage = await this.prisma.evaluationUsage.findUnique({
    where: { userId_month_year: { userId, month: now.getMonth() + 1, year: now.getFullYear() } },
  });
  return usage?.count ?? 0;
}
```

### Anti-Patterns to Avoid

- **Polling inside the POST handler:** Don't block the 202 response waiting for the micro to finish. Return runId immediately; let the client poll via the GET endpoint.
- **Charging credits before validating the application exists:** Always load + verify application ownership before any charge/deduction.
- **Using `@nestjs/axios` for two HTTP calls:** Overkill. Adds a dependency, requires RxJS conversion (`firstValueFrom`), and complicates testing. Plain `fetch` is cleaner and sufficient.
- **Re-charging on retry:** If a landlord calls `POST /evaluations/:applicationId` and a `PENDING` or `COMPLETED` result already exists, do NOT charge again. Return the existing result.
- **Storing `evaluationCreditPrice` as the credit deduction amount:** The credit deduction is always `1 credit` (integer). The COP price is stored in `EvaluationTransaction.amountPaidCop` from `planConfig.evaluationCreditPrice` for the audit trail.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Credit deduction | Custom balance logic | `AgentCreditsService.deductCredits(userId, 1, applicationId)` | Already atomic; handles double-spend |
| Plan tier check | Inline subscription query | `SubscriptionsService.getActiveSubscription()` + `getUserPlanConfig()` | Already handles expired subs, no-sub fallback |
| Monthly counter | Custom date-range COUNT | `EvaluationUsage` upsert (mirror ScoringUsage) | Atomic upsert; no race on concurrent requests |
| HTTP client | Custom fetch wrapper | Node built-in `fetch` directly | Zero dependency; sufficient for 2 endpoints |

## Common Pitfalls

### Pitfall 1: Idempotency — Charging Twice for Same Application
**What goes wrong:** Landlord retries the POST, credits get deducted again for the same application.
**Why it happens:** No idempotency check before the credit deduction step.
**How to avoid:** Before charging, check if an `EvaluationResult` with `applicationId` already exists and status is not `FAILED`. If `PENDING` or `COMPLETED`, return the existing result without re-charging.
**Warning signs:** `EvaluationResult` has no `@unique` on `applicationId` — add it to enforce one evaluation per application.

### Pitfall 2: PRO Limit Race Condition
**What goes wrong:** Two concurrent PRO requests both read count=29 < 30, both pass the limit check, both increment, resulting in 31 evaluations.
**Why it happens:** Check-then-increment is not atomic.
**How to avoid:** Use a `$transaction` that increments and validates in one step, or use a database-level constraint. Simplest: increment first (upsert), then check if the new count > 30, and if so decrement and throw 429. This mirrors the credit deduction pattern (optimistic).

### Pitfall 3: `AGENT_MICRO_URL` Not in Environment
**What goes wrong:** Micro client calls `undefined/tenant-scoring` in production.
**Why it happens:** `env.validation.ts` doesn't declare `AGENT_MICRO_URL`.
**How to avoid:** Add `AGENT_MICRO_URL` to `EnvironmentVariables` class in `src/config/env.validation.ts` as `@IsOptional() @IsUrl() AGENT_MICRO_URL: string = 'http://localhost:4000'`.
**Warning signs:** No `AGENT_MICRO_URL` entry in env validation file.

### Pitfall 4: Ownership Validation Missing
**What goes wrong:** Landlord A requests evaluation for application linked to Landlord B's property.
**Why it happens:** Only checking `applicationId` exists, not that the requester owns the property.
**How to avoid:** Load application with property, check `application.property.landlordId === userId` (LANDLORD role) or agency membership check (AGENT role).
**Warning signs:** No ownership check in service before proceeding.

### Pitfall 5: FLEX Users Failing Credit Check
**What goes wrong:** FLEX landlord has `AgentCredit.balance = 0` (never bought credits), deductCredits returns false, gets 400 error.
**Why it happens:** Applying credit deduction logic to FLEX tier.
**How to avoid:** Explicitly branch on tier BEFORE calling `deductCredits`. FLEX never calls `deductCredits`.
**Warning signs:** `deductCredits` called unconditionally for all tiers.

### Pitfall 6: Missing Back-Relations on User Model
**What goes wrong:** `prisma generate` fails after adding `EvaluationResult` and `EvaluationTransaction`.
**Why it happens:** New models reference User without adding back-relation fields to User model.
**How to avoid:** Add `evaluationResults EvaluationResult[] @relation("EvaluationRequester")`, `evaluationTransactions EvaluationTransaction[]`, `evaluationUsage EvaluationUsage?` to User model in schema.

### Pitfall 7: `@unique` on `applicationId` in EvaluationResult Prevents Re-evaluation
**What goes wrong:** If the landlord wants to re-run an evaluation (e.g., after new documents uploaded), the unique constraint blocks creation.
**Why it happens:** `@unique` on applicationId means only one result ever.
**How to avoid:** Consider whether re-evaluation is in scope. Per the requirements, the endpoint is "solicitar una evaluacion" with no mention of re-evaluation. Use `@unique` for now (simplest) and document that re-evaluation would require soft-delete or a composite index approach in a future phase.

## Code Examples

### EvaluationsController
```typescript
// Source: pattern from src/landlord/landlord.controller.ts
@ApiTags('Evaluations')
@ApiBearerAuth()
@Roles(Role.LANDLORD)  // AGENT inherits via RolesGuard
@Controller('evaluations')
export class EvaluationsController {

  @Post(':applicationId')
  @HttpCode(202)
  @ApiOperation({ summary: 'Solicitar evaluacion unificada del aplicante' })
  @ApiResponse({ status: 202, description: 'Evaluacion iniciada, runId devuelto' })
  @ApiResponse({ status: 402, description: 'Creditos insuficientes' })
  @ApiResponse({ status: 403, description: 'Sin suscripcion activa' })
  @ApiResponse({ status: 429, description: 'Limite PRO de 30/mes alcanzado' })
  async requestEvaluation(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: User,
  ) {
    return this.evaluationsService.requestEvaluation(applicationId, user.id);
  }

  @Get(':applicationId/result')
  @ApiOperation({ summary: 'Consultar resultado de evaluacion (polling)' })
  async getResult(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @CurrentUser() user: User,
  ) {
    return this.evaluationsService.getResult(applicationId, user.id);
  }
}
```

### EvaluationsModule
```typescript
// Source: pattern from src/landlord/landlord.module.ts
@Module({
  imports: [AgentCreditsModule, SubscriptionsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, AgentMicroClient],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
```

### EvaluationsService — Main Orchestration
```typescript
async requestEvaluation(applicationId: string, requestedBy: string): Promise<{ runId: string; status: string }> {
  // 1. Load application + verify ownership
  const application = await this.prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { property: true, documents: true },
  });
  
  if (application.property.landlordId !== requestedBy) {
    // TODO: also allow AGENT role via agency membership
    throw new ForbiddenException('No tienes acceso a esta solicitud');
  }
  
  // 2. Idempotency: return existing if already PENDING or COMPLETED
  const existing = await this.prisma.evaluationResult.findUnique({
    where: { applicationId },
  });
  if (existing && existing.status !== 'FAILED') {
    return { runId: existing.runId, status: existing.status };
  }
  
  // 3. Validate plan + charge credits
  const chargeResult = await this.validateAndCharge(requestedBy, applicationId);
  
  // 4. Build payload and call micro
  const payload = this.buildMicroPayload(application);
  const { runId } = await this.agentMicroClient.startEvaluation(payload);
  
  // 5. Persist EvaluationResult + EvaluationTransaction
  await this.prisma.$transaction(async (tx) => {
    const evalResult = await tx.evaluationResult.create({
      data: {
        applicationId,
        requestedBy,
        runId,
        status: 'PENDING',
      },
    });
    
    await tx.evaluationTransaction.create({
      data: {
        evaluationId: evalResult.id,
        userId: requestedBy,
        tier: chargeResult.tier,
        amountPaidCop: chargeResult.amountPaidCop,
        creditsDeducted: chargeResult.creditsDeducted,
      },
    });
  });
  
  // 6. Increment PRO monthly counter (if PRO)
  if (chargeResult.tier === 'PRO') {
    await this.incrementEvaluationCount(requestedBy);
  }
  
  return { runId, status: 'PENDING' };
}
```

### AgentMicroClient
```typescript
// Source: Node built-in fetch (Node 18+, no import needed)
@Injectable()
export class AgentMicroClient {
  private readonly baseUrl: string;
  private readonly logger = new Logger(AgentMicroClient.name);

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('AGENT_MICRO_URL') ?? 'http://localhost:4000';
  }

  async startEvaluation(payload: unknown): Promise<{ runId: string }> {
    const res = await fetch(`${this.baseUrl}/tenant-scoring`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    
    if (!res.ok) {
      this.logger.error(`Micro POST /tenant-scoring failed: ${res.status}`);
      throw new ServiceUnavailableException('El microservicio de agentes no esta disponible');
    }
    
    return res.json() as Promise<{ runId: string }>;
  }

  async pollResult(runId: string): Promise<{ status: string; result?: unknown } | null> {
    const res = await fetch(`${this.baseUrl}/tenant-scoring/${runId}`);
    
    if (res.status === 202) return null; // Still processing
    if (!res.ok) {
      this.logger.warn(`Micro GET /tenant-scoring/${runId} error: ${res.status}`);
      return null;
    }
    
    return res.json() as Promise<{ status: string; result?: unknown }>;
  }
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No external micro integration | Node fetch (built-in) for 2-endpoint micro API | No new package needed |
| No evaluation endpoint | POST /evaluations/:applicationId (202 async) | EVAL-01 delivered |
| No tier-based evaluation pricing | Plan config `evaluationCreditPrice` + credit deduction | EVAL-02, EVAL-04 delivered |

## Open Questions

1. **Payload structure for POST /tenant-scoring**
   - What we know: The micro accepts `POST /tenant-scoring` with "documentos y datos del aplicante"
   - What's unclear: Exact JSON schema — does it want document URLs? Base64? Application JSON fields directly?
   - Recommendation: Build a `buildMicroPayload(application)` helper that sends: `personalInfo`, `employmentInfo`, `incomeInfo`, `referencesInfo` JSON blobs + array of `{ type, storagePath }` for documents. The planner should document this as an assumption and add a verification step with the micro team.

2. **GET /tenant-scoring/:runId response shape**
   - What we know: Returns the evaluation result when complete
   - What's unclear: Exact fields (score, risk level, narrative, etc.)
   - Recommendation: Store the full response as `Json` in `EvaluationResult.result` without parsing. This future-proofs against micro API changes.

3. **Should the backend poll the micro automatically (scheduled job) or expose a client-driven poll endpoint?**
   - What we know: SC#3 says "El backend puede hacer polling de GET /tenant-scoring/:runId hasta recibir el resultado y lo almacena en DB"
   - What's unclear: Is this a background scheduler or triggered by client calling GET /evaluations/:applicationId/result?
   - Recommendation: **Client-driven polling** is simpler — the GET endpoint tries the micro poll, updates DB if complete, returns current status. No background scheduler needed. This avoids `@nestjs/schedule` complexity and aligns with how other async flows work in the codebase (no autonomous polling services exist).

4. **AGENT role and agency-level ownership**
   - What we know: AGENT inherits LANDLORD routes via `RolesGuard`. An AGENT can manage multiple landlords' properties via `AgencyMember`.
   - What's unclear: When an AGENT requests an evaluation, should credits be deducted from the AGENT's balance or the landlord's balance?
   - Recommendation: Deduct from the requester's balance (`requestedBy = user.id`). AGENT has their own `AgentCredit` balance. Agency-level pooling is out of scope (same decision made in Phase 26).

5. **PRO atomic limit enforcement**
   - What we know: The check-then-increment race condition is possible.
   - What's unclear: How strict must this be? A few over-limit evaluations per edge case may be acceptable for the MVP.
   - Recommendation: Use optimistic increment (increment first, check after, rollback if over 30). This is atomic and matches the credit deduction pattern.

## Sources

### Primary (HIGH confidence)
- Codebase: `prisma/schema.prisma` — confirmed no EvaluationResult/EvaluationTransaction models; Application model shape; ScoringUsage monthly counter pattern
- Codebase: `prisma/seed-plans.ts` — confirmed evaluationCreditPrice values (STARTER=42k, PRO=21k, FLEX=0)
- Codebase: `src/agent-credits/agent-credits.service.ts` — confirmed `deductCredits` signature and atomic pattern
- Codebase: `src/agent-credits/agent-credits.module.ts` — confirmed `AgentCreditsService` exported
- Codebase: `src/subscriptions/subscriptions.module.ts` — confirmed `SubscriptionsService`, `PlanEnforcementService` exported
- Codebase: `src/subscriptions/services/plan-enforcement.service.ts` — ScoringUsage counter pattern (exact model for EvaluationUsage)
- Codebase: `src/subscriptions/services/subscriptions.service.ts` — `getActiveSubscription()`, `getUserPlanConfig()` interfaces
- Codebase: `package.json` — confirmed NO `@nestjs/axios` or `axios` in dependencies; Node fetch is the only option
- Codebase: `src/auth/guards/roles.guard.ts` — AGENT inherits LANDLORD routes confirmed
- Codebase: `src/config/env.validation.ts` — no AGENT_MICRO_URL declared yet; must be added
- Codebase: `src/app.module.ts` — confirmed `AgentCreditsModule` already registered at app level

### Secondary (MEDIUM confidence)
- NestJS docs: `@HttpCode(202)` decorator for non-200 responses — standard NestJS pattern
- Node.js 18+ documentation: built-in `fetch` is globally available without import

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies verified in package.json and codebase
- Architecture: HIGH — patterns directly derived from existing modules (PlanEnforcementService, AgentCreditsService)
- Pitfalls: HIGH — verified by tracing actual code paths
- Micro payload schema: LOW — external contract not defined in this codebase

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable domain, 30 days)
