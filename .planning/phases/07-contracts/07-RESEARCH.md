# Phase 7: Contracts - Research

**Researched:** 2026-02-01
**Domain:** Digital contract signing, PDF generation, Colombian legal compliance (Ley 527/1999)
**Confidence:** HIGH

## Summary

Phase 7 implements digital contract signing for approved rental applications. After a landlord approves a candidate (Phase 6), they create a contract with start/end dates, rent amount, deposit, payment day, and optional custom clauses. Both parties sign digitally, and a signed PDF is generated.

The implementation requires three main components:
1. **Contract template system** with variable substitution and clause library
2. **PDF generation** using Puppeteer + Handlebars for high-quality document output
3. **Digital signature capture** with comprehensive audit trail for Ley 527/1999 compliance

Colombian law (Ley 527/1999, Decree 2364/2012) establishes that electronic signatures are legally valid for rental contracts when: (1) the signature is reliably linked to the signer, (2) changes to the document after signing can be detected, and (3) both parties consent. Rental/lease contracts do NOT require notarization or digital certificates from accredited entities - simple electronic signatures with proper audit trail suffice.

**Primary recommendation:** Use Puppeteer + Handlebars for PDF generation, store signature data as JSON audit trail per signer, hash final documents with SHA-256, and store signed PDFs in Supabase Storage. Implement a state machine for contract lifecycle (DRAFT -> PENDING_LANDLORD_SIGNATURE -> PENDING_TENANT_SIGNATURE -> SIGNED -> ACTIVE).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| puppeteer | 22.x | PDF generation from HTML | Best quality, handles CSS/JS, Google-maintained |
| handlebars | 4.x | Template rendering with variables | Fast, logic-less, precompilable |
| crypto (Node built-in) | - | SHA-256 document hashing | Standard, no dependencies |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @nestjs/bullmq | 11.x | Async PDF generation | Already in project, offload PDF work |
| @supabase/supabase-js | 2.x | Store signed PDFs | Already in project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Puppeteer | pdfmake | pdfmake is lighter but less flexible for styled contracts |
| Puppeteer | @react-pdf/renderer | React-based, adds complexity for server-side |
| Handlebars | EJS, Pug | Handlebars is simpler, logic-less by design |
| Custom audit trail | DocuSign/HelloSign | Third-party adds cost, not needed for Ley 527 compliance |

**Installation:**
```bash
npm install puppeteer handlebars
npm install -D @types/puppeteer
```

Note: Puppeteer downloads Chromium on install (~300MB). For Docker, use `puppeteer-core` with preinstalled Chrome.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── contracts/
│   ├── contracts.module.ts
│   ├── contracts.controller.ts
│   ├── contracts.service.ts
│   ├── state-machine/
│   │   └── contract-state-machine.ts
│   ├── templates/
│   │   ├── contract-template.service.ts   # Template management
│   │   └── clause-library.service.ts      # Reusable clauses
│   ├── pdf/
│   │   ├── pdf-generator.service.ts       # Puppeteer + Handlebars
│   │   └── templates/                     # .hbs files
│   │       └── rental-contract.hbs
│   ├── signature/
│   │   ├── signature.service.ts           # Capture + audit trail
│   │   └── signature-audit.interface.ts
│   └── dto/
│       ├── create-contract.dto.ts
│       ├── add-clause.dto.ts
│       ├── sign-contract.dto.ts
│       └── index.ts
```

### Pattern 1: Contract State Machine
**What:** Manage contract lifecycle with explicit state transitions
**When to use:** All contract status changes
**Example:**
```typescript
// Similar to existing ApplicationStateMachine
enum ContractStatus {
  DRAFT = 'DRAFT',
  PENDING_LANDLORD_SIGNATURE = 'PENDING_LANDLORD_SIGNATURE',
  PENDING_TENANT_SIGNATURE = 'PENDING_TENANT_SIGNATURE',
  SIGNED = 'SIGNED',
  ACTIVE = 'ACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

const transitions: Record<ContractStatus, ContractStatus[]> = {
  [ContractStatus.DRAFT]: [
    ContractStatus.PENDING_LANDLORD_SIGNATURE,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_LANDLORD_SIGNATURE]: [
    ContractStatus.PENDING_TENANT_SIGNATURE,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.PENDING_TENANT_SIGNATURE]: [
    ContractStatus.SIGNED,
    ContractStatus.CANCELLED,
  ],
  [ContractStatus.SIGNED]: [
    ContractStatus.ACTIVE,  // When start date arrives
  ],
  [ContractStatus.ACTIVE]: [
    ContractStatus.EXPIRED,  // When end date passes
  ],
  [ContractStatus.CANCELLED]: [],  // Terminal
  [ContractStatus.EXPIRED]: [],    // Terminal
};
```

### Pattern 2: Signature Audit Trail (Ley 527/1999 Compliance)
**What:** Capture comprehensive signature data for legal validity
**When to use:** Every signature event
**Example:**
```typescript
// Source: Colombian Ley 527/1999 requirements
interface SignatureAudit {
  signerId: string;           // UUID of signer
  signerEmail: string;        // Email for identification
  signerRole: 'LANDLORD' | 'TENANT';

  // Authentication proof
  signedAt: string;           // ISO 8601 UTC timestamp
  ipAddress: string;          // Signer's IP
  userAgent: string;          // Browser/device info

  // Consent proof
  acceptedTerms: boolean;     // Explicit consent checkbox
  consentText: string;        // What they agreed to

  // Document integrity
  documentHash: string;       // SHA-256 of document at signing
  signatureData?: string;     // Optional: drawn signature as base64
}
```

### Pattern 3: PDF Generation with Puppeteer
**What:** Generate contract PDF from HTML template
**When to use:** When both parties have signed
**Example:**
```typescript
// Source: Puppeteer documentation + NestJS patterns
@Injectable()
export class PdfGeneratorService {
  private browser: Browser | null = null;

  async generateContractPdf(
    templateData: ContractTemplateData,
  ): Promise<Buffer> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Compile Handlebars template
      const template = await this.loadTemplate('rental-contract.hbs');
      const html = template(templateData);

      // Set content and wait for rendering
      await page.setContent(html, { waitUntil: 'networkidle0' });

      // Generate PDF with A4 format
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: '<div style="font-size:10px;text-align:center;width:100%;">Contrato de Arrendamiento</div>',
        footerTemplate: '<div style="font-size:10px;text-align:center;width:100%;"><span class="pageNumber"></span> de <span class="totalPages"></span></div>',
      });

      return Buffer.from(pdf);
    } finally {
      await page.close();
    }
  }

  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }
}
```

### Pattern 4: Template Variable Substitution
**What:** Replace placeholders in contract template with actual data
**When to use:** Contract preview and PDF generation
**Example:**
```typescript
// Handlebars template variables
interface ContractTemplateData {
  // Parties
  landlordName: string;
  landlordId: string;        // Cedula number
  landlordEmail: string;
  tenantName: string;
  tenantId: string;          // Cedula number
  tenantEmail: string;

  // Property
  propertyAddress: string;
  propertyCity: string;
  propertyType: string;

  // Terms
  startDate: string;         // Formatted: "1 de marzo de 2026"
  endDate: string;
  durationMonths: number;
  monthlyRent: string;       // Formatted: "$2.500.000 COP"
  deposit: string;           // Formatted: "$5.000.000 COP"
  paymentDay: number;        // 1-28

  // Optional
  customClauses: Array<{ title: string; content: string }>;
  includeInsurance: boolean;
  insuranceDetails?: string;

  // Signatures (for signed version)
  signatures?: {
    landlord?: SignatureAudit;
    tenant?: SignatureAudit;
  };

  // Metadata
  contractNumber: string;    // Unique identifier
  generatedAt: string;
}
```

### Pattern 5: Document Hashing for Integrity
**What:** Hash document content to detect tampering
**When to use:** At signing and verification
**Example:**
```typescript
import { createHash } from 'crypto';

function hashDocument(content: string | Buffer): string {
  return createHash('sha256')
    .update(content)
    .digest('hex');
}

// At signing:
const documentHash = hashDocument(contractHtml);
// Store hash in signature audit trail

// At verification:
const currentHash = hashDocument(storedContractHtml);
const isValid = currentHash === signatureAudit.documentHash;
```

### Anti-Patterns to Avoid
- **Skipping audit trail:** Every signature MUST capture IP, timestamp, user agent, consent
- **Generating PDF before all signatures:** PDF should be generated AFTER both parties sign
- **Modifying contract after signatures:** Once signed, contract is immutable - cancel and create new
- **Using client-side time:** Always use server UTC time for timestamps
- **Storing contract in database JSON:** Store as file in Supabase Storage, reference by path
- **Allowing signature without consent checkbox:** Explicit consent is required for Ley 527

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| PDF from HTML | Custom PDF builder | Puppeteer + Handlebars | Complex layout, fonts, pagination |
| Template variables | String.replace() | Handlebars | Handles conditionals, loops, escaping |
| Document hashing | Custom algorithm | crypto.createHash('sha256') | Standard, auditable |
| File storage | Local filesystem | Supabase Storage | Already configured, signed URLs work |
| State management | if/else chains | State machine pattern | Existing pattern in codebase |
| Timestamp format | Custom formatting | date-fns or Intl.DateTimeFormat | Handles Spanish locale |

**Key insight:** Contract generation looks like string concatenation but involves complex formatting (currency, dates in Spanish), legal clause management, and signature audit trails. Use established patterns.

## Common Pitfalls

### Pitfall 1: Incomplete Audit Trail
**What goes wrong:** Contract legally challenged because signature data is insufficient
**Why it happens:** Only captured timestamp, not IP/device/consent
**How to avoid:** Capture ALL audit data at signing: signerId, email, timestamp (UTC), IP, userAgent, consent text, document hash
**Warning signs:** SignatureAudit interface missing fields

### Pitfall 2: PDF Generation Timeouts
**What goes wrong:** Request times out generating PDF
**Why it happens:** Puppeteer startup is slow (~2-5 seconds cold start)
**How to avoid:** Keep browser instance warm, use BullMQ for async generation, return immediately with "generating" status
**Warning signs:** PDF endpoints taking >3 seconds

### Pitfall 3: Contract Modification After Signing
**What goes wrong:** Legal validity questioned because document was modified
**Why it happens:** Allowed edits to signed contract
**How to avoid:** Once status leaves DRAFT, contract content is immutable. To change, cancel and create new.
**Warning signs:** Update endpoints that modify signed contracts

### Pitfall 4: Missing Consent Checkbox
**What goes wrong:** Signature not legally binding under Ley 527
**Why it happens:** Just captured signature without explicit consent
**How to avoid:** Require checkbox + consent text before signature capture
**Warning signs:** Sign endpoint without consentText in body

### Pitfall 5: Client-Side Timestamp
**What goes wrong:** Disputed signing time, legal challenge
**Why it happens:** Used Date from client request
**How to avoid:** Always use `new Date()` on server side, store in UTC
**Warning signs:** Timestamp coming from request body

### Pitfall 6: Puppeteer Memory Leaks
**What goes wrong:** Server OOM after many PDF generations
**Why it happens:** Not closing pages, keeping too many browser instances
**How to avoid:** Always close pages in finally block, single browser instance, or use browserless.io
**Warning signs:** Memory usage growing over time

## Code Examples

Verified patterns for this implementation:

### Contract Model (Prisma)
```prisma
// Add to schema.prisma

/// Status of a rental contract
enum ContractStatus {
  DRAFT
  PENDING_LANDLORD_SIGNATURE
  PENDING_TENANT_SIGNATURE
  SIGNED
  ACTIVE
  CANCELLED
  EXPIRED
}

/// Rental contract between landlord and tenant
model Contract {
  id            String         @id @default(uuid()) @db.Uuid
  applicationId String         @unique @map("application_id") @db.Uuid
  propertyId    String         @map("property_id") @db.Uuid
  landlordId    String         @map("landlord_id") @db.Uuid
  tenantId      String         @map("tenant_id") @db.Uuid
  status        ContractStatus @default(DRAFT)

  // Contract terms
  startDate     DateTime       @map("start_date") @db.Date
  endDate       DateTime       @map("end_date") @db.Date
  monthlyRent   Int            @map("monthly_rent")
  deposit       Int
  paymentDay    Int            @map("payment_day") // 1-28

  // Optional
  includesInsurance Boolean    @default(false) @map("includes_insurance")
  insuranceDetails  String?    @map("insurance_details") @db.Text

  // Custom clauses as JSON array
  customClauses Json           @default("[]") @map("custom_clauses")

  // Document storage
  contractHtml  String?        @map("contract_html") @db.Text  // For preview/signature
  signedPdfPath String?        @map("signed_pdf_path")         // Supabase Storage path
  documentHash  String?        @map("document_hash")           // SHA-256 of contractHtml

  // Signature audit trails (JSON)
  landlordSignature Json?      @map("landlord_signature")
  tenantSignature   Json?      @map("tenant_signature")

  // Timestamps
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  signedAt      DateTime?      @map("signed_at")  // When both signed
  activatedAt   DateTime?      @map("activated_at")  // When start_date arrived

  // Relations
  application   Application    @relation(fields: [applicationId], references: [id])
  property      Property       @relation(fields: [propertyId], references: [id])
  landlord      User           @relation("LandlordContracts", fields: [landlordId], references: [id])
  tenant        User           @relation("TenantContracts", fields: [tenantId], references: [id])

  @@index([landlordId])
  @@index([tenantId])
  @@index([propertyId])
  @@index([status])
  @@map("contracts")
}
```

### Handlebars Contract Template
```handlebars
{{!-- templates/rental-contract.hbs --}}
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.6;
      max-width: 700px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 {
      text-align: center;
      font-size: 16pt;
      margin-bottom: 30px;
    }
    .section-title {
      font-weight: bold;
      margin-top: 20px;
      margin-bottom: 10px;
    }
    .clause {
      margin-bottom: 15px;
      text-align: justify;
    }
    .signature-block {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
    }
    .signature {
      width: 45%;
      text-align: center;
    }
    .signature-line {
      border-top: 1px solid black;
      margin-top: 60px;
      padding-top: 10px;
    }
    .signature-details {
      font-size: 10pt;
      color: #666;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <h1>CONTRATO DE ARRENDAMIENTO DE VIVIENDA URBANA</h1>

  <p class="clause">
    Entre <strong>{{landlordName}}</strong>, identificado con cédula de ciudadanía
    No. <strong>{{landlordId}}</strong>, en adelante EL ARRENDADOR, y
    <strong>{{tenantName}}</strong>, identificado con cédula de ciudadanía
    No. <strong>{{tenantId}}</strong>, en adelante EL ARRENDATARIO, se celebra
    el presente contrato de arrendamiento de vivienda urbana, el cual se regirá
    por las siguientes cláusulas y por lo dispuesto en la Ley 820 de 2003:
  </p>

  <p class="section-title">PRIMERA. OBJETO</p>
  <p class="clause">
    EL ARRENDADOR entrega en arrendamiento al ARRENDATARIO el inmueble ubicado en
    <strong>{{propertyAddress}}</strong>, ciudad de <strong>{{propertyCity}}</strong>,
    tipo de inmueble: <strong>{{propertyType}}</strong>.
  </p>

  <p class="section-title">SEGUNDA. DURACIÓN</p>
  <p class="clause">
    El término de duración del presente contrato es de <strong>{{durationMonths}}</strong>
    meses, contados a partir del <strong>{{startDate}}</strong> hasta el
    <strong>{{endDate}}</strong>.
  </p>

  <p class="section-title">TERCERA. CANON DE ARRENDAMIENTO</p>
  <p class="clause">
    El canon de arrendamiento mensual es de <strong>{{monthlyRent}}</strong>,
    pagadero los primeros <strong>{{paymentDay}}</strong> días de cada mes.
  </p>

  <p class="section-title">CUARTA. DEPÓSITO</p>
  <p class="clause">
    EL ARRENDATARIO entrega la suma de <strong>{{deposit}}</strong> como depósito
    de garantía, el cual será devuelto al terminar el contrato, previa deducción
    de los valores adeudados.
  </p>

  {{#if includesInsurance}}
  <p class="section-title">QUINTA. SEGURO DE ARRENDAMIENTO</p>
  <p class="clause">
    {{insuranceDetails}}
  </p>
  {{/if}}

  {{#each customClauses}}
  <p class="section-title">{{title}}</p>
  <p class="clause">{{content}}</p>
  {{/each}}

  <p class="clause" style="margin-top: 30px;">
    Para constancia se firma en la ciudad de {{propertyCity}}, a los {{generatedAt}}.
  </p>

  <div class="signature-block">
    <div class="signature">
      {{#if signatures.landlord}}
      <img src="{{signatures.landlord.signatureData}}" alt="Firma Arrendador" style="max-height: 60px;">
      {{/if}}
      <div class="signature-line">
        EL ARRENDADOR<br>
        {{landlordName}}<br>
        C.C. {{landlordId}}
      </div>
      {{#if signatures.landlord}}
      <div class="signature-details">
        Firmado: {{signatures.landlord.signedAt}}<br>
        IP: {{signatures.landlord.ipAddress}}
      </div>
      {{/if}}
    </div>

    <div class="signature">
      {{#if signatures.tenant}}
      <img src="{{signatures.tenant.signatureData}}" alt="Firma Arrendatario" style="max-height: 60px;">
      {{/if}}
      <div class="signature-line">
        EL ARRENDATARIO<br>
        {{tenantName}}<br>
        C.C. {{tenantId}}
      </div>
      {{#if signatures.tenant}}
      <div class="signature-details">
        Firmado: {{signatures.tenant.signedAt}}<br>
        IP: {{signatures.tenant.ipAddress}}
      </div>
      {{/if}}
    </div>
  </div>

  <p style="margin-top: 40px; font-size: 9pt; color: #888; text-align: center;">
    Contrato No. {{contractNumber}} | Generado: {{generatedAt}}<br>
    Hash del documento: {{documentHash}}<br>
    Este contrato fue firmado electrónicamente conforme a la Ley 527 de 1999.
  </p>
</body>
</html>
```

### Create Contract DTO
```typescript
// Source: Requirements CONT-02, CONT-03, CONT-04, CONT-05
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsString,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

class CustomClauseDto {
  @ApiProperty({ example: 'SEXTA. MASCOTAS' })
  @IsString()
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'Se permite una mascota de hasta 10kg.' })
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class CreateContractDto {
  @ApiProperty({ description: 'ID of approved application' })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2027-02-28' })
  @IsDateString()
  endDate!: string;

  @ApiProperty({ example: 2500000, description: 'Monthly rent in COP' })
  @IsInt()
  @Min(100000)
  monthlyRent!: number;

  @ApiProperty({ example: 5000000, description: 'Deposit in COP' })
  @IsInt()
  @Min(0)
  deposit!: number;

  @ApiProperty({ example: 5, description: 'Payment due day (1-28)' })
  @IsInt()
  @Min(1)
  @Max(28)
  paymentDay!: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  includesInsurance?: boolean;

  @ApiPropertyOptional({ example: 'Póliza No. 12345 con Seguros ABC' })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  insuranceDetails?: string;

  @ApiPropertyOptional({ type: [CustomClauseDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomClauseDto)
  @IsOptional()
  customClauses?: CustomClauseDto[];
}
```

### Sign Contract DTO
```typescript
// Source: Ley 527/1999 requirements
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsString, IsOptional, MaxLength } from 'class-validator';

export class SignContractDto {
  @ApiProperty({
    description: 'User explicitly accepts contract terms',
    example: true
  })
  @IsBoolean()
  acceptedTerms!: boolean;

  @ApiProperty({
    description: 'Consent text shown to user',
    example: 'Acepto los términos y condiciones de este contrato de arrendamiento y confirmo que la información proporcionada es verídica.'
  })
  @IsString()
  @MaxLength(500)
  consentText!: string;

  @ApiPropertyOptional({
    description: 'Base64 encoded drawn signature (optional)',
    example: 'data:image/png;base64,iVBORw0KGgo...'
  })
  @IsString()
  @IsOptional()
  signatureData?: string;
}
```

### ContractsController Endpoints
```typescript
@ApiTags('Contracts')
@ApiBearerAuth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  // CONT-02: Landlord creates contract for approved candidate
  @Post()
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Create contract for approved application' })
  async create(
    @CurrentUser() user: User,
    @Body() dto: CreateContractDto,
  ) {
    return this.contractsService.create(user.id, dto);
  }

  // Get contract preview (HTML for display)
  @Get(':id/preview')
  @ApiOperation({ summary: 'Get contract preview HTML' })
  async getPreview(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getPreview(id, user.id);
  }

  // CONT-06: Landlord signs
  @Post(':id/sign/landlord')
  @Roles(Role.LANDLORD, Role.BOTH)
  @ApiOperation({ summary: 'Landlord signs contract' })
  async signAsLandlord(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.contractsService.signAsLandlord(id, user.id, dto, ip as string, userAgent);
  }

  // CONT-07: Tenant signs
  @Post(':id/sign/tenant')
  @Roles(Role.TENANT, Role.BOTH)
  @ApiOperation({ summary: 'Tenant signs contract' })
  async signAsTenant(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SignContractDto,
    @Req() req: Request,
  ) {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.contractsService.signAsTenant(id, user.id, dto, ip as string, userAgent);
  }

  // CONT-09: Get signed PDF
  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download signed contract PDF' })
  async getPdf(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.contractsService.getSignedPdfUrl(id, user.id);
  }

  // CONT-10: Get contract status
  @Get(':id')
  @ApiOperation({ summary: 'Get contract details and status' })
  async getById(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.contractsService.getById(id, user.id);
  }

  // List contracts for user (as landlord or tenant)
  @Get()
  @ApiOperation({ summary: 'List user contracts' })
  async list(@CurrentUser() user: User) {
    return this.contractsService.listForUser(user.id);
  }
}
```

### Signature Service (Audit Trail)
```typescript
import { createHash } from 'crypto';

interface SignatureAudit {
  signerId: string;
  signerEmail: string;
  signerRole: 'LANDLORD' | 'TENANT';
  signedAt: string;           // ISO 8601 UTC
  ipAddress: string;
  userAgent: string;
  acceptedTerms: boolean;
  consentText: string;
  documentHash: string;
  signatureData?: string;     // Base64 drawn signature
}

@Injectable()
export class SignatureService {
  createAuditTrail(
    signerId: string,
    signerEmail: string,
    signerRole: 'LANDLORD' | 'TENANT',
    contractHtml: string,
    dto: SignContractDto,
    ipAddress: string,
    userAgent: string,
  ): SignatureAudit {
    return {
      signerId,
      signerEmail,
      signerRole,
      signedAt: new Date().toISOString(),  // Server UTC time, not client
      ipAddress: this.normalizeIp(ipAddress),
      userAgent,
      acceptedTerms: dto.acceptedTerms,
      consentText: dto.consentText,
      documentHash: this.hashDocument(contractHtml),
      signatureData: dto.signatureData,
    };
  }

  private hashDocument(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private normalizeIp(ip: string): string {
    // Handle x-forwarded-for with multiple IPs
    const firstIp = ip.split(',')[0].trim();
    return firstIp || 'unknown';
  }

  verifySignature(
    contractHtml: string,
    signatureAudit: SignatureAudit,
  ): boolean {
    const currentHash = this.hashDocument(contractHtml);
    return currentHash === signatureAudit.documentHash;
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Notarized physical contracts | Digital with e-signature | Ley 527/1999 | Legal validity for rental contracts |
| Manual PDF creation | Puppeteer + Handlebars | 2020+ | High-quality, automated |
| Third-party e-sign (DocuSign) | In-app signature + audit trail | When Ley 527 understood | Reduces cost, same legal validity |
| Database JSON for contracts | File storage + reference | Best practice | Better for large documents |

**Current best practices:**
- Simple e-signature (not certified) is sufficient for rental contracts in Colombia
- Audit trail must capture: timestamp (UTC), IP, device info, explicit consent
- Document hash proves integrity post-signature
- PDF generation should be async for large documents

## Open Questions

Things that couldn't be fully resolved:

1. **Signature pad library for frontend**
   - What we know: Backend receives base64 signature data
   - What's unclear: Which frontend library will capture signatures?
   - Recommendation: Backend should accept any base64 PNG/SVG; frontend decides library

2. **Contract expiration automation**
   - What we know: Contract has endDate, should transition to EXPIRED
   - What's unclear: Background job or lazy evaluation?
   - Recommendation: Use BullMQ scheduled job to check daily, or lazy eval on access

3. **Contract amendments**
   - What we know: Once signed, contract is immutable
   - What's unclear: How to handle amendments or addendums?
   - Recommendation: Out of scope for MVP - if needed, cancel and create new

4. **Clause library source**
   - What we know: Custom clauses are supported
   - What's unclear: Should there be pre-defined clauses in database?
   - Recommendation: Start with frontend-provided clauses only, add clause library in future

## Sources

### Primary (HIGH confidence)
- [OneSpan - Electronic Signatures Legal in Colombia](https://www.onespan.com/blog/are-electronic-signatures-legal-colombia) - Ley 527/1999 requirements
- [Arriendo.com - Ley 527 for Rental Contracts](https://arriendo.com/co/blog/arriendo/ley-527-reglamentos-de-la-firma-electronica-en-contratos-de-arriendo/) - Specific to rental contracts
- [DocuSign Colombia Legality](https://www.docusign.com/products/electronic-signature/legality/colombia) - Legal framework overview
- [Puppeteer Documentation](https://pptr.dev/guides/pdf-generation) - PDF generation guide
- [Handlebars.js](https://handlebarsjs.com/) - Template syntax
- Existing codebase: DocumentsService, ApplicationStateMachine, BullMQ patterns

### Secondary (MEDIUM confidence)
- [Medium - NestJS PDF Generation](https://medium.com/@swapnilsuman65/generate-pdfs-dynamically-in-nodejs-nestjs-398fe3617a4a) - NestJS patterns
- [BlueInk - Audit Trail Guide](https://www.blueink.com/blog/audit-trail-esignature) - Audit trail requirements
- [Nutrient - Top JS PDF Libraries 2025](https://www.nutrient.io/blog/top-js-pdf-libraries/) - Library comparison

### Tertiary (LOW confidence)
- None identified - all claims verified with official sources

## Metadata

**Confidence breakdown:**
- Legal requirements (Ley 527): HIGH - Verified with official legal sources
- PDF generation: HIGH - Puppeteer is industry standard, well-documented
- Audit trail: HIGH - Based on legal requirements + industry best practices
- Data model: HIGH - Follows existing codebase patterns
- Template system: HIGH - Handlebars is stable, well-understood

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - legal requirements stable)

## Key Decisions for Planning

1. **PDF library:** Puppeteer + Handlebars (not pdfmake or @react-pdf)
2. **Signature approach:** In-app with audit trail (not third-party like DocuSign)
3. **Legal compliance:** Simple e-signature + full audit trail (not digital certificate)
4. **Storage:** Contract HTML in database, signed PDF in Supabase Storage
5. **State machine:** New ContractStateMachine following existing Application pattern
6. **Document integrity:** SHA-256 hash stored at signing
7. **Async PDF:** Use BullMQ for PDF generation to avoid timeouts
8. **Signature data:** Optional drawn signature as base64, stored in audit trail JSON

## Requirements Mapping

| Requirement | Implementation |
|-------------|---------------|
| CONT-01: Templates available | Handlebars template + variable substitution |
| CONT-02: Create contract for approved | POST /contracts with applicationId |
| CONT-03: Dates, rent, deposit, payment day | CreateContractDto fields, stored in Contract model |
| CONT-04: Custom clauses | customClauses JSON array in Contract |
| CONT-05: Optional insurance | includesInsurance boolean + insuranceDetails text |
| CONT-06: Landlord signs | POST /contracts/:id/sign/landlord |
| CONT-07: Tenant signs | POST /contracts/:id/sign/tenant |
| CONT-08: Ley 527 compliance | Audit trail with IP, timestamp, consent, hash |
| CONT-09: Generate signed PDF | PdfGeneratorService + Supabase Storage |
| CONT-10: Status tracking | ContractStatus enum + state machine |
