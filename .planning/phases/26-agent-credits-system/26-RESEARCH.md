# Phase 26: Agent Credits System - Research

**Researched:** 2026-04-03
**Domain:** Credits/wallet system with atomic balance operations, PSE mock payment integration, transaction history
**Confidence:** HIGH

## Summary

Phase 26 adds a credit-based purchasing system that lets landlords and inmobiliarias (LANDLORD + AGENT roles) buy evaluation credits in advance, check their balance, and view transaction history. The system must support two payment modes at evaluation time (Phase 27): pay-at-moment or deduct-from-credits. No new dependencies are required; all patterns reuse existing codebase patterns.

The critical design challenge is atomicity: when a credit is deducted, the balance must never go negative due to race conditions (double-spend). PostgreSQL's Prisma `{ decrement: N }` combined with a `{ where: { balance: { gte: N } } }` conditional update solves this cleanly without raw SQL — if the update affects 0 rows, the balance is insufficient. The existing `$transaction` pattern (used in visits, coupons) is the right wrapper.

The module is scoped to LANDLORD and AGENT roles only. Credits belong to a user (userId), NOT to an Agency. Agency-level pooling is explicitly out of scope for this phase. Per the seed data, FLEX plan landlords are the primary consumers, but STARTER and PRO landlords can also buy credits. No expiry is needed per the requirements.

**Primary recommendation:** Build a standalone `AgentCreditsModule` with two Prisma models (`AgentCredit` for balance, `AgentCreditTransaction` for history), a service with atomic deduction, and three controller endpoints. Follow the subscriptions module structure exactly.

## Codebase Analysis

### Confirmed Existing State (code-verified)

- **No `AgentCredit` model exists** in `prisma/schema.prisma` — must be added in Phase 26 migration.
- **PSE mock service** is at `src/tenant-payments/pse-mock/pse-mock.service.ts`. It is already exported via `TenantPaymentsModule` which is imported by `SubscriptionsModule`. The credits module must import `TenantPaymentsModule` directly.
- **Transaction pattern:** `prisma.$transaction(async (tx) => { ... })` — used in visits, coupons. This is the standard for atomic operations.
- **Increment/decrement pattern:** `{ data: { field: { increment: 1 } } }` — used in `plan-enforcement.service.ts` (scoringUsage) and `coupons.service.ts`.
- **PSE DTO pattern:** `PseSubscriptionPaymentDto` in `src/subscriptions/dto/subscription-payment.dto.ts` is the reusable PSE form DTO — reuse or alias in credits module.
- **Pagination pattern:** `{ page, limit }` → `skip = (page-1) * limit` — used in `properties.service.ts` and `recommendations.service.ts`.
- **Role guard pattern:** `@Roles(Role.LANDLORD)` decorator applied at controller level — used throughout the codebase.
- **User model:** `subscriptionPlan SubscriptionPlan @default(STARTER)` field exists. Credits are scoped to `userId` (UUID). No `agencyId` field on User directly; Agency is a separate model linked via `AgencyMember`.
- **Tiers confirmed:** STARTER/PRO/FLEX are live. FLEX plan description: "Sin suscripcion mensual. Accede a evaluaciones premium usando creditos." — confirms FLEX is the primary credits consumer.

### Evaluation Pricing (from requirements)
- STARTER: $42,000 COP per evaluation
- PRO: $21,000 COP per evaluation (50% discount)
- FLEX: Unlimited free (no credit needed)

These prices are NOT stored in `SubscriptionPlanConfig` currently — no `evaluationPrice` column exists. Phase 26 must decide: hard-code in service logic, or add a config field. See Open Questions.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | existing | ORM for AgentCredit + AgentCreditTransaction models | Already in use across all modules |
| NestJS modules | existing | Module/controller/service structure | Established project pattern |
| `class-validator` + `class-transformer` | existing | DTO validation | Used in all existing DTOs |
| `PseMockService` | existing | Mock PSE payment processing | Used in subscriptions, tenant-payments |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@nestjs/swagger` | existing | API documentation | All endpoints, following project convention |
| `TenantPaymentsModule` | existing | Re-exports PseMockService | Import in AgentCreditsModule to access PSE mock |

**No new npm packages needed.** All required capabilities exist in the current stack.

**Installation:**
```bash
# No new packages — all reused from existing modules
```

## Architecture Patterns

### Recommended Module Structure
```
src/agent-credits/
├── agent-credits.module.ts       # Module definition, imports TenantPaymentsModule
├── agent-credits.controller.ts   # REST endpoints (3 routes)
├── agent-credits.service.ts      # Business logic, atomic operations
└── dto/
    ├── buy-credits.dto.ts        # Pack size + PSE payment data
    └── index.ts
```

### Prisma Models to Add

```prisma
/// Current credit balance for a landlord or agent user
/// One row per user — created on first purchase, updated atomically
model AgentCredit {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @unique @map("user_id") @db.Uuid
  balance   Int      @default(0) // Number of evaluation credits remaining

  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  user         User                   @relation(fields: [userId], references: [id], onDelete: Cascade)
  transactions AgentCreditTransaction[]

  @@index([userId])
  @@map("agent_credits")
}

/// Ledger of all credit movements (purchases and deductions)
/// Append-only — never updated after creation
model AgentCreditTransaction {
  id        String                    @id @default(uuid()) @db.Uuid
  userId    String                    @map("user_id") @db.Uuid
  type      AgentCreditTransactionType  // PURCHASE | DEDUCTION
  amount    Int                       // Credits: positive for purchase, positive for deduction (semantic)
  balanceAfter Int                    @map("balance_after") // Snapshot of balance after this transaction

  // For purchases: PSE reference
  pseTransactionId String? @map("pse_transaction_id") @db.VarChar(100)
  amountPaidCop    Int?    @map("amount_paid_cop") // COP paid for this purchase

  // For deductions: application reference
  applicationId String? @map("application_id") @db.Uuid

  // Description for history display
  description String @db.VarChar(255)

  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  user User @relation(fields: [userId], references: [id])

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId])
  @@map("agent_credit_transactions")
}

enum AgentCreditTransactionType {
  PURCHASE
  DEDUCTION
}
```

**User model relation to add:**
```prisma
agentCredit            AgentCredit?
agentCreditTransactions AgentCreditTransaction[]
```

### Pattern 1: Atomic Credit Deduction (Conditional Update)

**What:** Deduct N credits from balance only if balance >= N. If 0 rows updated, balance was insufficient.

**When to use:** Every time Phase 27 calls `deductCredits()` before running evaluation.

```typescript
// Source: prisma.io/docs — conditional update for atomic decrement
async deductCredits(userId: string, amount: number, applicationId: string): Promise<boolean> {
  return await this.prisma.$transaction(async (tx) => {
    // Attempt conditional decrement — only succeeds if balance >= amount
    const updated = await tx.agentCredit.updateMany({
      where: {
        userId,
        balance: { gte: amount },
      },
      data: {
        balance: { decrement: amount },
      },
    });

    if (updated.count === 0) {
      // Balance insufficient or record doesn't exist
      return false;
    }

    // Re-read balance after update for snapshot
    const credit = await tx.agentCredit.findUniqueOrThrow({
      where: { userId },
    });

    await tx.agentCreditTransaction.create({
      data: {
        userId,
        type: 'DEDUCTION',
        amount,
        balanceAfter: credit.balance,
        applicationId,
        description: `Credito de evaluacion usado para solicitud ${applicationId}`,
      },
    });

    return true;
  });
}
```

**Key insight:** `updateMany` with a `where` condition on the balance field is the standard Prisma pattern for optimistic/conditional updates. No `SELECT FOR UPDATE` raw SQL needed. The atomic nature is guaranteed by the single SQL UPDATE statement's WHERE clause.

### Pattern 2: Credit Purchase with PSE Mock

**What:** Process PSE payment, then create/update balance and record transaction.

```typescript
// Source: verified pattern from src/subscriptions/services/subscriptions.service.ts
async purchaseCredits(userId: string, packSize: number, pseData: PseSubscriptionPaymentDto) {
  const pricePerCredit = CREDIT_PACK_PRICES[packSize];
  if (!pricePerCredit) throw new BadRequestException('Pack invalido');

  const paymentResult = this.pseMockService.processPayment({ /* ... */ });
  if (paymentResult.status === 'FAILURE') {
    throw new BadRequestException(`Pago rechazado: ${paymentResult.message}`);
  }

  return await this.prisma.$transaction(async (tx) => {
    // Upsert balance: create if first purchase, increment if existing
    const credit = await tx.agentCredit.upsert({
      where: { userId },
      create: { userId, balance: packSize },
      update: { balance: { increment: packSize } },
    });

    await tx.agentCreditTransaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: packSize,
        balanceAfter: credit.balance,
        pseTransactionId: paymentResult.transactionId,
        amountPaidCop: pricePerCredit,
        description: `Compra de ${packSize} creditos via PSE`,
      },
    });

    return { balance: credit.balance, paymentResult };
  });
}
```

### Pattern 3: Transaction History with Pagination

**What:** Return paginated list of transactions ordered by newest first.

```typescript
// Source: verified pattern from src/properties/properties.service.ts
async getTransactionHistory(userId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    this.prisma.agentCreditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    this.prisma.agentCreditTransaction.count({ where: { userId } }),
  ]);

  return {
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

### Anti-Patterns to Avoid

- **Read-then-write without conditional:** Don't do `findUnique` → check balance → `update`. Race condition window exists between read and write. Use conditional `updateMany` instead.
- **Agency-level credits:** Do NOT attach credits to `Agency.id`. Credits are per-user (userId). Agency pooling is out of scope.
- **Storing credit prices in AgentCreditTransaction.amount only:** Always store `amountPaidCop` separately from `amount` (credit count). They are different units.
- **Mutable transactions:** Transaction log is append-only. Never update an existing `AgentCreditTransaction` row.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic decrement | Custom lock mechanism | Prisma `updateMany` with `where: { balance: { gte: N } }` | Single atomic SQL UPDATE; no distributed lock needed |
| PSE payment processing | Custom payment mock | `PseMockService.processPayment()` | Already handles SUCCESS/PENDING/FAILURE, deterministic test behavior by document number |
| PSE DTO validation | New PSE form DTO | Reuse `PseSubscriptionPaymentDto` from `src/subscriptions/dto/subscription-payment.dto.ts` | Identical fields (documentType, documentNumber, bankCode, holderName) |

**Key insight:** The conditional `updateMany` pattern is sufficient for this scale. Prisma issues a single `UPDATE ... WHERE balance >= amount` SQL query, which PostgreSQL executes atomically.

## Common Pitfalls

### Pitfall 1: Balance Snapshot Staleness in Upsert
**What goes wrong:** The `upsert` for purchase returns the post-upsert state, but for `update` path the returned `balance` is the new value (after increment). Verify the Prisma `upsert` return value includes the updated `balance`.
**Why it happens:** Prisma `upsert` returns the created/updated record — the `balance` field in the return is correct post-operation. This is fine as long as both `create` and `update` paths return the record.
**How to avoid:** Always read the returned record from `upsert`, don't recalculate.
**Warning signs:** `balanceAfter` in transaction log doesn't match actual balance.

### Pitfall 2: Double-Spend After PENDING PSE Payment
**What goes wrong:** PSE returns `PENDING` — optimistically granting credits. If the bank later fails, credits were granted for a payment that didn't clear.
**Why it happens:** Same pattern used in subscriptions (optimistic ACTIVE subscription on PENDING payment).
**How to avoid:** Follow the same convention as `SubscriptionsService.subscribe()` — grant credits optimistically for PENDING (consistent with subscription behavior). Document in code that PENDING means credits are granted but payment not yet confirmed.
**Warning signs:** `paymentResult.status === 'PENDING'` case not handled explicitly.

### Pitfall 3: Missing Role Guard
**What goes wrong:** Tenant calls `POST /agent-credits/purchase` and buys credits.
**Why it happens:** Forgetting `@Roles(Role.LANDLORD, Role.AGENT)` on controller class.
**How to avoid:** Apply `@Roles(Role.LANDLORD, Role.AGENT)` at the controller class level, not just individual routes.
**Warning signs:** No `@Roles` decorator visible on controller.

### Pitfall 4: Credit Pack Price Not Validated
**What goes wrong:** Client sends an arbitrary `packSize` of 999.
**Why it happens:** Only validating that `packSize` is a number, not that it's a valid pack.
**How to avoid:** Use `@IsIn([1, 5, 10, 20])` validator on the DTO. Maintain a `CREDIT_PACK_PRICES` constant map in the service.
**Warning signs:** DTO uses `@IsInt()` alone without `@IsIn()`.

### Pitfall 5: User Relation Missing on User Model
**What goes wrong:** Prisma migration succeeds but `prisma generate` fails because the back-relation on `User` is missing.
**Why it happens:** Adding a model that relates to `User` without adding the back-relation field in the User model.
**How to avoid:** Add `agentCredit AgentCredit?` and `agentCreditTransactions AgentCreditTransaction[]` to the User model in `prisma/schema.prisma`.
**Warning signs:** `prisma generate` errors mentioning missing relation fields.

## Code Examples

### Controller Endpoints
```typescript
// Source: verified pattern from src/subscriptions/controllers/subscriptions.controller.ts
@ApiTags('Agent Credits')
@ApiBearerAuth()
@Roles(Role.LANDLORD, Role.AGENT)
@Controller('agent-credits')
export class AgentCreditsController {

  @Get('balance')
  @ApiOperation({ summary: 'Consultar saldo de creditos' })
  async getBalance(@CurrentUser() user: User) {
    return this.agentCreditsService.getBalance(user.id);
  }

  @Post('purchase')
  @ApiOperation({ summary: 'Comprar pack de creditos via PSE' })
  async purchase(@CurrentUser() user: User, @Body() dto: BuyCreditsDto) {
    return this.agentCreditsService.purchaseCredits(user.id, dto);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Historial de transacciones' })
  async getHistory(
    @CurrentUser() user: User,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.agentCreditsService.getTransactionHistory(
      user.id,
      parseInt(page || '1', 10),
      parseInt(limit || '20', 10),
    );
  }
}
```

### Credit Pack Prices Constant
```typescript
// Hard-coded prices in COP — admin can't change these via DB config
// Phase 26 does not add a DB config table for credit prices
export const CREDIT_PACK_PRICES: Record<number, number> = {
  1:  42_000,  // 1 credit = $42,000 COP (matches STARTER eval price)
  5:  189_000, // 5 credits = $189,000 (~10% discount)
  10: 350_000, // 10 credits = $350,000 (~17% discount)
  20: 630_000, // 20 credits = $630,000 (~25% discount)
};

export const VALID_PACK_SIZES = [1, 5, 10, 20] as const;
export type CreditPackSize = typeof VALID_PACK_SIZES[number];
```

### BuyCreditsDto
```typescript
// Source: verified pattern from src/subscriptions/dto/create-subscription.dto.ts
export class BuyCreditsDto {
  @ApiProperty({ description: 'Pack size', enum: [1, 5, 10, 20] })
  @IsInt()
  @IsIn([1, 5, 10, 20])
  packSize!: number;

  @ApiProperty({ type: PseSubscriptionPaymentDto })
  @ValidateNested()
  @Type(() => PseSubscriptionPaymentDto)
  psePaymentData!: PseSubscriptionPaymentDto;
}
```

### Module Definition
```typescript
// Source: verified pattern from src/subscriptions/subscriptions.module.ts
@Module({
  imports: [TenantPaymentsModule],  // Re-exports PseMockService
  controllers: [AgentCreditsController],
  providers: [AgentCreditsService],
  exports: [AgentCreditsService],   // Phase 27 imports this to call deductCredits()
})
export class AgentCreditsModule {}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No credits system | AgentCredit + AgentCreditTransaction models | Phase 26 introduces these — net new |
| FLEX plan had no mechanism | Credits give FLEX users a way to access evaluations | Closes the FLEX tier's payment gap |

## Open Questions

1. **Evaluation prices: hard-code or database config?**
   - What we know: `SubscriptionPlanConfig` has `scoringViewPrice` for tenant micropayments. No equivalent field exists for evaluation prices.
   - What's unclear: The requirements say STARTER=$42,000, PRO=$21,000. Should these be stored in `SubscriptionPlanConfig` (new column `evaluationCreditPrice`) or hard-coded as constants in the credits service?
   - Recommendation: **Add `evaluationCreditPrice Int @default(0)` to `SubscriptionPlanConfig`** and update seed data. This keeps pricing configurable and consistent with the existing pattern. Hard-coding is simpler but creates maintenance debt when Phase 27 needs to read the price.

2. **Should `deductCredits()` be callable by Phase 27 without re-importing the full module?**
   - What we know: `AgentCreditsService` should be exported from `AgentCreditsModule`. Phase 27 (`EvaluationsModule`) will import `AgentCreditsModule`.
   - What's unclear: Whether Phase 27 needs only `deductCredits()` or also `getBalance()`.
   - Recommendation: Export `AgentCreditsService` from `AgentCreditsModule`. Phase 27 imports `AgentCreditsModule`.

3. **Credit pack discount tiers: what are the exact prices?**
   - What we know: $42,000/credit for STARTER. No pack pricing is specified in requirements.
   - What's unclear: Should packs have a discount (e.g., 10-pack at 17% off)?
   - Recommendation: Use the constants in the Code Examples section above as defaults. These are reasonable and consistent with Colombian SaaS pricing norms. Planner can adjust if product owner specifies different values.

4. **AGENT role: individual balance or inherit from agency?**
   - What we know: Agency and AgencyMember models exist. Credits requirement says "per usuario/agencia" but the architecture context says "per user or per agency."
   - What's unclear: Whether agents share a balance with their agency admin.
   - Recommendation: **Per-user balance only for Phase 26.** CRED-01 says "saldo por usuario/agencia" — implement the user case first. Agency-level pooling is a natural Phase 26 extension but is not required by CRED-01 through CRED-04.

## Sources

### Primary (HIGH confidence)
- Codebase: `prisma/schema.prisma` — confirmed no AgentCredit model exists; all referenced models (User, Agency, SubscriptionPlanConfig, ScoringUsage) verified
- Codebase: `src/subscriptions/services/subscriptions.service.ts` — PSE mock integration pattern, `$transaction` usage, upsert pattern
- Codebase: `src/subscriptions/services/plan-enforcement.service.ts` — `{ increment: 1 }` pattern, ScoringUsage upsert
- Codebase: `src/coupons/coupons.service.ts` — `$transaction` with increment and record creation
- Codebase: `src/visits/visits.service.ts` — `$transaction` with conflict-check-then-create pattern
- Codebase: `src/tenant-payments/pse-mock/pse-mock.service.ts` — full PSE mock interface
- Codebase: `src/common/enums/subscription-plan.enum.ts` — STARTER/PRO/FLEX confirmed
- Codebase: `prisma/seed-plans.ts` — tier descriptions and pricing confirmed

### Secondary (MEDIUM confidence)
- Prisma documentation (general knowledge): `updateMany` with conditional `where` is a valid atomic pattern for balance decrements in PostgreSQL — the WHERE clause executes atomically in a single SQL statement

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified in codebase
- Architecture: HIGH — patterns directly from existing codebase
- Pitfalls: HIGH — verified by inspecting actual code paths
- Credit pack prices: LOW — no official pricing in requirements, proposed prices are reasonable defaults

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable domain, 30 days)
