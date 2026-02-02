# Phase 9: Payment History Scoring - Research

**Researched:** 2026-02-02
**Domain:** Payment History Analysis, Tenant Reputation Scoring
**Confidence:** HIGH

## Summary

Phase 9 enhances the existing scoring engine (Phase 5) with real payment history data from the platform (Phase 8). The existing architecture provides a clean extension point: create a new `PaymentHistoryModel` that follows the established `ModelResult` pattern, query the tenant's payment records across all leases, and integrate into the `ScoreAggregator`.

The key insight is that payment history scoring is an **enhancement** to the existing History score (currently 15 points based only on references). This phase adds real platform data (on-time payments, late frequency, tenure) while maintaining backward compatibility for tenants without payment history on the platform.

**Primary recommendation:** Create `PaymentHistoryModel` with up to 15 bonus points for payment history, keeping the existing `HistoryModel` unchanged. The PaymentHistoryModel operates as an optional bonus that enhances scores for returning platform tenants while not penalizing new users.

## Standard Stack

### Core (Already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 10.x | Framework | Already used in Phase 5 scoring |
| Prisma | 7.x | ORM | Already used for Payment, Lease models |
| BullMQ | 5.x | Async processing | Already used for scoring jobs |

### Supporting (No new dependencies needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-validator | 0.14.x | DTO validation | Already available |
| @nestjs/swagger | 7.x | API documentation | Already available |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate PaymentHistoryModel | Extend HistoryModel | Keep separate for clarity - HistoryModel handles references (static), PaymentHistoryModel handles payments (dynamic) |
| Database trigger for score updates | BullMQ job on payment recorded | BullMQ gives more control and retry logic |
| Cached scores | Real-time calculation | Calculate on-demand since scoring is already async via BullMQ |

**Installation:**
```bash
# No new dependencies required - all needed libraries already installed
```

## Architecture Patterns

### Recommended Project Structure
```
src/scoring/
├── features/
│   ├── scoring-features.interface.ts    # Add payment history fields
│   └── feature-builder.ts               # Extend to include payment metrics
├── models/
│   ├── financial-model.ts               # Existing (35 pts)
│   ├── stability-model.ts               # Existing (25 pts)
│   ├── history-model.ts                 # Existing (15 pts) - references
│   ├── integrity-engine.ts              # Existing (25 pts)
│   └── payment-history-model.ts         # NEW (up to +15 bonus pts)
├── aggregator/
│   ├── score-aggregator.ts              # Update to include payment bonus
│   └── risk-score-result.interface.ts   # Add paymentHistoryScore field
├── services/
│   └── payment-history.service.ts       # NEW - query payment metrics
└── dto/
    └── payment-reputation.dto.ts        # NEW - tenant reputation response
```

### Pattern 1: PaymentHistoryModel as Bonus Model
**What:** A scoring model that adds bonus points (0-15) rather than consuming from the base 100.
**When to use:** When enhancing scores with optional platform data that not all users have.
**Example:**
```typescript
// Source: Based on existing scoring pattern in src/scoring/models/
@Injectable()
export class PaymentHistoryModel {
  private readonly MAX_BONUS = 15; // Bonus points, not part of base 100

  calculate(metrics: PaymentHistoryMetrics): ModelResult {
    let score = 0;
    const signals: Signal[] = [];

    // On-time payment percentage (max 8 bonus pts)
    score += this.scoreOnTimePayments(metrics.onTimePercentage, signals);

    // Late payment penalty (up to -10 pts, can offset other bonuses)
    score += this.scoreLatePayments(metrics.latePaymentCount, signals);

    // Tenure bonus (max 5 pts for long-term tenants)
    score += this.scoreTenure(metrics.totalMonthsOnPlatform, signals);

    // Returning tenant bonus (max 2 pts)
    if (metrics.isReturningTenant) {
      score += 2;
      signals.push({ code: 'RETURNING_TENANT', positive: true, weight: 2, message: '...' });
    }

    return {
      score: Math.max(0, Math.min(this.MAX_BONUS, score)),
      maxScore: this.MAX_BONUS,
      signals,
    };
  }
}
```

### Pattern 2: PaymentHistoryService for Metrics Calculation
**What:** Service that queries payment data and calculates metrics for a tenant across all leases.
**When to use:** Separates data access from scoring logic.
**Example:**
```typescript
// Source: Based on existing PaymentsService pattern
@Injectable()
export class PaymentHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetricsForTenant(tenantId: string): Promise<PaymentHistoryMetrics> {
    // Get all leases for tenant
    const leases = await this.prisma.lease.findMany({
      where: { tenantId },
      include: { payments: true },
    });

    // Calculate metrics across all leases
    const allPayments = leases.flatMap(l => l.payments);
    const totalMonthsExpected = this.calculateExpectedPayments(leases);
    const onTimePayments = this.countOnTimePayments(leases);
    const latePayments = this.countLatePayments(leases);

    return {
      totalPayments: allPayments.length,
      onTimePercentage: totalMonthsExpected > 0
        ? onTimePayments / totalMonthsExpected
        : 0,
      latePaymentCount: latePayments,
      totalMonthsOnPlatform: this.calculateTotalTenure(leases),
      totalAmountPaid: allPayments.reduce((sum, p) => sum + p.amount, 0),
      isReturningTenant: leases.length > 1,
      leaseCount: leases.length,
    };
  }

  private countOnTimePayments(leases: LeaseWithPayments[]): number {
    // Payment is on-time if paymentDate <= payment due date
    // Due date = paymentDay of periodMonth/periodYear
    // ...
  }
}
```

### Pattern 3: Tenant Reputation Endpoint
**What:** REST endpoint for tenants to view their payment reputation score.
**When to use:** Tenant dashboard feature showing their payment standing.
**Example:**
```typescript
// GET /tenants/me/payment-reputation
@Get('me/payment-reputation')
@Roles(Role.TENANT, Role.BOTH)
async getMyPaymentReputation(@CurrentUser() user: User): Promise<PaymentReputationDto> {
  const metrics = await this.paymentHistoryService.getMetricsForTenant(user.id);
  const modelResult = this.paymentHistoryModel.calculate(metrics);

  return {
    score: modelResult.score,
    maxScore: modelResult.maxScore,
    onTimePercentage: metrics.onTimePercentage,
    totalPayments: metrics.totalPayments,
    totalMonthsOnPlatform: metrics.totalMonthsOnPlatform,
    signals: modelResult.signals,
    tier: this.calculateTier(modelResult.score), // GOLD, SILVER, BRONZE, NEW
  };
}
```

### Anti-Patterns to Avoid
- **Modifying existing score weights:** Don't reduce existing model weights (35+25+15+25=100). Payment history is a BONUS on top.
- **Penalizing new tenants:** Tenants with no platform history should not be penalized - they simply don't get the bonus.
- **Real-time scoring on payment record:** Don't recalculate scores immediately - payment history only matters when scoring a NEW application.
- **Single-lease metrics:** Always aggregate across ALL tenant leases for complete picture.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Late payment detection | Simple date comparison | Consider grace periods, payment day from lease | Late = paymentDate > dueDate, but dueDate = paymentDay of period, and there may be grace period |
| Expected payments calculation | Count months in lease | Handle partial months, early termination | Lease from Mar 15 to Jun 10 = partial months |
| Score aggregation | Manual addition | Existing ScoreAggregator pattern | Maintains consistency with current scoring |
| Async job processing | Custom queue | Existing BullMQ setup | Already configured in ScoringModule |

**Key insight:** The existing scoring infrastructure is well-designed. Payment history scoring is an extension, not a replacement.

## Common Pitfalls

### Pitfall 1: Penalizing Tenants Without History
**What goes wrong:** New tenants or first-time platform users get lower scores.
**Why it happens:** Treating "no data" as "bad data".
**How to avoid:** Make payment history a BONUS only. Base score is 0-100, payment bonus adds up to +15.
**Warning signs:** Code that starts at 15 and deducts for missing payments.

### Pitfall 2: Incorrect On-Time Calculation
**What goes wrong:** Payments marked late when they're actually on time.
**Why it happens:** Not considering payment grace periods, payment day variations.
**How to avoid:**
- Payment due date = paymentDay of lease for that period month/year
- Compare paymentDate from Payment record vs due date
- Consider 5-day grace period (common in Colombia)
**Warning signs:** Many "late" payments that users dispute.

### Pitfall 3: Missing Payments vs Unpaid Periods
**What goes wrong:** Confusing "no Payment record" with "tenant didn't pay".
**Why it happens:** The system only has records for payments that were entered.
**How to avoid:**
- Calculate expected payments based on lease duration
- Missing Payment records = unpaid periods (assuming landlord records all payments)
- Document this assumption clearly
**Warning signs:** Tenants with 100% on-time but few Payment records.

### Pitfall 4: Race Condition on Score Update
**What goes wrong:** Score calculated before all payments recorded.
**Why it happens:** Payment history queried at exact moment of application.
**How to avoid:** Payment history is a snapshot at scoring time - this is expected behavior.
**Warning signs:** None - this is acceptable given scoring is point-in-time.

### Pitfall 5: Score Weight Imbalance
**What goes wrong:** Payment bonus overwhelms other factors.
**Why it happens:** +15 bonus on top of 100 base = 115 possible, but risk levels calibrated for 0-100.
**How to avoid:**
- Cap total score at 100 in aggregator
- OR adjust risk level thresholds (A = 80+, etc.)
- Consider making bonus smaller (max +10)
**Warning signs:** All returning tenants getting A regardless of other factors.

## Code Examples

### Payment History Metrics Interface
```typescript
// Source: Based on existing ScoringFeatures pattern
export interface PaymentHistoryMetrics {
  /** Total number of recorded payments across all leases */
  totalPayments: number;

  /** Percentage of payments made on time (0.0 to 1.0) */
  onTimePercentage: number;

  /** Number of late payments (> grace period after due date) */
  latePaymentCount: number;

  /** Number of very late payments (30+ days) */
  severelyLateCount: number;

  /** Total months as tenant on platform across all leases */
  totalMonthsOnPlatform: number;

  /** Total COP paid across all leases */
  totalAmountPaid: number;

  /** Whether tenant has completed at least one full lease */
  isReturningTenant: boolean;

  /** Number of leases (current and historical) */
  leaseCount: number;

  /** Months since first lease started (platform tenure) */
  platformTenureMonths: number;
}
```

### On-Time Payment Detection
```typescript
// Source: Colombian rental law typically allows 5-day grace period
const GRACE_PERIOD_DAYS = 5;

function isPaymentOnTime(
  payment: Payment,
  lease: Lease,
): boolean {
  // Due date is the paymentDay of the period month/year
  const dueDate = new Date(payment.periodYear, payment.periodMonth - 1, lease.paymentDay);

  // Add grace period
  const gracePeriodEnd = new Date(dueDate);
  gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

  // Payment is on-time if made by grace period end
  return payment.paymentDate <= gracePeriodEnd;
}

function calculateExpectedPayments(lease: Lease): number {
  const start = new Date(lease.startDate);
  const end = new Date(lease.endDate);
  const today = new Date();

  // End date is earlier of lease end or today
  const effectiveEnd = end < today ? end : today;

  // Count months between start and effective end
  const months = (effectiveEnd.getFullYear() - start.getFullYear()) * 12
    + (effectiveEnd.getMonth() - start.getMonth());

  return Math.max(0, months);
}
```

### Payment History Model Scoring Logic
```typescript
// Source: Based on FICO payment history weighting (35% of score)
// and industry standard rent scoring practices

// On-time percentage scoring (max 8 bonus pts)
function scoreOnTimePayments(percentage: number, signals: Signal[]): number {
  if (percentage >= 1.0) {
    signals.push({
      code: 'PERFECT_PAYMENT_HISTORY',
      positive: true,
      weight: 8,
      message: '100% de pagos a tiempo en la plataforma',
    });
    return 8;
  }
  if (percentage >= 0.95) {
    signals.push({
      code: 'EXCELLENT_PAYMENT_HISTORY',
      positive: true,
      weight: 6,
      message: '95%+ de pagos a tiempo en la plataforma',
    });
    return 6;
  }
  if (percentage >= 0.85) {
    signals.push({
      code: 'GOOD_PAYMENT_HISTORY',
      positive: true,
      weight: 4,
      message: '85%+ de pagos a tiempo en la plataforma',
    });
    return 4;
  }
  if (percentage >= 0.70) {
    signals.push({
      code: 'FAIR_PAYMENT_HISTORY',
      positive: false,
      weight: 2,
      message: '70%+ de pagos a tiempo en la plataforma',
    });
    return 2;
  }
  // < 70% on-time = no bonus
  return 0;
}

// Late payment penalty (can offset bonuses)
function scoreLatePayments(lateCount: number, signals: Signal[]): number {
  if (lateCount === 0) return 0; // No penalty

  if (lateCount >= 3) {
    signals.push({
      code: 'FREQUENT_LATE_PAYMENTS',
      positive: false,
      weight: -10,
      message: '3+ pagos atrasados en historial de plataforma',
    });
    return -10;
  }
  if (lateCount === 2) {
    signals.push({
      code: 'MULTIPLE_LATE_PAYMENTS',
      positive: false,
      weight: -5,
      message: '2 pagos atrasados en historial de plataforma',
    });
    return -5;
  }
  // 1 late payment = minor penalty
  signals.push({
    code: 'SINGLE_LATE_PAYMENT',
    positive: false,
    weight: -2,
    message: '1 pago atrasado en historial de plataforma',
  });
  return -2;
}

// Tenure bonus (max 5 pts)
function scoreTenure(months: number, signals: Signal[]): number {
  if (months >= 24) {
    signals.push({
      code: 'LONG_PLATFORM_TENURE',
      positive: true,
      weight: 5,
      message: '2+ anos como inquilino en la plataforma',
    });
    return 5;
  }
  if (months >= 12) {
    signals.push({
      code: 'MODERATE_PLATFORM_TENURE',
      positive: true,
      weight: 3,
      message: '1+ ano como inquilino en la plataforma',
    });
    return 3;
  }
  if (months >= 6) {
    signals.push({
      code: 'SHORT_PLATFORM_TENURE',
      positive: true,
      weight: 1,
      message: '6+ meses como inquilino en la plataforma',
    });
    return 1;
  }
  return 0;
}
```

### Updated ScoreAggregator Integration
```typescript
// Source: Extending existing ScoreAggregator pattern
combine(results: {
  financial: ModelResult;
  stability: ModelResult;
  history: ModelResult;
  integrity: ModelResult;
  paymentHistory?: ModelResult; // NEW - optional for backward compatibility
}): RiskScoreResultData {
  // Sum base scores (100 max)
  const baseTotal =
    results.financial.score +
    results.stability.score +
    results.history.score +
    results.integrity.score;

  // Add payment history bonus if available (up to +15)
  const paymentBonus = results.paymentHistory?.score ?? 0;

  // Total with bonus, capped at 100 to maintain risk level calibration
  const total = Math.min(100, baseTotal + paymentBonus);

  // Calculate level using existing thresholds
  const level = getRiskLevelFromScore(total);

  return {
    total,
    level,
    categories: {
      integrity: results.integrity.score,
      financial: results.financial.score,
      stability: results.stability.score,
      history: results.history.score,
      paymentHistory: paymentBonus, // NEW category in output
    },
    // ... rest of implementation
  };
}
```

### Tenant Reputation DTO
```typescript
// Source: New DTO for tenant-facing reputation display
export class PaymentReputationDto {
  @ApiProperty({ example: 12, description: 'Payment history bonus score (0-15)' })
  score: number;

  @ApiProperty({ example: 15, description: 'Maximum possible bonus score' })
  maxScore: number;

  @ApiProperty({ example: 0.95, description: 'Percentage of on-time payments (0-1)' })
  onTimePercentage: number;

  @ApiProperty({ example: 18, description: 'Total payments recorded on platform' })
  totalPayments: number;

  @ApiProperty({ example: 1, description: 'Number of late payments' })
  latePaymentCount: number;

  @ApiProperty({ example: 24, description: 'Total months as tenant on platform' })
  totalMonthsOnPlatform: number;

  @ApiProperty({ example: 45000000, description: 'Total COP paid on platform' })
  totalAmountPaid: number;

  @ApiProperty({
    example: 'GOLD',
    enum: ['GOLD', 'SILVER', 'BRONZE', 'NEW'],
    description: 'Reputation tier for display',
  })
  tier: 'GOLD' | 'SILVER' | 'BRONZE' | 'NEW';

  @ApiProperty({ type: [Object], description: 'Score factor signals' })
  signals: Signal[];
}

// Tier calculation
function calculateTier(score: number, monthsOnPlatform: number): string {
  if (monthsOnPlatform < 3) return 'NEW'; // Not enough history
  if (score >= 12) return 'GOLD';   // 80%+ of max bonus
  if (score >= 8) return 'SILVER';  // 53%+ of max bonus
  if (score >= 4) return 'BRONZE';  // 27%+ of max bonus
  return 'NEW'; // Low score despite history
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Credit bureau only | Platform payment history + credit | 2023-2024 | Fintech companies like Esusu, Bilt report rent to credit bureaus |
| Binary late/on-time | Trended data (24 months) | VantageScore 4.0 | Patterns matter, not just snapshots |
| Medical debt in score | Medical debt excluded | 2025 | Fairer scoring, less volatility |
| FICO only | Resident Score 2.0 (TransUnion) | 2022+ | Rental-specific scoring models |

**Deprecated/outdated:**
- Single-point-in-time credit checks: Modern approaches analyze trends
- Penalizing lack of history: Best practice is neutral/bonus approach
- One-size-fits-all thresholds: Colombian market may need different calibration

## Database Queries

### Key Prisma Queries for Payment History
```typescript
// Get all payment data for a tenant
const leases = await this.prisma.lease.findMany({
  where: { tenantId },
  include: {
    payments: {
      orderBy: [
        { periodYear: 'asc' },
        { periodMonth: 'asc' },
      ],
    },
  },
});

// Get tenant lease history summary
const summary = await this.prisma.lease.aggregate({
  where: { tenantId },
  _count: { id: true },
  _sum: { monthlyRent: true },
  _min: { startDate: true },
});

// Get payment statistics
const paymentStats = await this.prisma.payment.groupBy({
  by: ['leaseId'],
  where: {
    lease: { tenantId },
  },
  _count: { id: true },
  _sum: { amount: true },
});
```

## Open Questions

Things that couldn't be fully resolved:

1. **Grace Period Definition**
   - What we know: Colombian law typically allows grace periods
   - What's unclear: Exact days (5? 10?) and whether landlords can customize
   - Recommendation: Default to 5 days, consider making configurable per lease

2. **Score Cap Strategy**
   - What we know: Base score is 100, bonus adds up to 15
   - What's unclear: Should total cap at 100, or allow 115 for "super tenants"?
   - Recommendation: Cap at 100 to maintain risk level calibration integrity

3. **Partial Month Handling**
   - What we know: Leases can start/end mid-month
   - What's unclear: Is payment expected for partial months?
   - Recommendation: First and last month payments expected if >= 15 days in period

4. **Data Freshness Requirements**
   - What we know: Metrics calculated on-demand during scoring
   - What's unclear: Should there be a cached/precomputed score?
   - Recommendation: Calculate real-time for now, add caching if performance requires

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis: `src/scoring/` directory structure and patterns
- Existing codebase: `src/leases/payments.service.ts`, `prisma/schema.prisma`
- Phase 5 planning docs: `.planning/phases/05-scoring-engine/05-02-PLAN.md`

### Secondary (MEDIUM confidence)
- [myFICO - How Payment History Impacts Your Credit Score](https://www.myfico.com/credit-education/credit-scores/payment-history) - 35% weight benchmark
- [SingleKey - What Is a Tenant Score](https://www.singlekey.com/what-is-tenant-score/) - Tenant-specific scoring approach
- [LeaseRunner - Resident Score vs Credit Score](https://www.leaserunner.com/blog/resident-score-vs-credit-score) - TransUnion ResidentScore methodology

### Tertiary (LOW confidence)
- [Urban Institute - On-Time Rental Payment History](https://www.urban.org/urban-wire/including-time-rental-payment-history-credit-scoring-could-help-narrow-black-white) - Rent reporting impact analysis
- [Leasey.AI - Tenant Loyalty Programs](https://www.leasey.ai/resources/tenant-loyalty-programs-implementation-management-software/) - Loyalty/rewards concepts

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, extends existing patterns
- Architecture: HIGH - Clear extension points in existing scoring system
- Scoring algorithm: MEDIUM - Based on industry standards, may need Colombian market calibration
- Pitfalls: HIGH - Well-understood from credit scoring industry

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - stable domain, existing architecture)
