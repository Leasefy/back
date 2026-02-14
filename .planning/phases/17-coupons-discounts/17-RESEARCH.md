# Phase 17: Coupons & Discounts - Research

**Researched:** 2026-02-08
**Domain:** Coupon code management for subscription discounts
**Confidence:** HIGH

## Summary

Phase 17 implements a coupon code system for subscription discounts, previously deferred from Phase 12 (requirements SUBS-06, SUBS-07). The system must support admin coupon management (CRUD operations), user validation before applying, four discount types (PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS), redemption tracking per user to prevent reuse, and comprehensive validation including expiry dates and usage limits.

The implementation builds on top of the existing subscription infrastructure from Phase 12, which already has database-driven plan limits, PseMockService for payment processing, and clear separation between tenant and landlord plans. The coupon system will integrate seamlessly with the subscription creation and plan change flows, applying discounts before PSE mock payment processing.

**Primary recommendation:** Use Prisma models with compound unique constraints for usage tracking, implement atomic increment operations for usage counts, leverage NestJS validation decorators for coupon validation, and follow the existing subscription service patterns for discount application logic.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | ^6.x | Database ORM with enum/model support | Already used for subscriptions, supports compound unique constraints for coupon-user tracking |
| NestJS class-validator | ^0.14.x | DTO validation decorators | Already used throughout codebase, provides @IsEnum, @IsISO8601, @Min decorators |
| NestJS @nestjs/common | ^10.x | Injectable services, decorators, guards | Core framework for controllers and services |
| @nestjs/swagger | ^7.x | API documentation | Already used for OpenAPI spec generation |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| uuid | ^9.x | Coupon ID generation | Already in dependencies, use for primary keys |
| date-fns | (optional) | Date manipulation for expiry checks | Only if complex date logic needed, native Date may suffice |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database-driven coupons | In-memory cache (Redis) | Cache improves read performance but adds complexity; start with DB, add cache if needed |
| Prisma compound unique | Application-level tracking | DB constraint is more reliable and prevents race conditions |
| Enum-based discount types | String with validation | Enums provide type safety and prevent typos |

**Installation:**
```bash
# No new packages required - all dependencies already present
npm install  # Ensures existing packages are up to date
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── coupons/
│   ├── dto/
│   │   ├── create-coupon.dto.ts       # Admin: create coupon
│   │   ├── update-coupon.dto.ts       # Admin: update coupon
│   │   ├── validate-coupon.dto.ts     # User: validate coupon code
│   │   └── index.ts                   # Barrel export
│   ├── coupons.controller.ts          # Endpoints: POST /admin/coupons, GET /admin/coupons, etc.
│   ├── coupons.service.ts             # Admin CRUD operations
│   ├── coupon-validation.service.ts   # User validation logic (expiry, usage limits, plan applicability)
│   ├── coupon-application.service.ts  # Apply discount to subscription price
│   └── coupons.module.ts              # Module registration
├── common/
│   └── enums/
│       ├── coupon-type.enum.ts        # PERCENTAGE, FIXED_AMOUNT, FREE_MONTHS, FULL_ACCESS
│       └── index.ts                   # Export
└── subscriptions/
    └── services/
        └── subscriptions.service.ts   # Modified: integrate coupon application
```

### Pattern 1: Coupon Model with Usage Tracking

**What:** Separate Coupon and CouponUsage models with compound unique constraint preventing duplicate redemptions.

**When to use:** Always - this is the core data model for the phase.

**Example:**
```typescript
// prisma/schema.prisma
enum CouponType {
  PERCENTAGE
  FIXED_AMOUNT
  FREE_MONTHS
  FULL_ACCESS
}

model Coupon {
  id              String      @id @default(uuid()) @db.Uuid
  code            String      @unique @db.VarChar(50)  // User-facing code (e.g., "WELCOME2026")
  type            CouponType

  // Discount values (only one will be used based on type)
  percentageOff   Int?        @map("percentage_off")  // 1-100 for PERCENTAGE
  amountOff       Int?        @map("amount_off")      // COP for FIXED_AMOUNT
  freeMonths      Int?        @map("free_months")     // Number of months for FREE_MONTHS

  // Validity
  validFrom       DateTime    @map("valid_from")
  validUntil      DateTime    @map("valid_until")

  // Usage limits
  maxUses         Int?        @map("max_uses")        // null = unlimited
  currentUses     Int         @default(0) @map("current_uses")

  // Plan applicability
  applicablePlans String[]    @map("applicable_plans") // ["TENANT_PRO", "LANDLORD_BUSINESS"] or [] for all

  isActive        Boolean     @default(true) @map("is_active")
  createdAt       DateTime    @default(now()) @map("created_at")
  updatedAt       DateTime    @updatedAt @map("updated_at")

  // Relations
  usages          CouponUsage[]

  @@index([code])
  @@index([isActive])
  @@index([validUntil])
  @@map("coupons")
}

model CouponUsage {
  id              String      @id @default(uuid()) @db.Uuid
  couponId        String      @map("coupon_id") @db.Uuid
  userId          String      @map("user_id") @db.Uuid
  subscriptionId  String?     @map("subscription_id") @db.Uuid  // Reference to subscription if used
  usedAt          DateTime    @default(now()) @map("used_at")

  // Relations
  coupon          Coupon      @relation(fields: [couponId], references: [id], onDelete: Cascade)

  @@unique([couponId, userId])  // Prevent user from reusing same coupon
  @@index([userId])
  @@map("coupon_usages")
}
```

**Source:** [Prisma compound unique constraints documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints)

### Pattern 2: Coupon Validation Service

**What:** Separate injectable service for validation logic, keeping business rules isolated and testable.

**When to use:** Always - separates validation concerns from CRUD and application logic.

**Example:**
```typescript
// src/coupons/coupon-validation.service.ts
@Injectable()
export class CouponValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validateCoupon(
    code: string,
    userId: string,
    planId: string,
  ): Promise<{ valid: boolean; message: string; coupon?: Coupon }> {
    // 1. Find coupon by code
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
      include: { usages: true },
    });

    if (!coupon) {
      return { valid: false, message: 'Código de cupón no válido' };
    }

    // 2. Check active status
    if (!coupon.isActive) {
      return { valid: false, message: 'Este cupón está desactivado' };
    }

    // 3. Check date validity
    const now = new Date();
    if (now < coupon.validFrom) {
      return { valid: false, message: 'Este cupón aún no es válido' };
    }
    if (now > coupon.validUntil) {
      return { valid: false, message: 'Este cupón ha expirado' };
    }

    // 4. Check max uses
    if (coupon.maxUses !== null && coupon.currentUses >= coupon.maxUses) {
      return { valid: false, message: 'Este cupón ha alcanzado su límite de uso' };
    }

    // 5. Check user hasn't already used it
    const userUsage = coupon.usages.find(u => u.userId === userId);
    if (userUsage) {
      return { valid: false, message: 'Ya has usado este cupón' };
    }

    // 6. Check plan applicability
    if (coupon.applicablePlans.length > 0) {
      const plan = await this.prisma.subscriptionPlanConfig.findUnique({
        where: { id: planId },
      });

      const planKey = `${plan.planType}_${plan.tier}`;
      if (!coupon.applicablePlans.includes(planKey)) {
        return {
          valid: false,
          message: 'Este cupón no es aplicable al plan seleccionado'
        };
      }
    }

    return { valid: true, message: 'Cupón válido', coupon };
  }
}
```

**Source:** Pattern follows existing validation service architecture from codebase (e.g., payment-validation.service.ts)

### Pattern 3: Discount Application Logic

**What:** Calculate final price after coupon discount, integrating with subscription service flow.

**When to use:** During subscription creation and plan changes when coupon is provided.

**Example:**
```typescript
// src/coupons/coupon-application.service.ts
@Injectable()
export class CouponApplicationService {
  applyDiscount(
    originalPrice: number,
    coupon: Coupon,
  ): { finalPrice: number; discountAmount: number; freeMonths?: number } {
    let finalPrice = originalPrice;
    let discountAmount = 0;
    let freeMonths: number | undefined;

    switch (coupon.type) {
      case CouponType.PERCENTAGE:
        discountAmount = Math.floor((originalPrice * coupon.percentageOff!) / 100);
        finalPrice = originalPrice - discountAmount;
        break;

      case CouponType.FIXED_AMOUNT:
        discountAmount = Math.min(coupon.amountOff!, originalPrice);
        finalPrice = originalPrice - discountAmount;
        break;

      case CouponType.FREE_MONTHS:
        // For FREE_MONTHS, first period is free, track free months count
        finalPrice = 0;
        discountAmount = originalPrice;
        freeMonths = coupon.freeMonths;
        break;

      case CouponType.FULL_ACCESS:
        // FULL_ACCESS: 100% off for the period
        finalPrice = 0;
        discountAmount = originalPrice;
        break;
    }

    return { finalPrice, discountAmount, freeMonths };
  }
}
```

**Source:** [Discount calculation patterns](https://www.calculator.net/discount-calculator.html), adapted for subscription context

### Pattern 4: Atomic Usage Increment

**What:** Use Prisma atomic increment and transaction to prevent race conditions when tracking usage.

**When to use:** When recording successful coupon usage after subscription creation.

**Example:**
```typescript
// src/coupons/coupons.service.ts
async recordUsage(couponId: string, userId: string, subscriptionId: string): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // Increment currentUses atomically
    await tx.coupon.update({
      where: { id: couponId },
      data: { currentUses: { increment: 1 } },
    });

    // Create usage record
    await tx.couponUsage.create({
      data: {
        couponId,
        userId,
        subscriptionId,
      },
    });
  });
}
```

**Source:** [Prisma transactions documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

### Pattern 5: Admin CRUD Controller

**What:** Admin-only endpoints for coupon management using @Roles(Role.ADMIN) decorator.

**When to use:** Always for admin operations.

**Example:**
```typescript
// src/coupons/coupons.controller.ts
@ApiTags('Admin - Cupones')
@Controller('admin/coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear cupón (Admin)' })
  async create(@Body() dto: CreateCouponDto) {
    return this.couponsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar cupones (Admin)' })
  async findAll() {
    return this.couponsService.findAll();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar cupón (Admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCouponDto,
  ) {
    return this.couponsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desactivar cupón (Admin)' })
  async deactivate(@Param('id', ParseUUIDPipe) id: string) {
    return this.couponsService.deactivate(id);
  }
}

@ApiTags('Cupones')
@Controller('coupons')
export class CouponsPublicController {
  constructor(
    private readonly validationService: CouponValidationService,
  ) {}

  @Post('validate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Validar cupón antes de aplicar' })
  async validate(
    @CurrentUser('id') userId: string,
    @Body() dto: ValidateCouponDto,
  ) {
    return this.validationService.validateCoupon(
      dto.code,
      userId,
      dto.planId,
    );
  }
}
```

**Source:** Pattern follows existing admin controller from subscription-plans.controller.ts

### Anti-Patterns to Avoid

- **String-based discount types:** Use enums (CouponType) instead of strings to prevent typos and enable type-safety
- **Application-level usage tracking:** Always use database compound unique constraints to prevent race conditions
- **Hardcoded coupon codes:** Store all coupons in database with admin management, never hardcode
- **Skipping validation before applying:** Always validate coupon before allowing user to proceed with payment
- **Allowing negative final prices:** Always ensure finalPrice >= 0 after discount application
- **Reusing coupon codes:** Once deactivated, never reactivate; create new coupon with new code instead

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Coupon code generation | Random string generator with collision checks | uuid v4 + human-readable suffix or admin-provided codes | Code collision prevention is complex; let DB enforce uniqueness |
| Date range validation | Custom date comparison logic | ISO 8601 dates + native Date comparison | Date arithmetic has many edge cases (timezones, leap years) |
| Atomic increment | Read-modify-write pattern | Prisma `{ increment: 1 }` | Prevents race conditions in concurrent usage |
| User authentication | Custom auth middleware | Existing @CurrentUser decorator from auth module | Already implemented and tested |
| DTO validation | Manual validation checks | class-validator decorators (@IsEnum, @IsISO8601, @Min) | Handles edge cases, provides consistent error messages |

**Key insight:** Coupon systems have many edge cases (concurrent usage, expiry edge cases, complex discount combinations). Use existing proven patterns and DB constraints rather than custom logic.

## Common Pitfalls

### Pitfall 1: Race Condition on Usage Increment

**What goes wrong:** Two users redeem the same coupon simultaneously, both see currentUses = 99, maxUses = 100, both increment to 100, coupon used 101 times.

**Why it happens:** Read-modify-write pattern without atomic operations or transactions.

**How to avoid:** Use Prisma atomic increment: `data: { currentUses: { increment: 1 } }` within a transaction that also creates CouponUsage record.

**Warning signs:** currentUses exceeds maxUses in database, duplicate CouponUsage records for same userId.

**Source:** [Prisma atomic updates documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions)

### Pitfall 2: Timezone Edge Cases with Expiry Dates

**What goes wrong:** Coupon expires at "2026-02-28" but user in Colombia can't use it on Feb 28 because server uses UTC and it's already Feb 29 UTC.

**Why it happens:** Storing dates without timezone context or not normalizing to UTC.

**How to avoid:** Always store validFrom/validUntil as DateTime in UTC, compare with `new Date()` (which is always UTC in Node.js). Consider end-of-day expiry (23:59:59) rather than start-of-day.

**Warning signs:** Users complaining coupon expired early, discrepancies based on user location.

### Pitfall 3: Allowing Reuse via Case Sensitivity

**What goes wrong:** User uses "WELCOME2026", then tries "welcome2026" or "Welcome2026" and it works again.

**Why it happens:** Code lookup is case-sensitive, compound unique constraint doesn't catch different cases.

**How to avoid:** Always normalize code to uppercase on creation and lookup: `code: code.toUpperCase()`. Make code field @unique and always query with uppercase.

**Warning signs:** Same user has multiple CouponUsage records for codes that differ only in case.

### Pitfall 4: Not Validating Plan Applicability Early

**What goes wrong:** User validates coupon "LANDLORD50" on tenant plan, sees "valid", proceeds to checkout, then fails at subscription creation.

**Why it happens:** Validation endpoint doesn't receive planId, can't check applicablePlans.

**How to avoid:** ValidateCouponDto must include planId, validation service checks applicablePlans before returning valid=true.

**Warning signs:** High validation success rate but low actual usage rate, user complaints about "valid" coupons not working.

### Pitfall 5: FREE_MONTHS Implementation Confusion

**What goes wrong:** User applies "3 free months" coupon, subscription created with $0 payment, after 1 month they're charged because system doesn't track remaining free months.

**Why it happens:** No mechanism to track how many free months remain after coupon application.

**How to avoid:** Store freeMonthsRemaining on Subscription model, decrement each billing cycle. Alternatively, adjust endDate to include free months and track separately.

**Warning signs:** Users charged earlier than expected, confusion about when free period ends.

**Source:** [Stripe subscription coupon duration patterns](https://docs.stripe.com/billing/subscriptions/coupons)

### Pitfall 6: Security - Brute Force Code Guessing

**What goes wrong:** Attacker tries "WELCOME2026", "PROMO2026", "SAVE50", etc. until they find valid codes.

**Why it happens:** No rate limiting on validation endpoint, predictable code patterns.

**How to avoid:**
1. Use long, random, non-predictable codes (e.g., "W3LC0M3-XJ9K2")
2. Implement rate limiting on POST /coupons/validate (e.g., 10 requests per minute per user)
3. Log validation attempts for monitoring

**Warning signs:** High volume of failed validation attempts from single IP/user, unusual validation patterns.

**Source:** [Coupon fraud prevention tactics](https://www.talon.one/blog/how-to-guarantee-coupon-security-4-tactics), [Brute force attack prevention](https://medium.com/perimeterx/prevent-brute-force-attacks-coupon-fraud-gift-card-fraud-199a02c5d43)

### Pitfall 7: Not Handling FULL_ACCESS Type Properly

**What goes wrong:** FULL_ACCESS coupon applied, user gets $0 subscription but it expires after billing cycle, loses access unexpectedly.

**Why it happens:** FULL_ACCESS is meant to grant ongoing free access, not just one-time $0 payment.

**How to avoid:** For FULL_ACCESS type, create subscription with special flag or set autoRenew=true with couponId reference. On renewal, check if FULL_ACCESS coupon still valid, continue free access.

**Warning signs:** Users with FULL_ACCESS coupons losing access after first period, confusion about "lifetime" vs "one-time" discounts.

## Code Examples

Verified patterns from official sources and existing codebase:

### DTO with Enum Validation
```typescript
// src/coupons/dto/create-coupon.dto.ts
import { IsEnum, IsString, IsInt, Min, Max, IsISO8601, IsOptional, IsArray, Length } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '../../common/enums/index.js';

export class CreateCouponDto {
  @ApiProperty({ description: 'Código del cupón (único, ej: WELCOME2026)' })
  @IsString()
  @Length(3, 50)
  code: string;

  @ApiProperty({
    description: 'Tipo de cupón',
    enum: CouponType,
  })
  @IsEnum(CouponType)
  type: CouponType;

  @ApiPropertyOptional({ description: 'Porcentaje de descuento (1-100, solo para PERCENTAGE)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentageOff?: number;

  @ApiPropertyOptional({ description: 'Monto fijo de descuento en COP (solo para FIXED_AMOUNT)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountOff?: number;

  @ApiPropertyOptional({ description: 'Número de meses gratis (solo para FREE_MONTHS)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  freeMonths?: number;

  @ApiProperty({ description: 'Fecha de inicio de validez (ISO 8601)' })
  @IsISO8601()
  validFrom: string;

  @ApiProperty({ description: 'Fecha de fin de validez (ISO 8601)' })
  @IsISO8601()
  validUntil: string;

  @ApiPropertyOptional({ description: 'Máximo número de usos (null = ilimitado)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Planes aplicables (ej: ["TENANT_PRO", "LANDLORD_BUSINESS"], vacío = todos)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlans?: string[];
}
```

**Source:** [NestJS validation decorators guide](https://medium.com/@mohamad-alaskari/nestjs-dto-validation-cheat-sheet-with-class-validator-64d5092a9858)

### Service Integration with Subscriptions
```typescript
// src/subscriptions/dto/create-subscription.dto.ts
// Add optional coupon field
@ApiPropertyOptional({ description: 'Código de cupón (opcional)' })
@IsOptional()
@IsString()
couponCode?: string;

// src/subscriptions/services/subscriptions.service.ts
// Modified subscribe method
async subscribe(
  userId: string,
  dto: CreateSubscriptionDto,
): Promise<{
  subscription: Subscription;
  paymentResult: { transactionId: string; status: string; message: string } | null;
}> {
  const plan = await this.plansService.findById(dto.planId);

  if (!plan.isActive) {
    throw new BadRequestException('Este plan no esta disponible');
  }

  let price = dto.cycle === BillingCycle.MONTHLY ? plan.monthlyPrice : plan.annualPrice;
  let appliedCoupon: Coupon | null = null;

  // Apply coupon if provided
  if (dto.couponCode) {
    const validation = await this.couponValidationService.validateCoupon(
      dto.couponCode,
      userId,
      dto.planId,
    );

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    appliedCoupon = validation.coupon!;
    const discount = this.couponApplicationService.applyDiscount(price, appliedCoupon);
    price = discount.finalPrice;
  }

  const now = new Date();
  const endDate = this.calculateEndDate(now, dto.cycle);

  // If FREE plan or price is $0 (due to coupon), no payment needed
  if ((plan.tier as string) === SubscriptionPlan.FREE || price === 0) {
    await this.expireExistingSubscriptions(userId);

    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: dto.planId,
        status: SubscriptionStatus.ACTIVE,
        cycle: dto.cycle,
        startDate: now,
        endDate,
        autoRenew: true,
      },
    });

    // Update user
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionPlan: plan.tier,
        subscriptionEndsAt: endDate,
      },
    });

    // Record coupon usage if applied
    if (appliedCoupon) {
      await this.couponsService.recordUsage(appliedCoupon.id, userId, subscription.id);
    }

    return { subscription, paymentResult: null };
  }

  // Process payment with reduced price...
  // (rest of existing payment logic)
}
```

**Source:** Pattern follows existing subscription service architecture from Phase 12

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded promo codes in config | Database-driven with admin UI | 2020+ | Marketers can manage campaigns without developer involvement |
| Global max usage only | Per-user tracking with compound constraints | 2021+ | Prevents abuse while allowing legitimate sharing |
| Single discount type (percentage) | Multiple types (%, $, free months, full access) | 2022+ | Flexible campaign strategies |
| Coupon stacking allowed by default | Explicit stacking rules configuration | 2023+ | Prevents margin erosion from unintended stacking |
| Manual validation at checkout | Pre-validation endpoint with instant feedback | 2024+ | Better UX, reduces cart abandonment |

**Deprecated/outdated:**
- **Manual coupon code generation:** Replaced by admin UI with uniqueness validation
- **Session-based usage tracking:** Now database-backed to prevent clearing cookies to reuse
- **Percentage-only discounts:** Multiple discount types are now standard

**Source:** [Coupon management evolution trends](https://www.voucherify.io/blog/what-is-coupon-stacking-and-why-you-should-do-it)

## Open Questions

1. **Coupon Stacking Policy**
   - What we know: Frontend shows single coupon input, industry best practice is to limit stacking
   - What's unclear: Should system allow multiple coupons per subscription (e.g., "WELCOME" + "STUDENT")?
   - Recommendation: Start with single coupon per subscription (no stacking), add stacking rules in future if needed

2. **FREE_MONTHS Billing Cycle Handling**
   - What we know: FREE_MONTHS should provide X free months, then charge at full price
   - What's unclear: How to track remaining free months across billing cycles
   - Recommendation: Add `freeMonthsRemaining` to Subscription model, decrement on each renewal. When 0, charge full price.

3. **FULL_ACCESS Duration**
   - What we know: FULL_ACCESS provides complete free access
   - What's unclear: Is this for one billing cycle or ongoing until coupon expires?
   - Recommendation: Interpret as ongoing - subscription remains free while coupon is valid. Check coupon validity on each renewal.

4. **Coupon Analytics**
   - What we know: Admin needs to track coupon usage
   - What's unclear: What metrics are most important? (total uses, revenue impact, user acquisition)
   - Recommendation: Start with basic counts (currentUses, usages.length), add revenue tracking in future phase if needed

5. **Applying Coupons to Existing Subscriptions**
   - What we know: CreateSubscriptionDto includes couponCode, ChangePlanDto exists
   - What's unclear: Can user apply coupon to change existing subscription to same plan but with discount?
   - Recommendation: Allow coupon in ChangePlanDto (even if changing to same plan), validates and applies discount to new period

## Sources

### Primary (HIGH confidence)
- [Prisma Compound Unique Constraints Documentation](https://www.prisma.io/docs/orm/prisma-client/special-fields-and-types/working-with-composite-ids-and-constraints) - Compound unique constraint implementation
- [Prisma Transactions Documentation](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) - Atomic operations and transaction patterns
- [NestJS Validation Documentation](https://docs.nestjs.com/techniques/validation) - DTO validation with class-validator
- Leasify codebase - Existing subscription service patterns, controller structure, enum definitions

### Secondary (MEDIUM confidence)
- [Stripe Coupons Documentation](https://docs.stripe.com/billing/subscriptions/coupons) - Industry-standard coupon duration patterns (verified by multiple implementations)
- [Medium: NestJS DTO Validation Cheat Sheet](https://medium.com/@mohamad-alaskari/nestjs-dto-validation-cheat-sheet-with-class-validator-64d5092a9858) - Decorator usage patterns (verified against official docs)
- [Talon.One: 7 Essential Tactics to Prevent Coupon Fraud](https://www.talon.one/blog/how-to-guarantee-coupon-security-4-tactics) - Security best practices (verified by multiple sources)
- [FraudLabs Pro: Coupon Code Validation](https://medium.com/@fraudlabspro/coupon-code-validation-a-smarter-way-to-prevent-discount-abuse-73a825d1e5be) - Validation patterns and fraud prevention

### Secondary (MEDIUM confidence) - Discount Calculation
- [Calculator.net: Discount Calculator](https://www.calculator.net/discount-calculator.html) - Mathematical formulas for percentage and fixed amount discounts
- [GeeksforGeeks: Design Coupon and Voucher Management System](https://www.geeksforgeeks.org/system-design/design-coupon-and-voucher-management-system/) - System design patterns
- [Voucherify: Coupon Stacking Guide](https://www.voucherify.io/blog/what-is-coupon-stacking-and-why-you-should-do-it) - Stacking rules and business implications

### Tertiary (LOW confidence - for future validation)
- Various coupon management SaaS platforms (Talon.One, Voucherify) - Feature sets indicate market expectations but implementation details not verified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, Prisma and NestJS patterns well-documented
- Architecture: HIGH - Follows existing subscription service patterns, Prisma schema patterns verified in official docs
- Pitfalls: MEDIUM-HIGH - Race conditions and timezone issues well-documented, specific FREE_MONTHS handling based on Stripe patterns (widely adopted but not verified in all contexts)
- Security: MEDIUM - Best practices from industry sources, needs validation against specific threat model

**Research date:** 2026-02-08
**Valid until:** 2026-03-08 (30 days - stable domain)

**Key dependencies verified:**
- Phase 12 subscription infrastructure: ✓ Implemented
- Prisma ORM with enums: ✓ Already in use
- NestJS validation decorators: ✓ Already in use
- Admin authentication (@Roles decorator): ✓ Already in use
- PSE mock payment service: ✓ Available for integration

**Integration points:**
- SubscriptionsService.subscribe(): Add optional couponCode parameter
- SubscriptionsService.changePlan(): Add optional couponCode parameter
- CreateSubscriptionDto: Add optional couponCode field
- ChangePlanDto: Add optional couponCode field
- AppModule: Register CouponsModule
