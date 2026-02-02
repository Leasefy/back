# Phase 8: Leases & Payments - Research

**Researched:** 2026-02-01
**Domain:** Lease lifecycle management, payment tracking, event-driven architecture
**Confidence:** HIGH

## Summary

Phase 8 implements lease tracking and payment recording for the Colombian rental market. When a Contract transitions to ACTIVE status (both parties have signed), a Lease record should be automatically created. The Lease tracks the ongoing rental relationship with its own lifecycle (ACTIVE, ENDING_SOON, ENDED, TERMINATED). Landlords manually record payments by reference number (PSE CUS, bank transfer reference, or cash receipt) - no payment gateway integration is needed.

The implementation requires three main components:
1. **Lease model** - Created automatically from ACTIVE contracts, denormalizes key property/tenant/landlord info for reporting
2. **Payment model** - Records individual payments with Colombian payment method support and reference numbers
3. **Event-driven trigger** - Uses `@nestjs/event-emitter` to create Lease when Contract becomes ACTIVE

**Primary recommendation:** Use `@nestjs/event-emitter` to emit `contract.activated` event, create a listener in LeasesModule that creates the Lease. Payment methods should support PSE (with CUS reference), bank transfer, cash, and Nequi/Daviplata. Store payment reference numbers as strings (flexible format for different payment types).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/event-emitter | 3.x | Event-driven lease creation | Official NestJS module, built on eventemitter2 |
| @prisma/client | 7.x | Database access | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | 3.x | Date calculations (ending_soon detection) | Already patterns in codebase |
| @nestjs/bullmq | 11.x | Async payment processing if needed | Already configured for scoring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nestjs/event-emitter | Prisma middleware | Event emitter is more flexible, middleware is implicit |
| @nestjs/event-emitter | Direct service call | Events decouple contracts from leases module |
| Separate Payment model | JSON array in Lease | Separate model allows proper querying, indexing |

**Installation:**
```bash
npm install @nestjs/event-emitter
```

Note: date-fns may already be available or use native Date APIs with Intl for Colombian formatting.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── leases/
│   ├── leases.module.ts
│   ├── leases.controller.ts
│   ├── leases.service.ts
│   ├── state-machine/
│   │   └── lease-state-machine.ts       # ACTIVE -> ENDING_SOON -> ENDED
│   ├── events/
│   │   ├── contract-activated.event.ts  # Event class
│   │   └── contract-activated.listener.ts  # Creates Lease
│   ├── payments/
│   │   ├── payments.service.ts          # Payment CRUD
│   │   └── payments.controller.ts       # Payment endpoints (nested or separate)
│   └── dto/
│       ├── create-payment.dto.ts
│       ├── lease-response.dto.ts
│       ├── payment-response.dto.ts
│       └── index.ts
├── contracts/
│   └── contracts.service.ts             # Emit event when contract becomes ACTIVE
```

### Pattern 1: Event-Driven Lease Creation
**What:** Emit event when Contract becomes ACTIVE, listener creates Lease
**When to use:** Contract transitions from SIGNED to ACTIVE
**Example:**
```typescript
// events/contract-activated.event.ts
export class ContractActivatedEvent {
  constructor(
    public readonly contractId: string,
    public readonly propertyId: string,
    public readonly landlordId: string,
    public readonly tenantId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly monthlyRent: number,
    public readonly deposit: number,
    public readonly paymentDay: number,
  ) {}
}

// In ContractsService (contracts module)
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class ContractsService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    // ... other deps
  ) {}

  async activateContract(contractId: string): Promise<Contract> {
    const contract = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.ACTIVE,
        activatedAt: new Date(),
      },
      include: { property: true },
    });

    // Emit event for lease creation
    this.eventEmitter.emit(
      'contract.activated',
      new ContractActivatedEvent(
        contract.id,
        contract.propertyId,
        contract.landlordId,
        contract.tenantId,
        contract.startDate,
        contract.endDate,
        contract.monthlyRent,
        contract.deposit,
        contract.paymentDay,
      ),
    );

    return contract;
  }
}
```

### Pattern 2: Lease Status State Machine
**What:** Manage lease lifecycle with explicit state transitions
**When to use:** All lease status changes
**Example:**
```typescript
// Lease statuses
enum LeaseStatus {
  ACTIVE = 'ACTIVE',           // Lease is active, tenant in property
  ENDING_SOON = 'ENDING_SOON', // Within 30 days of end date
  ENDED = 'ENDED',             // Natural termination at end date
  TERMINATED = 'TERMINATED',   // Early termination
}

const transitions: Record<LeaseStatus, LeaseStatus[]> = {
  [LeaseStatus.ACTIVE]: [
    LeaseStatus.ENDING_SOON,
    LeaseStatus.TERMINATED,
  ],
  [LeaseStatus.ENDING_SOON]: [
    LeaseStatus.ENDED,
    LeaseStatus.TERMINATED,
    LeaseStatus.ACTIVE,  // Renewal extends dates, back to ACTIVE
  ],
  [LeaseStatus.ENDED]: [],       // Terminal
  [LeaseStatus.TERMINATED]: [],  // Terminal
};
```

### Pattern 3: Denormalized Lease Data
**What:** Store key property/tenant/landlord info directly in Lease for reporting
**When to use:** Lease creation and display
**Example:**
```typescript
// Why denormalize: Lease reports shouldn't break if property details change
interface LeaseData {
  // IDs for relations
  contractId: string;
  propertyId: string;
  landlordId: string;
  tenantId: string;

  // Denormalized at lease creation time
  propertyAddress: string;
  propertyCity: string;
  landlordName: string;
  landlordEmail: string;
  tenantName: string;
  tenantEmail: string;
  tenantPhone: string | null;

  // Contract terms (immutable copy)
  startDate: Date;
  endDate: Date;
  monthlyRent: number;
  deposit: number;
  paymentDay: number;
}
```

### Pattern 4: Colombian Payment Methods
**What:** Enum for payment methods used in Colombia
**When to use:** Recording any payment
**Example:**
```typescript
// Colombian payment methods for rental payments
enum PaymentMethod {
  PSE = 'PSE',                     // Pagos Seguros en Linea (bank transfer via PSE)
  BANK_TRANSFER = 'BANK_TRANSFER', // Direct bank transfer (transferencia bancaria)
  CASH = 'CASH',                   // Efectivo
  NEQUI = 'NEQUI',                 // Nequi wallet (Bancolombia)
  DAVIPLATA = 'DAVIPLATA',         // Daviplata wallet (Davivienda)
  CHECK = 'CHECK',                 // Cheque (less common but still used)
}

// Reference number formats:
// PSE: CUS code (alphanumeric, ~12-16 chars), e.g., "CUS123456789012"
// Bank transfer: Reference number from bank receipt (varies by bank)
// Cash: Manual receipt number assigned by landlord
// Nequi/Daviplata: Transaction ID from app
```

### Pattern 5: Payment Recording (Manual, No Gateway)
**What:** Landlord manually records payments received
**When to use:** After landlord receives payment via any method
**Example:**
```typescript
// Payment is recorded by landlord, not processed through our system
interface PaymentRecord {
  leaseId: string;
  amount: number;              // COP amount
  method: PaymentMethod;
  referenceNumber: string;     // Flexible format per payment method
  paymentDate: Date;           // When payment was made
  periodMonth: number;         // Which month rent this covers (1-12)
  periodYear: number;          // Which year this payment covers
  notes?: string;              // Optional landlord notes
  recordedBy: string;          // landlordId who recorded
  recordedAt: Date;            // When this record was created
}
```

### Anti-Patterns to Avoid
- **Direct service coupling:** Don't call LeasesService from ContractsService - use events
- **Modifying contract terms on lease:** Lease stores snapshot of terms at creation, don't update if contract changes
- **Complex payment validation:** We're recording payments, not processing them - keep validation light
- **Storing payment method as string:** Use enum for type safety and consistency
- **Separate endpoint per payment method:** Use single endpoint with method field in DTO

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Event emission | Custom pub/sub | @nestjs/event-emitter | NestJS native, typed events |
| State transitions | if/else chains | State machine pattern | Already used for contracts |
| Date formatting | String manipulation | Intl.DateTimeFormat or date-fns | Handles Colombian locale |
| Lease status checking | Manual date comparison | Scheduled job or lazy eval | Needs consistency |
| Payment period tracking | Calculate on query | Store periodMonth/periodYear | Simple queries for payment history |

**Key insight:** Payment recording is simple data entry - the complexity is in ensuring the Lease is created at the right time and tracking which months are paid. Don't over-engineer the payment side.

## Common Pitfalls

### Pitfall 1: Creating Lease Too Early
**What goes wrong:** Lease created when contract is SIGNED but not yet ACTIVE
**Why it happens:** Confusion between SIGNED (both signed) and ACTIVE (contract in effect)
**How to avoid:** Only create Lease when contract becomes ACTIVE (startDate has arrived or manual activation)
**Warning signs:** Leases exist for contracts with future startDate

### Pitfall 2: Not Handling Contract Start Date
**What goes wrong:** Contract is SIGNED but Lease should only exist when rental period begins
**Why it happens:** No mechanism to activate contracts when startDate arrives
**How to avoid:** Either (1) scheduled job checks SIGNED contracts daily, or (2) lazy activation on first access, or (3) manual activation by landlord
**Warning signs:** Contracts stuck in SIGNED status past startDate

### Pitfall 3: Payment Period Ambiguity
**What goes wrong:** Can't tell which month a payment covers
**Why it happens:** Only stored payment date, not period
**How to avoid:** Store periodMonth and periodYear explicitly in payment record
**Warning signs:** Multiple payments on same date with no distinction

### Pitfall 4: Reference Number Validation Too Strict
**What goes wrong:** Valid payments rejected because reference format varies
**Why it happens:** Tried to validate PSE CUS format strictly
**How to avoid:** Store referenceNumber as free-text string, validate only required/max-length
**Warning signs:** Landlords complaining they can't record payments

### Pitfall 5: Not Updating Property Status
**What goes wrong:** Property shows as AVAILABLE when it has active lease
**Why it happens:** Forgot to update property.status when lease created
**How to avoid:** In lease creation listener, update property.status = RENTED
**Warning signs:** Properties with active leases showing in search results

### Pitfall 6: Circular Module Dependencies
**What goes wrong:** LeasesModule imports ContractsModule and vice versa
**Why it happens:** Trying to call services directly instead of events
**How to avoid:** Use @nestjs/event-emitter for cross-module communication
**Warning signs:** "Nest cannot resolve dependencies" errors

## Code Examples

Verified patterns for this implementation:

### Lease and Payment Models (Prisma)
```prisma
/// Status of a lease
/// ACTIVE: Lease in effect, tenant occupying
/// ENDING_SOON: Within 30 days of end date
/// ENDED: Natural termination at end date
/// TERMINATED: Early termination
enum LeaseStatus {
  ACTIVE
  ENDING_SOON
  ENDED
  TERMINATED
}

/// Payment method used for rent payment
enum PaymentMethod {
  PSE
  BANK_TRANSFER
  CASH
  NEQUI
  DAVIPLATA
  CHECK
}

/// Active lease tracking the rental relationship
/// Created automatically when Contract becomes ACTIVE
model Lease {
  id         String      @id @default(uuid()) @db.Uuid
  contractId String      @unique @map("contract_id") @db.Uuid
  propertyId String      @map("property_id") @db.Uuid
  landlordId String      @map("landlord_id") @db.Uuid
  tenantId   String      @map("tenant_id") @db.Uuid
  status     LeaseStatus @default(ACTIVE)

  // Denormalized data (snapshot at lease creation)
  propertyAddress String @map("property_address") @db.VarChar(300)
  propertyCity    String @map("property_city") @db.VarChar(50)
  landlordName    String @map("landlord_name") @db.VarChar(100)
  landlordEmail   String @map("landlord_email") @db.VarChar(255)
  tenantName      String @map("tenant_name") @db.VarChar(100)
  tenantEmail     String @map("tenant_email") @db.VarChar(255)
  tenantPhone     String? @map("tenant_phone") @db.VarChar(20)

  // Contract terms (immutable copy)
  startDate   DateTime @map("start_date") @db.Date
  endDate     DateTime @map("end_date") @db.Date
  monthlyRent Int      @map("monthly_rent")
  deposit     Int
  paymentDay  Int      @map("payment_day") // 1-28

  // Timestamps
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  // Relations
  contract Contract  @relation(fields: [contractId], references: [id])
  property Property  @relation(fields: [propertyId], references: [id])
  landlord User      @relation("LandlordLeases", fields: [landlordId], references: [id])
  tenant   User      @relation("TenantLeases", fields: [tenantId], references: [id])
  payments Payment[]

  @@index([landlordId])
  @@index([tenantId])
  @@index([propertyId])
  @@index([status])
  @@map("leases")
}

/// Payment record for lease rent
/// Recorded manually by landlord when payment received
model Payment {
  id              String        @id @default(uuid()) @db.Uuid
  leaseId         String        @map("lease_id") @db.Uuid
  amount          Int           // COP amount
  method          PaymentMethod
  referenceNumber String        @map("reference_number") @db.VarChar(100)

  // Payment timing
  paymentDate     DateTime      @map("payment_date") @db.Date  // When paid
  periodMonth     Int           @map("period_month")           // 1-12
  periodYear      Int           @map("period_year")            // e.g., 2026

  // Optional
  notes           String?       @db.VarChar(500)

  // Audit
  recordedBy      String        @map("recorded_by") @db.Uuid   // Landlord who recorded
  createdAt       DateTime      @default(now()) @map("created_at")

  // Relations
  lease    Lease @relation(fields: [leaseId], references: [id], onDelete: Cascade)
  recorder User  @relation("RecordedPayments", fields: [recordedBy], references: [id])

  // Prevent duplicate payment records for same month
  @@unique([leaseId, periodMonth, periodYear])
  @@index([leaseId])
  @@index([paymentDate])
  @@map("payments")
}
```

### Event Emitter Setup
```typescript
// app.module.ts
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    EventEmitterModule.forRoot({
      // Wildcards allow 'contract.*' event matching
      wildcard: false,
      // Use native errors
      ignoreErrors: false,
    }),
    // ... other modules
  ],
})
export class AppModule {}
```

### Contract Activated Event
```typescript
// src/leases/events/contract-activated.event.ts
export class ContractActivatedEvent {
  constructor(
    public readonly contractId: string,
    public readonly propertyId: string,
    public readonly landlordId: string,
    public readonly tenantId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly monthlyRent: number,
    public readonly deposit: number,
    public readonly paymentDay: number,
    // Denormalized data
    public readonly propertyAddress: string,
    public readonly propertyCity: string,
    public readonly landlordName: string,
    public readonly landlordEmail: string,
    public readonly tenantName: string,
    public readonly tenantEmail: string,
    public readonly tenantPhone: string | null,
  ) {}
}
```

### Contract Activated Listener
```typescript
// src/leases/events/contract-activated.listener.ts
import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service.js';
import { ContractActivatedEvent } from './contract-activated.event.js';
import { LeaseStatus, PropertyStatus } from '../../common/enums/index.js';

@Injectable()
export class ContractActivatedListener {
  private readonly logger = new Logger(ContractActivatedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('contract.activated')
  async handleContractActivated(event: ContractActivatedEvent): Promise<void> {
    this.logger.log(`Creating lease for contract ${event.contractId}`);

    // Use transaction to create lease and update property atomically
    await this.prisma.$transaction(async (tx) => {
      // Create the lease
      await tx.lease.create({
        data: {
          contractId: event.contractId,
          propertyId: event.propertyId,
          landlordId: event.landlordId,
          tenantId: event.tenantId,
          status: LeaseStatus.ACTIVE,
          propertyAddress: event.propertyAddress,
          propertyCity: event.propertyCity,
          landlordName: event.landlordName,
          landlordEmail: event.landlordEmail,
          tenantName: event.tenantName,
          tenantEmail: event.tenantEmail,
          tenantPhone: event.tenantPhone,
          startDate: event.startDate,
          endDate: event.endDate,
          monthlyRent: event.monthlyRent,
          deposit: event.deposit,
          paymentDay: event.paymentDay,
        },
      });

      // Update property status to RENTED
      await tx.property.update({
        where: { id: event.propertyId },
        data: { status: PropertyStatus.RENTED },
      });
    });

    this.logger.log(`Lease created for contract ${event.contractId}`);
  }
}
```

### Create Payment DTO
```typescript
// src/leases/dto/create-payment.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsInt,
  IsEnum,
  IsString,
  IsDateString,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';
import { PaymentMethod } from '../../common/enums/index.js';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Lease ID' })
  @IsUUID()
  leaseId!: string;

  @ApiProperty({ example: 2500000, description: 'Amount in COP' })
  @IsInt()
  @Min(1)
  amount!: number;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.PSE })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({
    example: 'CUS123456789012',
    description: 'Payment reference number (PSE CUS, bank reference, receipt #)',
  })
  @IsString()
  @MaxLength(100)
  referenceNumber!: string;

  @ApiProperty({ example: '2026-02-05', description: 'Date payment was made' })
  @IsDateString()
  paymentDate!: string;

  @ApiProperty({ example: 2, description: 'Month this payment covers (1-12)' })
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth!: number;

  @ApiProperty({ example: 2026, description: 'Year this payment covers' })
  @IsInt()
  @Min(2020)
  @Max(2100)
  periodYear!: number;

  @ApiPropertyOptional({ example: 'Paid via Nequi transfer' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
```

### LeasesController Endpoints
```typescript
// src/leases/leases.controller.ts
@ApiTags('Leases')
@ApiBearerAuth()
@Controller('leases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeasesController {
  constructor(
    private readonly leasesService: LeasesService,
    private readonly paymentsService: PaymentsService,
  ) {}

  // LEAS-07: Tenant can view active lease
  @Get('my-lease')
  @Roles(Role.TENANT, Role.BOTH)
  @ApiOperation({ summary: 'Get current active lease (tenant)' })
  async getMyLease(@CurrentUser() user: User) {
    return this.leasesService.getActiveLeaseForTenant(user.id);
  }

  // LEAS-08: Landlord can view all their leases
  @Get()
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'List all leases (landlord)' })
  async listLeases(@CurrentUser() user: User) {
    return this.leasesService.listForLandlord(user.id);
  }

  // Get lease details (either party)
  @Get(':id')
  @ApiOperation({ summary: 'Get lease details' })
  async getById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.leasesService.getById(id, user.id);
  }

  // LEAS-04: Landlord can record payment
  @Post(':id/payments')
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Record payment received' })
  async recordPayment(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) leaseId: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.recordPayment(user.id, leaseId, dto);
  }

  // LEAS-06: Payment history visible to both parties
  @Get(':id/payments')
  @ApiOperation({ summary: 'Get payment history for lease' })
  async getPaymentHistory(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) leaseId: string,
  ) {
    return this.paymentsService.getPaymentHistory(leaseId, user.id);
  }
}
```

### TypeScript Enums
```typescript
// src/common/enums/lease-status.enum.ts
export enum LeaseStatus {
  ACTIVE = 'ACTIVE',
  ENDING_SOON = 'ENDING_SOON',
  ENDED = 'ENDED',
  TERMINATED = 'TERMINATED',
}

// src/common/enums/payment-method.enum.ts
export enum PaymentMethod {
  PSE = 'PSE',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CASH = 'CASH',
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',
  CHECK = 'CHECK',
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Direct service calls | Event-driven architecture | 2020+ | Decoupled modules, easier testing |
| Payment gateway integration | Manual payment recording | Domain-specific | Lower complexity for landlord-recorded payments |
| Complex payment validation | Reference number as string | Practical approach | Flexibility for Colombian payment diversity |
| Property status manual update | Event listener handles | Best practice | Consistency, no forgotten updates |

**Current best practices:**
- Event emitter for cross-module communication (avoids circular dependencies)
- Denormalize data that needs to be stable for reporting/history
- Keep payment recording simple - it's data entry, not payment processing
- Use explicit period (month/year) rather than calculating from date
- Unique constraint on lease + period prevents duplicate payments

## Open Questions

Things that couldn't be fully resolved:

1. **Contract Activation Trigger**
   - What we know: Contract goes SIGNED -> ACTIVE
   - What's unclear: Automatic when startDate arrives (cron job) or manual landlord action?
   - Recommendation: Start with manual activation endpoint, add scheduled job later if needed

2. **ENDING_SOON Transition**
   - What we know: Should transition when within 30 days of endDate
   - What's unclear: Scheduled job or lazy evaluation when lease accessed?
   - Recommendation: Lazy evaluation on read - update status if within 30 days

3. **Payment Due Date Tracking (LEAS-07)**
   - What we know: paymentDay stored in lease, requirement mentions "due dates tracked"
   - What's unclear: Generate due dates or just display paymentDay?
   - Recommendation: Calculate next due date from paymentDay + check if paid for current month

4. **Lease Renewal**
   - What we know: Not in current requirements
   - What's unclear: How to handle lease extensions?
   - Recommendation: Out of scope for Phase 8 - can be added later by creating new contract

5. **Partial Payments**
   - What we know: Payment has single amount field
   - What's unclear: What if tenant pays less than monthlyRent?
   - Recommendation: Allow any amount, notes field for landlord to document. Don't block.

## Sources

### Primary (HIGH confidence)
- Existing codebase: ContractStatus enum, ContractStateMachine, ScoringModule (BullMQ pattern)
- [NestJS Event Emitter Documentation](https://docs.nestjs.com/techniques/events) - Official event emitter pattern
- [NestJS Event Emitter NPM](https://www.npmjs.com/package/@nestjs/event-emitter) - v3.0.1 latest
- Colombian payment methods verified via [Conduit Pay Colombia Guide](https://conduitpay.com/guides/ultimate-guide-to-payments-in-colombia)

### Secondary (MEDIUM confidence)
- [PSE Colombia](https://www.pse.com.co/persona) - PSE reference number format (CUS)
- [DolarApp Colombia Reference](https://www.dolarapp.com/es-CO/blog/your-money/que-es-referencia-en-transferencia-bancaria) - Bank transfer reference formats
- [Baselane Lease Management](https://www.baselane.com/resources/best-lease-management-software-for-tenants) - Lease management patterns

### Tertiary (LOW confidence)
- None identified - all claims verified with codebase or official sources

## Metadata

**Confidence breakdown:**
- Lease model design: HIGH - Follows existing codebase patterns, denormalization is standard
- Payment model design: HIGH - Simple recording model, verified payment methods
- Event-driven pattern: HIGH - Official NestJS module, documented pattern
- State machine: HIGH - Mirrors existing ContractStateMachine

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - patterns are stable)

## Key Decisions for Planning

1. **Event library:** `@nestjs/event-emitter` (install required)
2. **Lease creation trigger:** Event listener on `contract.activated` event
3. **Payment methods:** PSE, BANK_TRANSFER, CASH, NEQUI, DAVIPLATA, CHECK enum
4. **Reference number:** Flexible string field (max 100 chars), no format validation
5. **Payment period:** Explicit periodMonth/periodYear fields, unique constraint
6. **Denormalization:** Lease stores snapshot of property/tenant/landlord info at creation
7. **State machine:** New LeaseStateMachine following ContractStateMachine pattern
8. **Property update:** Listener sets property.status = RENTED when lease created
9. **Activation:** Start with manual ContractsService.activateContract() endpoint

## Requirements Mapping

| Requirement | Implementation |
|-------------|---------------|
| LEAS-01: Lease from signed contract | ContractActivatedListener creates Lease when contract.activated event |
| LEAS-02: Lease status tracked | LeaseStatus enum (ACTIVE, ENDING_SOON, ENDED, TERMINATED) |
| LEAS-03: Denormalized info | Lease model includes propertyAddress, tenantName, etc. |
| LEAS-04: Landlord records payment | POST /leases/:id/payments |
| LEAS-05: Payment methods | PaymentMethod enum with Colombian options |
| LEAS-06: Payment history visible | GET /leases/:id/payments (both parties) |
| LEAS-07: Tenant view lease | GET /leases/my-lease |
| LEAS-08: Landlord view leases | GET /leases |
