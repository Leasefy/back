# Phase 10: Tenant Payment Simulation - Research

**Researched:** 2026-02-02
**Domain:** Tenant-initiated payments, receipt upload, PSE mock, payment disputes
**Confidence:** HIGH

## Summary

Phase 10 extends the existing payment infrastructure (Phase 8) to allow **tenants** to initiate payments rather than having landlords record them after the fact. This is a fundamental shift: instead of landlord-recorded payments, tenants can now submit payment requests with either a receipt (comprobante) for bank transfers or through a mock PSE flow.

The implementation requires three new database models:
1. **LandlordPaymentMethod** - Bank accounts configured by landlord for tenants to see
2. **TenantPaymentRequest** - Payment submissions with receipts, pending landlord validation
3. **PaymentDispute** - Disputes when landlord rejects a payment

The existing `Payment` model from Phase 8 remains unchanged - approved payment requests convert into Payment records via the existing flow. This ensures Phase 9's payment history scoring continues to work without modification.

**Primary recommendation:** Create a new `tenant-payments` module separate from the existing `leases` module. Use the existing `application-documents` Supabase bucket with a new folder structure (`receipts/{leaseId}/`) rather than creating a new bucket. PSE mock should simulate the flow with a simple state machine (PENDING -> SUCCESS/FAILURE) rather than calling external APIs.

## Standard Stack

### Core (Already in codebase)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/common | 10.x | Framework | Existing codebase |
| @prisma/client | 7.x | Database ORM | Existing codebase |
| @supabase/supabase-js | 2.x | Storage for receipts | Existing - used for document uploads |
| file-type | 19.x | Magic number validation | Existing - used in DocumentsService |
| class-validator | 0.14.x | DTO validation | Existing |

### Supporting (No new dependencies)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| multer | 1.x | File upload handling | Already configured via @nestjs/platform-express |
| @nestjs/event-emitter | 3.x | Event-driven workflows | Already configured - use for payment approved events |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Reuse existing Payment model | New TenantPaymentRequest | Keep models separate - TenantPaymentRequest is a REQUEST, Payment is a RECORD |
| New Supabase bucket | Reuse application-documents | Single bucket is simpler to manage, just use folder structure |
| External PSE sandbox | Mock in-app | No external dependencies, faster development, full control |
| Separate dispute module | Inline in tenant-payments | Start inline, extract if complexity grows |

**Installation:**
```bash
# No new dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── tenant-payments/
│   ├── tenant-payments.module.ts
│   ├── tenant-payments.controller.ts
│   ├── tenant-payments.service.ts
│   ├── dto/
│   │   ├── create-payment-request.dto.ts
│   │   ├── validate-payment.dto.ts
│   │   ├── pse-mock-request.dto.ts
│   │   ├── create-dispute.dto.ts
│   │   └── index.ts
│   ├── landlord-payment-methods/
│   │   ├── landlord-payment-methods.service.ts
│   │   ├── landlord-payment-methods.controller.ts
│   │   └── dto/
│   │       ├── create-payment-method.dto.ts
│   │       └── update-payment-method.dto.ts
│   ├── pse-mock/
│   │   ├── pse-mock.service.ts
│   │   └── pse-mock.controller.ts
│   ├── disputes/
│   │   ├── disputes.service.ts
│   │   └── disputes.controller.ts
│   └── receipt-storage/
│       └── receipt-storage.service.ts
├── leases/
│   └── payments.service.ts           # Existing - used to create Payment on approval
```

### Pattern 1: Two-Phase Payment (Request then Approval)
**What:** Tenant submits payment request, landlord validates, system creates Payment record
**When to use:** All tenant-initiated payments
**Example:**
```typescript
// Flow: TenantPaymentRequest (PENDING) -> Landlord validates -> Payment created
// 1. Tenant creates TenantPaymentRequest with receipt
// 2. Landlord reviews and approves/rejects
// 3. If approved: create Payment via existing PaymentsService
// 4. If rejected: tenant can open dispute

async approvePayment(requestId: string, landlordId: string): Promise<Payment> {
  const request = await this.findRequestWithAccess(requestId, landlordId);

  // Use existing PaymentsService to create the Payment record
  const payment = await this.paymentsService.recordPayment(
    landlordId,
    request.leaseId,
    {
      amount: request.amount,
      method: request.paymentMethod,
      referenceNumber: request.referenceNumber ?? `TPAY-${requestId.slice(0, 8)}`,
      paymentDate: request.paymentDate.toISOString().split('T')[0],
      periodMonth: request.periodMonth,
      periodYear: request.periodYear,
      notes: `Approved from tenant payment request ${requestId}`,
    },
  );

  // Update request status
  await this.prisma.tenantPaymentRequest.update({
    where: { id: requestId },
    data: {
      status: 'APPROVED',
      validatedAt: new Date(),
      validatedBy: landlordId,
      paymentId: payment.id,
    },
  });

  return payment;
}
```

### Pattern 2: PSE Mock Flow
**What:** Simulate PSE payment flow without external integration
**When to use:** Tenant selects PSE as payment method
**Example:**
```typescript
// PSE Mock simulates bank selection and payment confirmation
// Returns simulated success/failure based on mock rules

interface PseMockRequest {
  leaseId: string;
  amount: number;
  periodMonth: number;
  periodYear: number;
  // Mock form data
  personType: 'NATURAL' | 'JURIDICA';
  documentType: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
  documentNumber: string;
  fullName: string;
  email: string;
  bankCode: string; // From list of Colombian banks
}

interface PseMockResponse {
  transactionId: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
  bankName: string;
  timestamp: Date;
}

// Mock success rate: 85% success, 10% failure, 5% pending
// Use document number last digit for deterministic testing:
// - Ends in 0: FAILURE (insufficient funds)
// - Ends in 1: FAILURE (bank rejected)
// - Ends in 9: PENDING (requires manual review)
// - All others: SUCCESS
```

### Pattern 3: Receipt Upload with Validation
**What:** Tenant uploads payment receipt (comprobante) for bank transfer
**When to use:** Transfer or Nequi/Daviplata payments
**Example:**
```typescript
// Receipt validation follows existing DocumentsService pattern
const ALLOWED_RECEIPT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_RECEIPT_SIZE = 5 * 1024 * 1024; // 5MB

// Storage path: receipts/{leaseId}/{requestId}-{timestamp}.{ext}
// Reuse application-documents bucket with folder structure
```

### Pattern 4: Dispute Workflow
**What:** When landlord rejects payment, tenant can open dispute
**When to use:** Rejected payments where tenant believes they paid correctly
**Example:**
```typescript
enum DisputeStatus {
  OPEN = 'OPEN',
  UNDER_REVIEW = 'UNDER_REVIEW',
  RESOLVED_FAVOR_TENANT = 'RESOLVED_FAVOR_TENANT',
  RESOLVED_FAVOR_LANDLORD = 'RESOLVED_FAVOR_LANDLORD',
  CLOSED = 'CLOSED',
}

// Dispute includes:
// - Original payment request reference
// - Tenant's explanation
// - Additional evidence (optional file upload)
// - Admin/support resolution
```

### Anti-Patterns to Avoid
- **Modifying existing Payment model:** Keep TenantPaymentRequest separate - different lifecycle
- **Creating new Supabase bucket:** Reuse existing bucket with folder structure
- **Complex PSE integration:** Mock is sufficient for FREE tier
- **Automatic approval:** Always require landlord validation for receipt-based payments
- **Storing bank account numbers unencrypted:** While account numbers aren't highly sensitive, treat as PII

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File validation | Custom MIME check | file-type library (existing) | Magic number validation, not extension |
| Receipt storage | New bucket/service | Extend DocumentsService pattern | Consistent patterns, signed URLs |
| Payment creation | New payment logic | Existing PaymentsService.recordPayment | Reuses validation, prevents duplicates |
| Colombian bank list | Hardcode | Static list in config/enum | Easy to update, type-safe |
| Signed URLs | Custom implementation | Supabase createSignedUrl | Already implemented in DocumentsService |

**Key insight:** Phase 10 is mostly about workflow (tenant requests -> landlord validates) not payment processing. The actual payment recording uses existing Phase 8 infrastructure.

## Common Pitfalls

### Pitfall 1: Breaking Phase 9 Payment History Scoring
**What goes wrong:** Payment history metrics stop working
**Why it happens:** Changing Payment model or bypassing PaymentsService
**How to avoid:** Approved TenantPaymentRequests MUST create Payment records via existing PaymentsService.recordPayment
**Warning signs:** Approved payments not appearing in payment history

### Pitfall 2: Receipt URL Exposure
**What goes wrong:** Payment receipts accessible without authentication
**Why it happens:** Using public bucket or not using signed URLs
**How to avoid:**
- Use private bucket (application-documents is already private)
- Always use signed URLs with expiration
- Verify user access before generating URL
**Warning signs:** Receipts accessible via direct URL

### Pitfall 3: Race Condition on Duplicate Payments
**What goes wrong:** Tenant submits same payment twice, both get approved
**Why it happens:** No unique constraint on pending requests
**How to avoid:**
- Add unique constraint on [leaseId, periodMonth, periodYear, status=PENDING]
- Check for existing Payment record before creating request
**Warning signs:** Duplicate payments for same period

### Pitfall 4: Landlord Not Seeing Tenant's Bank Transfer Target
**What goes wrong:** Tenant transfers to wrong account
**Why it happens:** Landlord payment methods not displayed correctly
**How to avoid:**
- Display ALL landlord's configured payment methods to tenant
- Show clear account details (bank, account type, number, holder name)
- Include instructions/notes from landlord
**Warning signs:** Payments to wrong accounts

### Pitfall 5: PSE Mock Too Complex
**What goes wrong:** Development slows due to complex mock
**Why it happens:** Trying to perfectly simulate PSE
**How to avoid:**
- Simple state machine (form -> simulated redirect -> result)
- Deterministic success/failure based on test data
- No actual external API calls
**Warning signs:** Spending time debugging mock instead of building features

### Pitfall 6: Dispute Without Evidence
**What goes wrong:** Disputes are word-against-word with no resolution path
**Why it happens:** No evidence attachment in disputes
**How to avoid:**
- Allow additional file upload in dispute
- Keep original receipt reference in dispute
- Log timestamps for all actions
**Warning signs:** Support can't resolve disputes due to lack of evidence

## Code Examples

### Database Models (Prisma)
```prisma
/// Landlord's configured payment methods for tenants to use
/// TPAY-01, TPAY-02
model LandlordPaymentMethod {
  id           String   @id @default(uuid()) @db.Uuid
  landlordId   String   @map("landlord_id") @db.Uuid

  // Bank account details
  bankName     String   @map("bank_name") @db.VarChar(100)
  accountType  String   @map("account_type") @db.VarChar(50)  // AHORROS, CORRIENTE
  accountNumber String  @map("account_number") @db.VarChar(50)
  holderName   String   @map("holder_name") @db.VarChar(200)

  // For Nequi/Daviplata
  phoneNumber  String?  @map("phone_number") @db.VarChar(20)

  // Payment method type
  methodType   PaymentMethod @map("method_type")  // BANK_TRANSFER, NEQUI, DAVIPLATA

  // Instructions
  instructions String?  @db.VarChar(500)

  // Status
  isActive     Boolean  @default(true) @map("is_active")

  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  // Relations
  landlord     User     @relation("LandlordPaymentMethods", fields: [landlordId], references: [id])

  @@index([landlordId])
  @@index([methodType])
  @@map("landlord_payment_methods")
}

/// Status of a tenant payment request
enum TenantPaymentRequestStatus {
  PENDING_VALIDATION   // Awaiting landlord review
  APPROVED             // Landlord approved, Payment created
  REJECTED             // Landlord rejected
  DISPUTED             // Tenant opened dispute after rejection
  CANCELLED            // Tenant cancelled before validation
}

/// Tenant-initiated payment request (pending landlord validation)
/// TPAY-06 through TPAY-10
model TenantPaymentRequest {
  id               String   @id @default(uuid()) @db.Uuid
  leaseId          String   @map("lease_id") @db.Uuid
  tenantId         String   @map("tenant_id") @db.Uuid

  // Payment details
  amount           Int      // COP amount
  paymentMethod    PaymentMethod @map("payment_method")  // PSE, BANK_TRANSFER, NEQUI, DAVIPLATA
  periodMonth      Int      @map("period_month")  // 1-12
  periodYear       Int      @map("period_year")
  paymentDate      DateTime @map("payment_date") @db.Date

  // For bank transfer: receipt path
  receiptPath      String?  @map("receipt_path") @db.VarChar(500)

  // For PSE: mock transaction reference
  pseTransactionId String?  @map("pse_transaction_id") @db.VarChar(100)
  pseBankCode      String?  @map("pse_bank_code") @db.VarChar(20)

  // Reference number (from receipt or PSE)
  referenceNumber  String?  @map("reference_number") @db.VarChar(100)

  // Status
  status           TenantPaymentRequestStatus @default(PENDING_VALIDATION)

  // Validation
  validatedAt      DateTime? @map("validated_at")
  validatedBy      String?   @map("validated_by") @db.Uuid
  rejectionReason  String?   @map("rejection_reason") @db.VarChar(500)

  // Link to created Payment (if approved)
  paymentId        String?   @unique @map("payment_id") @db.Uuid

  // Timestamps
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  // Relations
  lease            Lease     @relation(fields: [leaseId], references: [id])
  tenant           User      @relation("TenantPaymentRequests", fields: [tenantId], references: [id])
  validator        User?     @relation("PaymentValidations", fields: [validatedBy], references: [id])
  payment          Payment?  @relation(fields: [paymentId], references: [id])
  dispute          PaymentDispute?

  // Prevent duplicate pending requests for same period
  @@unique([leaseId, periodMonth, periodYear, status])
  @@index([leaseId])
  @@index([tenantId])
  @@index([status])
  @@map("tenant_payment_requests")
}

/// Status of a payment dispute
enum PaymentDisputeStatus {
  OPEN                       // Dispute opened by tenant
  UNDER_REVIEW               // Admin reviewing
  RESOLVED_FAVOR_TENANT      // Resolved in tenant's favor (payment approved)
  RESOLVED_FAVOR_LANDLORD    // Resolved in landlord's favor (rejection stands)
  CLOSED                     // Administratively closed
}

/// Dispute for rejected payment
/// TPAY-11, TPAY-12
model PaymentDispute {
  id                     String   @id @default(uuid()) @db.Uuid
  paymentRequestId       String   @unique @map("payment_request_id") @db.Uuid

  // Dispute details
  reason                 String   @db.Text  // Tenant's explanation
  additionalEvidencePath String?  @map("additional_evidence_path") @db.VarChar(500)

  // Status
  status                 PaymentDisputeStatus @default(OPEN)

  // Resolution
  resolvedAt             DateTime? @map("resolved_at")
  resolvedBy             String?   @map("resolved_by") @db.Uuid
  resolution             String?   @db.Text  // Admin's resolution notes

  // Timestamps
  createdAt              DateTime  @default(now()) @map("created_at")
  updatedAt              DateTime  @updatedAt @map("updated_at")

  // Relations
  paymentRequest         TenantPaymentRequest @relation(fields: [paymentRequestId], references: [id])
  resolver               User?                @relation("DisputeResolutions", fields: [resolvedBy], references: [id])

  @@index([status])
  @@map("payment_disputes")
}
```

### Colombian Banks Enum
```typescript
// src/common/enums/colombian-banks.enum.ts

/**
 * Colombian banks for PSE mock and landlord payment methods
 * Source: PSE Colombia bank list
 */
export enum ColombianBank {
  // Major banks
  BANCOLOMBIA = 'BANCOLOMBIA',
  DAVIVIENDA = 'DAVIVIENDA',
  BBVA = 'BBVA',
  BANCO_BOGOTA = 'BANCO_BOGOTA',
  BANCO_OCCIDENTE = 'BANCO_OCCIDENTE',
  BANCO_POPULAR = 'BANCO_POPULAR',
  BANCO_AV_VILLAS = 'BANCO_AV_VILLAS',
  BANCO_CAJA_SOCIAL = 'BANCO_CAJA_SOCIAL',

  // Digital wallets (for PSE)
  NEQUI = 'NEQUI',
  DAVIPLATA = 'DAVIPLATA',

  // Other banks
  SCOTIABANK = 'SCOTIABANK',
  ITAU = 'ITAU',
  BANCOOMEVA = 'BANCOOMEVA',
  BANCO_FALABELLA = 'BANCO_FALABELLA',
  BANCO_PICHINCHA = 'BANCO_PICHINCHA',
}

export const BANK_DISPLAY_NAMES: Record<ColombianBank, string> = {
  [ColombianBank.BANCOLOMBIA]: 'Bancolombia',
  [ColombianBank.DAVIVIENDA]: 'Davivienda',
  [ColombianBank.BBVA]: 'BBVA Colombia',
  [ColombianBank.BANCO_BOGOTA]: 'Banco de Bogota',
  [ColombianBank.BANCO_OCCIDENTE]: 'Banco de Occidente',
  [ColombianBank.BANCO_POPULAR]: 'Banco Popular',
  [ColombianBank.BANCO_AV_VILLAS]: 'Banco AV Villas',
  [ColombianBank.BANCO_CAJA_SOCIAL]: 'Banco Caja Social',
  [ColombianBank.NEQUI]: 'Nequi',
  [ColombianBank.DAVIPLATA]: 'Daviplata',
  [ColombianBank.SCOTIABANK]: 'Scotiabank Colpatria',
  [ColombianBank.ITAU]: 'Itau',
  [ColombianBank.BANCOOMEVA]: 'Bancoomeva',
  [ColombianBank.BANCO_FALABELLA]: 'Banco Falabella',
  [ColombianBank.BANCO_PICHINCHA]: 'Banco Pichincha',
};

// Account types for bank transfers
export enum AccountType {
  AHORROS = 'AHORROS',
  CORRIENTE = 'CORRIENTE',
}

export const ACCOUNT_TYPE_DISPLAY: Record<AccountType, string> = {
  [AccountType.AHORROS]: 'Cuenta de Ahorros',
  [AccountType.CORRIENTE]: 'Cuenta Corriente',
};
```

### Landlord Payment Methods Service
```typescript
// src/tenant-payments/landlord-payment-methods/landlord-payment-methods.service.ts

@Injectable()
export class LandlordPaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a payment method for landlord.
   * TPAY-01, TPAY-02
   */
  async create(
    landlordId: string,
    dto: CreateLandlordPaymentMethodDto,
  ): Promise<LandlordPaymentMethod> {
    return this.prisma.landlordPaymentMethod.create({
      data: {
        landlordId,
        bankName: dto.bankName,
        accountType: dto.accountType,
        accountNumber: dto.accountNumber,
        holderName: dto.holderName,
        phoneNumber: dto.phoneNumber,
        methodType: dto.methodType,
        instructions: dto.instructions,
      },
    });
  }

  /**
   * Get active payment methods for a landlord.
   * Used by landlord to manage their accounts.
   */
  async findAllForLandlord(landlordId: string): Promise<LandlordPaymentMethod[]> {
    return this.prisma.landlordPaymentMethod.findMany({
      where: { landlordId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active payment methods visible to tenant for a specific lease.
   * TPAY-03
   */
  async findForTenant(leaseId: string, tenantId: string): Promise<LandlordPaymentMethod[]> {
    // Verify tenant access to lease
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, tenantId },
    });

    if (!lease) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    // Get landlord's active payment methods
    return this.prisma.landlordPaymentMethod.findMany({
      where: {
        landlordId: lease.landlordId,
        isActive: true,
      },
      orderBy: { methodType: 'asc' },
    });
  }

  /**
   * Deactivate a payment method.
   */
  async deactivate(methodId: string, landlordId: string): Promise<LandlordPaymentMethod> {
    const method = await this.verifyOwnership(methodId, landlordId);

    return this.prisma.landlordPaymentMethod.update({
      where: { id: method.id },
      data: { isActive: false },
    });
  }

  private async verifyOwnership(methodId: string, landlordId: string) {
    const method = await this.prisma.landlordPaymentMethod.findUnique({
      where: { id: methodId },
    });

    if (!method) {
      throw new NotFoundException('Payment method not found');
    }

    if (method.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this payment method');
    }

    return method;
  }
}
```

### Tenant Payment Request Service
```typescript
// src/tenant-payments/tenant-payments.service.ts

@Injectable()
export class TenantPaymentsService {
  private readonly RECEIPT_FOLDER = 'receipts';
  private readonly BUCKET_NAME = 'application-documents';
  private readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  private readonly MAX_SIZE = 5 * 1024 * 1024; // 5MB

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly configService: ConfigService,
    private supabase: SupabaseClient,
  ) {
    this.supabase = createClient(
      this.configService.get('SUPABASE_URL')!,
      this.configService.get('SUPABASE_SERVICE_KEY')!,
    );
  }

  /**
   * Create payment request with receipt upload.
   * TPAY-06, TPAY-09
   */
  async createWithReceipt(
    tenantId: string,
    leaseId: string,
    dto: CreatePaymentRequestDto,
    receiptFile: Express.Multer.File,
  ): Promise<TenantPaymentRequest> {
    // 1. Verify tenant has access to lease
    const lease = await this.verifyTenantAccess(leaseId, tenantId);

    // 2. Auto-fill amount from lease if not provided
    const amount = dto.amount ?? lease.monthlyRent;

    // 3. Check for existing payment or pending request
    await this.checkNoDuplicates(leaseId, dto.periodMonth, dto.periodYear);

    // 4. Validate and upload receipt
    const receiptPath = await this.uploadReceipt(leaseId, receiptFile);

    // 5. Create payment request
    return this.prisma.tenantPaymentRequest.create({
      data: {
        leaseId,
        tenantId,
        amount,
        paymentMethod: dto.paymentMethod,
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        paymentDate: new Date(dto.paymentDate),
        receiptPath,
        referenceNumber: dto.referenceNumber,
        status: 'PENDING_VALIDATION',
      },
    });
  }

  /**
   * Landlord approves payment request.
   * Creates Payment record via existing PaymentsService.
   * TPAY-10
   */
  async approve(requestId: string, landlordId: string): Promise<Payment> {
    const request = await this.verifyLandlordAccess(requestId, landlordId);

    if (request.status !== 'PENDING_VALIDATION') {
      throw new BadRequestException('Can only approve pending requests');
    }

    // Create Payment via existing service (maintains Phase 9 compatibility)
    const payment = await this.paymentsService.recordPayment(
      landlordId,
      request.leaseId,
      {
        amount: request.amount,
        method: request.paymentMethod,
        referenceNumber: request.referenceNumber ?? `TPAY-${requestId.slice(0, 8)}`,
        paymentDate: request.paymentDate.toISOString().split('T')[0],
        periodMonth: request.periodMonth,
        periodYear: request.periodYear,
        notes: `Approved from tenant payment request`,
      },
    );

    // Update request status
    await this.prisma.tenantPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: 'APPROVED',
        validatedAt: new Date(),
        validatedBy: landlordId,
        paymentId: payment.id,
      },
    });

    return payment;
  }

  /**
   * Landlord rejects payment request.
   * TPAY-11 (enables dispute)
   */
  async reject(
    requestId: string,
    landlordId: string,
    reason: string,
  ): Promise<TenantPaymentRequest> {
    const request = await this.verifyLandlordAccess(requestId, landlordId);

    if (request.status !== 'PENDING_VALIDATION') {
      throw new BadRequestException('Can only reject pending requests');
    }

    return this.prisma.tenantPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: 'REJECTED',
        validatedAt: new Date(),
        validatedBy: landlordId,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Get pending requests for landlord validation.
   */
  async getPendingForLandlord(landlordId: string): Promise<TenantPaymentRequest[]> {
    return this.prisma.tenantPaymentRequest.findMany({
      where: {
        status: 'PENDING_VALIDATION',
        lease: { landlordId },
      },
      include: {
        tenant: { select: { firstName: true, lastName: true, email: true } },
        lease: { select: { propertyAddress: true, monthlyRent: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async uploadReceipt(leaseId: string, file: Express.Multer.File): Promise<string> {
    // Validate file
    const { fileTypeFromBuffer } = await import('file-type');
    const result = await fileTypeFromBuffer(file.buffer);

    if (!result || !this.ALLOWED_TYPES.includes(result.mime)) {
      throw new BadRequestException('Invalid file type. Allowed: PDF, JPEG, PNG, WebP');
    }

    if (file.size > this.MAX_SIZE) {
      throw new BadRequestException('File must be less than 5MB');
    }

    // Generate path
    const ext = result.mime.split('/')[1];
    const path = `${this.RECEIPT_FOLDER}/${leaseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    // Upload
    const { error } = await this.supabase.storage
      .from(this.BUCKET_NAME)
      .upload(path, file.buffer, {
        contentType: result.mime,
        upsert: false,
      });

    if (error) {
      throw new BadRequestException(`Failed to upload receipt: ${error.message}`);
    }

    return path;
  }

  // ... helper methods
}
```

### PSE Mock Service
```typescript
// src/tenant-payments/pse-mock/pse-mock.service.ts

export interface PseMockFormData {
  personType: 'NATURAL' | 'JURIDICA';
  documentType: 'CC' | 'CE' | 'NIT' | 'PASAPORTE';
  documentNumber: string;
  fullName: string;
  email: string;
  bankCode: ColombianBank;
}

export interface PseMockResult {
  transactionId: string;
  status: 'SUCCESS' | 'FAILURE' | 'PENDING';
  message: string;
  bankName: string;
  timestamp: Date;
}

@Injectable()
export class PseMockService {
  /**
   * Process PSE mock payment.
   * TPAY-07, TPAY-08
   *
   * Uses document number last digit for deterministic results:
   * - 0: FAILURE (insufficient funds)
   * - 1: FAILURE (bank rejected)
   * - 9: PENDING (manual review)
   * - Others: SUCCESS
   */
  processPayment(formData: PseMockFormData): PseMockResult {
    const transactionId = `PSE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const lastDigit = formData.documentNumber.slice(-1);
    const bankName = BANK_DISPLAY_NAMES[formData.bankCode];

    // Deterministic mock results based on document number
    if (lastDigit === '0') {
      return {
        transactionId,
        status: 'FAILURE',
        message: 'Fondos insuficientes en la cuenta bancaria',
        bankName,
        timestamp: new Date(),
      };
    }

    if (lastDigit === '1') {
      return {
        transactionId,
        status: 'FAILURE',
        message: 'Transaccion rechazada por el banco',
        bankName,
        timestamp: new Date(),
      };
    }

    if (lastDigit === '9') {
      return {
        transactionId,
        status: 'PENDING',
        message: 'Transaccion pendiente de verificacion bancaria',
        bankName,
        timestamp: new Date(),
      };
    }

    return {
      transactionId,
      status: 'SUCCESS',
      message: 'Pago procesado exitosamente',
      bankName,
      timestamp: new Date(),
    };
  }

  /**
   * Get list of banks available for PSE.
   */
  getAvailableBanks(): Array<{ code: string; name: string }> {
    return Object.values(ColombianBank).map(code => ({
      code,
      name: BANK_DISPLAY_NAMES[code],
    }));
  }
}
```

### Disputes Service
```typescript
// src/tenant-payments/disputes/disputes.service.ts

@Injectable()
export class DisputesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create dispute for rejected payment request.
   * TPAY-11, TPAY-12
   */
  async createDispute(
    paymentRequestId: string,
    tenantId: string,
    reason: string,
    evidenceFile?: Express.Multer.File,
  ): Promise<PaymentDispute> {
    // Verify request is rejected and belongs to tenant
    const request = await this.prisma.tenantPaymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        tenantId,
        status: 'REJECTED',
      },
    });

    if (!request) {
      throw new NotFoundException('Rejected payment request not found');
    }

    // Check no existing dispute
    const existingDispute = await this.prisma.paymentDispute.findUnique({
      where: { paymentRequestId },
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this payment request');
    }

    // Upload additional evidence if provided
    let evidencePath: string | undefined;
    if (evidenceFile) {
      evidencePath = await this.uploadEvidence(request.leaseId, paymentRequestId, evidenceFile);
    }

    // Create dispute
    const dispute = await this.prisma.paymentDispute.create({
      data: {
        paymentRequestId,
        reason,
        additionalEvidencePath: evidencePath,
        status: 'OPEN',
      },
    });

    // Update request status
    await this.prisma.tenantPaymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: 'DISPUTED' },
    });

    return dispute;
  }

  /**
   * Get open disputes for admin review.
   */
  async getOpenDisputes(): Promise<PaymentDispute[]> {
    return this.prisma.paymentDispute.findMany({
      where: {
        status: { in: ['OPEN', 'UNDER_REVIEW'] },
      },
      include: {
        paymentRequest: {
          include: {
            tenant: { select: { firstName: true, lastName: true, email: true } },
            lease: {
              select: {
                propertyAddress: true,
                landlordName: true,
                landlordEmail: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ... resolution methods for admin
}
```

## API Endpoints Design

### Landlord Payment Methods
```
POST   /landlords/me/payment-methods     # Create payment method (TPAY-01, TPAY-02)
GET    /landlords/me/payment-methods     # List my payment methods
PATCH  /landlords/me/payment-methods/:id # Update payment method
DELETE /landlords/me/payment-methods/:id # Deactivate payment method
```

### Tenant Payment Operations
```
GET    /leases/:leaseId/payment-methods          # Get landlord's payment methods (TPAY-03)
GET    /leases/:leaseId/payment-info             # Get rent amount + methods (TPAY-05)
POST   /leases/:leaseId/payment-requests         # Create payment request (TPAY-06)
GET    /leases/:leaseId/payment-requests         # List my payment requests
GET    /leases/:leaseId/payment-requests/:id     # Get request details
DELETE /leases/:leaseId/payment-requests/:id     # Cancel pending request
```

### PSE Mock
```
GET    /pse-mock/banks                           # Get bank list (TPAY-07)
POST   /pse-mock/process                         # Process PSE payment (TPAY-08)
```

### Landlord Payment Validation
```
GET    /landlords/me/pending-payments            # Get pending validations
POST   /payment-requests/:id/approve             # Approve request (TPAY-10)
POST   /payment-requests/:id/reject              # Reject request
GET    /payment-requests/:id/receipt-url         # Get signed URL for receipt
```

### Disputes
```
POST   /payment-requests/:id/dispute             # Open dispute (TPAY-11, TPAY-12)
GET    /disputes                                 # List my disputes (tenant)
GET    /disputes/:id                             # Get dispute details
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Landlord records all payments | Tenant initiates, landlord validates | Modern platforms | Better tracking, digital receipts |
| Manual receipt collection | Digital upload with validation | 2020+ | Faster dispute resolution |
| No dispute workflow | Structured dispute + ticket system | Best practice | Fair process for both parties |
| Real PSE integration | Mock for MVP/FREE tier | Context-specific | Faster development, lower complexity |

**Industry references:**
- [EBANX PSE Documentation](https://docs.ebanx.com/docs/payments/guides/accept-payments/api/colombia/pse/) - PSE flow reference
- [PayU Colombia API](https://developers.payulatam.com/latam/en/docs/integrations/api-integration/payments-api-colombia.html) - Colombian payment patterns
- [TenantCloud](https://www.tenantcloud.com/blog/how-to-keep-track-of-rental-payments) - Payment tracking best practices

## Open Questions

1. **Partial Payments**
   - What we know: Amount auto-fills from lease.monthlyRent
   - What's unclear: Can tenant pay less? Should we allow?
   - Recommendation: Allow any amount, let landlord decide to approve/reject

2. **Multiple Payment Methods per Landlord**
   - What we know: Landlord can configure multiple bank accounts
   - What's unclear: Limit on number of payment methods?
   - Recommendation: No limit, but UI should handle gracefully

3. **Receipt Retention Period**
   - What we know: Receipts stored in Supabase
   - What's unclear: How long to keep receipts?
   - Recommendation: Keep indefinitely (storage is cheap), align with legal retention

4. **Admin Role for Disputes**
   - What we know: Disputes need resolution by neutral party
   - What's unclear: Is there an ADMIN role? Or is support external?
   - Recommendation: Add admin endpoints, role can be added in future phase

5. **PSE Mock vs Real Integration**
   - What we know: Phase 10 is FREE tier, mock is sufficient
   - What's unclear: When will real PSE integration be needed?
   - Recommendation: Design PSE service interface to allow future real implementation

## Sources

### Primary (HIGH confidence)
- Existing codebase: `src/documents/documents.service.ts` - Receipt upload pattern
- Existing codebase: `src/leases/payments.service.ts` - Payment recording
- Existing codebase: `src/leases/leases.service.ts` - Access verification patterns
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage) - Bucket management

### Secondary (MEDIUM confidence)
- [EBANX PSE Avanza Docs](https://docs.ebanx.com/docs/payments/guides/accept-payments/api/colombia/pse/) - PSE flow reference
- [PayU Colombia Payments API](https://developers.payulatam.com/latam/en/docs/integrations/api-integration/payments-api-colombia.html) - Colombian patterns
- [RentCheck Blog](https://www.getrentcheck.com/blog/landlord-tenant-disputes) - Dispute handling practices
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload) - File handling patterns

### Tertiary (LOW confidence)
- [TenantCloud Payment Tracking](https://www.tenantcloud.com/blog/how-to-keep-track-of-rental-payments) - General best practices
- [DEV.to NestJS Patterns](https://dev.to/geampiere/design-patterns-in-nestjs-9h0) - Design patterns

## Metadata

**Confidence breakdown:**
- Database models: HIGH - Clear requirements, follows existing patterns
- Receipt upload: HIGH - Extends existing DocumentsService pattern
- PSE mock: HIGH - Simple state machine, no external dependencies
- Dispute workflow: MEDIUM - Requirements clear but admin resolution TBD
- Integration with Phase 9: HIGH - Uses existing PaymentsService

**Research date:** 2026-02-02
**Valid until:** 2026-03-02 (30 days - patterns are stable)

## Key Decisions for Planning

1. **New module:** Create `tenant-payments` module (separate from `leases`)
2. **Three new models:** LandlordPaymentMethod, TenantPaymentRequest, PaymentDispute
3. **Reuse bucket:** Use `application-documents` bucket with `receipts/` folder
4. **Reuse PaymentsService:** Approved requests create Payment via existing service
5. **PSE mock:** Simple in-app mock with deterministic test cases
6. **Dispute workflow:** Tenant opens dispute, admin resolves (endpoints added, role TBD)
7. **User relations:** Add new relations to User model for payment methods, requests, validations, disputes

## Requirements Mapping

| Requirement | Implementation |
|-------------|---------------|
| TPAY-01 | POST /landlords/me/payment-methods |
| TPAY-02 | LandlordPaymentMethod model with bank details |
| TPAY-03 | GET /leases/:leaseId/payment-methods |
| TPAY-04 | paymentMethod field in CreatePaymentRequestDto (PSE, BANK_TRANSFER, NEQUI, DAVIPLATA) |
| TPAY-05 | GET /leases/:leaseId/payment-info returns lease.monthlyRent |
| TPAY-06 | POST /leases/:leaseId/payment-requests with file upload |
| TPAY-07 | PseMockService.processPayment + mock form |
| TPAY-08 | PseMockService returns SUCCESS/FAILURE/PENDING |
| TPAY-09 | TenantPaymentRequest created with PENDING_VALIDATION status |
| TPAY-10 | POST /payment-requests/:id/approve creates Payment via PaymentsService |
| TPAY-11 | POST /payment-requests/:id/dispute creates PaymentDispute |
| TPAY-12 | PaymentDispute model with OPEN -> UNDER_REVIEW -> RESOLVED workflow |
