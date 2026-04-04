# Phase 28: FLEX Billing - Research

**Researched:** 2026-04-04
**Domain:** Canon tracking, PSE split simulation, FLEX agency dashboard
**Confidence:** HIGH

## Summary

Phase 28 introduces billing mechanics for the FLEX tier: agencies on FLEX (no monthly subscription, pay-per-evaluation) also get billed a 1% Leasify fee on every rent canon they manage. The canon tracking is separate from the existing `Cobro` system — `Cobro` is the internal agency record of what the tenant owes; `CanonTracking` will be the record of what Leasify charges the agency.

The codebase already has three building blocks that make this straightforward:
1. **`PseMockService.processPayment()`** — deterministic mock PSE, reused by AgentCreditsService for credit purchases. The same pattern applies here: intercept the successful PSE path and register the 1% split.
2. **`AgencyMemberGuard` + `@CurrentAgency()`** — resolves `agencyId` from the authenticated user; all inmobiliaria controllers use this. The FLEX billing dashboard will follow the same guard pattern.
3. **`Agency` → `Consignacion`** relation with `monthlyRent` — the source of truth for administered canons is `consignaciones.monthly_rent` for `ACTIVE` consignaciones. This is the aggregate source for "canon total administrado".

The 1% PSE split is purely simulated: when a `Cobro` payment is recorded via PSE, the system writes a `CanonTracking` record capturing the canon amount and the 1% Leasify fee. No real money movement occurs — same philosophy as the existing PSE mock. The manual reporting path (FLEX-03) covers non-PSE payments.

**Primary recommendation:** New module `src/flex-billing/` with its own controller, service, and DTOs. New `CanonTracking` Prisma model scoped to `agencyId`. Hook into the `Cobro` payment path (inmobiliaria cobros service) to auto-register on PSE payments. Expose a single dashboard endpoint under `GET /inmobiliaria/flex-billing/dashboard`.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@prisma/client` | already installed | CanonTracking model + queries | project ORM |
| `@nestjs/common` | already installed | Module, Injectable, Controller | project framework |

No new packages needed. This phase is pure business logic on top of existing infrastructure.

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `PseMockService` | internal | Reuse for PSE payment processing reference | Already used in AgentCreditsService — same import pattern |
| `AgencyMemberGuard` | internal | Scope all endpoints to agency | Already used in inmobiliaria/dashboard |
| `AgencyPermissionGuard` + `@RequirePermission` | internal | Permission-based access | Already used in inmobiliaria/dashboard |

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure

```
src/flex-billing/
├── flex-billing.module.ts
├── flex-billing.controller.ts
├── flex-billing.service.ts
└── dto/
    ├── report-canon.dto.ts
    └── flex-billing-dashboard.dto.ts
```

The module lives under `src/` (not under `src/inmobiliaria/`) because it's a Leasify billing concern, not an agency-internal concern — it tracks what Leasify charges the agency. However, its HTTP endpoints go under `/inmobiliaria/flex-billing/` for consistency with how the frontend navigates the inmobiliaria section.

### Pattern 1: CanonTracking record on PSE payment

**What:** After a `Cobro` payment is recorded via PSE in the inmobiliaria cobros flow, the system writes a `CanonTracking` row for the agency.
**When to use:** Only when `paymentMethod === 'PSE'` and `status === COBRO_PAID` (or equivalent confirmed status).
**How:** Inject `FlexBillingService` into the cobros service (or use NestJS EventEmitter — see Pattern 3 below). Call `canonTrackingService.registerPsePayment(agencyId, consignacionId, canonAmount, pseTransactionId)`.

```typescript
// In FlexBillingService
async registerPsePayment(
  agencyId: string,
  consignacionId: string,
  canonAmount: number,
  pseTransactionId: string,
  month: string, // '2026-04'
): Promise<void> {
  const leasifyFee = Math.round(canonAmount * 0.01); // 1%
  await this.prisma.canonTracking.create({
    data: {
      agencyId,
      consignacionId,
      canonAmount,
      leasifyFee,
      month,
      source: 'PSE_AUTO',
      pseTransactionId,
    },
  });
}
```

### Pattern 2: Manual canon report (FLEX-03)

**What:** Agency reports a non-PSE payment canon so the 1% is still tracked.
**When to use:** When the cobro was paid via bank transfer, cash, etc.
**Endpoint:** `POST /inmobiliaria/flex-billing/canon` with `{ consignacionId, canonAmount, month, paymentReference? }`.

```typescript
// DTO
export class ReportCanonDto {
  @IsUUID() consignacionId: string;
  @IsInt() @Min(1) canonAmount: number;
  @IsString() @Matches(/^\d{4}-\d{2}$/) month: string; // '2026-04'
  @IsOptional() @IsString() paymentReference?: string;
}
```

### Pattern 3: Integration point with Cobros

The cobros service (`src/inmobiliaria/cobros/`) is where payments get recorded. Two integration options:

**Option A — Direct injection (simpler):**
Inject `FlexBillingService` into `CobrosService`. When marking a cobro as paid with `paymentMethod === 'PSE'`, call `flexBillingService.registerPsePayment(...)`.

**Option B — EventEmitter (looser coupling):**
`CobrosService` emits `'cobro.paid'` event. `FlexBillingService` listens. Same pattern already used in `TenantPaymentsService` for `payment.receiptUploaded`.

**Recommendation:** Option A (direct injection) is simpler and more readable. Option B only makes sense if there are multiple listeners. Since only FLEX billing needs this, use Option A.

### Pattern 4: Dashboard aggregation

**What:** `GET /inmobiliaria/flex-billing/dashboard` returns `canonTotal`, `leasifyFeeTotal`, `history[]`.
**When to use:** FLEX dashboard widget.

```typescript
async getDashboard(agencyId: string, year?: number) {
  const where = year
    ? { agencyId, month: { startsWith: `${year}-` } }
    : { agencyId };

  const [aggregate, history] = await Promise.all([
    this.prisma.canonTracking.aggregate({
      where,
      _sum: { canonAmount: true, leasifyFee: true },
    }),
    this.prisma.canonTracking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 12,
    }),
  ]);

  return {
    canonTotal: aggregate._sum.canonAmount ?? 0,
    leasifyFeeTotal: aggregate._sum.leasifyFee ?? 0,
    estimatedCharge: aggregate._sum.leasifyFee ?? 0, // alias for clarity
    history,
  };
}
```

### Anti-Patterns to Avoid

- **Don't add `CanonTracking` to the Agency model as a relation without indexing:** Always add `@@index([agencyId])` and `@@index([agencyId, month])`.
- **Don't duplicate canon amount from cobros without verification:** The `canonAmount` stored in `CanonTracking` should equal `cobro.rentAmount` (not `totalAmount` which includes fees). The 1% is on the rent canon only.
- **Don't make the PSE split block the payment:** The PSE split is a fire-and-complete operation. If `CanonTracking.create()` fails, it should NOT roll back the cobro payment. Use separate try/catch or emit asynchronously.
- **Don't assume all agency users are FLEX:** Before auto-registering PSE splits, check that the agency admin user's `subscriptionPlan === 'FLEX'`. Or make the tracking unconditional and display it only when FLEX.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PSE simulation | Custom mock | `PseMockService` (already exists) | Deterministic by doc number, already tested |
| Agency guard | Custom auth | `AgencyMemberGuard` + `@CurrentAgency()` | Battle-tested in inmobiliaria module |
| Permission check | Manual role check | `AgencyPermissionGuard` + `@RequirePermission()` | Already configured with permission defaults |
| Decimal rounding | `Math.floor` | `Math.round(canonAmount * 0.01)` | 1% on integers — round to nearest COP |

**Key insight:** The PSE mock already simulates a split. No real gateway needed. The split is purely a database write.

## Common Pitfalls

### Pitfall 1: Confusing Cobro amounts with canon

**What goes wrong:** Using `cobro.totalAmount` (which includes `adminAmount` and `lateFee`) instead of `cobro.rentAmount` for the 1% base.
**Why it happens:** `totalAmount = rentAmount + adminAmount + lateFee`. The 1% Leasify fee applies only to the **rent canon** (base rent), not fees.
**How to avoid:** Always use `cobro.rentAmount` as the base for `canonAmount`.
**Warning signs:** Fee amounts in `CanonTracking` that seem disproportionately high.

### Pitfall 2: Double-registration on payment updates

**What goes wrong:** If the cobros service is called multiple times for the same cobro (e.g., partial payments), multiple `CanonTracking` rows get created for the same month+consignacion.
**Why it happens:** No idempotency check.
**How to avoid:** Add `@@unique([agencyId, consignacionId, month])` to `CanonTracking`. Use `upsert` instead of `create`, or check for existing row first.
**Warning signs:** Dashboard totals higher than expected.

### Pitfall 3: FLEX check placement

**What goes wrong:** Checking `user.subscriptionPlan === 'FLEX'` in the cobros service creates a tight coupling between agency billing and user subscription state.
**Why it happens:** FLEX is a user-level attribute (`User.subscriptionPlan`), but cobros are agency-scoped.
**How to avoid:** Two clean options:
  - Store FLEX flag on `Agency` model (add a `billingTier` field) — simplest, avoids cross-model lookup.
  - Or: always write `CanonTracking` unconditionally, let the dashboard filter — only FLEX agencies will query the dashboard.
**Recommendation:** Always write `CanonTracking` if it's a PSE cobro — no FLEX check in the cobros service. The 1% is always tracked for any agency using PSE. Dashboard endpoint is just a READ for the agency admin.

### Pitfall 4: Missing cobros PSE payment path

**What goes wrong:** `CanonTracking` never gets populated because the cobros-paid PSE code path was not found.
**Why it happens:** The cobros service (`src/inmobiliaria/cobros/`) may not have an explicit PSE payment method — need to verify it exists and where it records payment confirmation.
**How to avoid:** Read `src/inmobiliaria/cobros/cobros.service.ts` before Plan 28-02. The integration point is wherever `status` transitions to `COBRO_PAID`.

## Code Examples

### CanonTracking Prisma model

```prisma
/// Tracks rent canons administered by FLEX agencies for Leasify billing
/// Auto-populated on PSE payments; manually reported for other methods
model CanonTracking {
  id             String  @id @default(uuid()) @db.Uuid
  agencyId       String  @map("agency_id") @db.Uuid
  consignacionId String  @map("consignacion_id") @db.Uuid

  canonAmount Int    @map("canon_amount") // COP - base rent only (not fees)
  leasifyFee  Int    @map("leasify_fee")  // 1% of canonAmount
  month       String @db.VarChar(7)       // '2026-04'

  source           String  @db.VarChar(20) // 'PSE_AUTO' | 'MANUAL'
  pseTransactionId String? @map("pse_transaction_id") @db.VarChar(100)
  paymentReference String? @map("payment_reference") @db.VarChar(100)

  createdAt DateTime @default(now()) @map("created_at")

  // Relations
  agency       Agency       @relation(fields: [agencyId], references: [id], onDelete: Cascade)
  consignacion Consignacion @relation(fields: [consignacionId], references: [id])

  @@unique([consignacionId, month]) // One record per property per month
  @@index([agencyId])
  @@index([agencyId, month])
  @@map("canon_tracking")
}
```

### FlexBillingModule wiring

```typescript
// flex-billing.module.ts
@Module({
  imports: [PrismaModule], // or DatabaseModule depending on project convention
  controllers: [FlexBillingController],
  providers: [FlexBillingService],
  exports: [FlexBillingService], // exported so CobrosModule can inject it
})
export class FlexBillingModule {}
```

### Controller skeleton (FLEX dashboard)

```typescript
@ApiTags('inmobiliaria/flex-billing')
@ApiBearerAuth()
@UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
@Controller('inmobiliaria/flex-billing')
export class FlexBillingController {
  @Get('dashboard')
  @RequirePermission('dashboard', 'view')
  async getDashboard(
    @CurrentAgency('agencyId') agencyId: string,
    @Query('year') year?: string,
  ) {
    return this.flexBillingService.getDashboard(agencyId, year ? parseInt(year) : undefined);
  }

  @Post('canon')
  @RequirePermission('cobros', 'edit') // manual reporting needs cobros permission
  async reportCanon(
    @CurrentAgency('agencyId') agencyId: string,
    @Body() dto: ReportCanonDto,
  ) {
    return this.flexBillingService.reportManualCanon(agencyId, dto);
  }
}
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Separate PSE gateway per feature | Reuse `PseMockService` | No duplication — same mock across subscriptions, credits, and now flex billing |
| Custom auth per controller | `AgencyMemberGuard` + `@CurrentAgency()` | Zero boilerplate for agency scoping |

## Open Questions

1. **Where exactly does PSE payment confirmation happen in the cobros flow?**
   - What we know: `Cobro` model has `status`, `paidDate`, `paymentMethod` fields. `CobroStatus` enum has `COBRO_PAID` or equivalent.
   - What's unclear: The specific service method that transitions cobro status to paid via PSE — needs reading `src/inmobiliaria/cobros/cobros.service.ts` before 28-02.
   - Recommendation: Plan 28-02 must first map the cobros payment confirmation path before designing the injection point.

2. **Does `CanonTracking` need a relation to `Agency` model? Agency model doesn't currently have a `canonTrackings` relation.**
   - What we know: All inmobiliaria models relate back to `Agency`.
   - Recommendation: Add `canonTrackings CanonTracking[]` to `Agency` model in the migration. Follow existing pattern.

3. **Should there be a unique constraint on `(consignacionId, month)` or `(agencyId, consignacionId, month)`?**
   - Analysis: `consignacionId` is already unique per agency (it belongs to one agency). So `(consignacionId, month)` is sufficient and more precise.
   - Recommendation: `@@unique([consignacionId, month])` — prevents double billing per property per month.

## Sources

### Primary (HIGH confidence)

- Codebase direct reading — `prisma/schema.prisma` (Agency, Consignacion, Cobro, AgentCredit models)
- Codebase direct reading — `src/tenant-payments/pse-mock/pse-mock.service.ts` (PSE mock pattern)
- Codebase direct reading — `src/agent-credits/agent-credits.service.ts` (PSE reuse pattern)
- Codebase direct reading — `src/inmobiliaria/dashboard/` (guard + permission pattern)
- Codebase direct reading — `src/inmobiliaria/cobros/` structure (agencyId, consignacionId, rentAmount fields confirmed in Cobro model)

### Secondary (MEDIUM confidence)

- Phase context (additional_context in task): FLEX = $0/mo, credits-based, Phase 26 complete. PSE is mock. Phase 27 complete.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries, all existing NestJS/Prisma patterns
- Architecture: HIGH — identical patterns to AgentCredits + inmobiliaria dashboard
- Pitfalls: HIGH — directly inferred from existing model constraints and cobros data model
- Integration point (cobros PSE path): MEDIUM — cobros service not yet read; must verify in 28-02 planning

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable domain)
