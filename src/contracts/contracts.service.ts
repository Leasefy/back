import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ContractStateMachine } from './state-machine/contract-state-machine.js';
import { ContractTemplateService, ContractTemplateData } from './templates/contract-template.service.js';
import { SignatureService } from './signature/signature.service.js';
import { PdfGeneratorService } from './pdf/pdf-generator.service.js';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ApplicationStatus, ContractStatus } from '../common/enums/index.js';
import { CreateContractDto } from './dto/create-contract.dto.js';
import { SignContractDto } from './dto/sign-contract.dto.js';
import { ContractActivatedEvent } from '../leases/events/contract-activated.event.js';
import { ContractReadyEvent, ContractSignedEvent } from '../notifications/events/contract.events.js';
import type { Contract, Prisma } from '@prisma/client';

/**
 * ContractsService
 *
 * Business logic for contract management.
 * Handles creation, viewing, and state transitions.
 *
 * Requirements: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-10
 */
@Injectable()
export class ContractsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ContractStateMachine,
    private readonly templateService: ContractTemplateService,
    private readonly signatureService: SignatureService,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create a contract for an approved application.
   * Only the landlord who owns the property can create a contract.
   * Application must be in APPROVED status.
   *
   * Requirements: CONT-02, CONT-03, CONT-04, CONT-05
   */
  async create(landlordId: string, dto: CreateContractDto): Promise<Contract> {
    // 1. Fetch application with relations
    const application = await this.prisma.application.findUnique({
      where: { id: dto.applicationId },
      include: {
        property: { select: { id: true, landlordId: true, title: true, address: true, city: true, type: true } },
        tenant: { select: { id: true, email: true, firstName: true, lastName: true } },
        contract: { select: { id: true } }, // Check if contract already exists
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // 2. Verify landlord owns property
    if (application.property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

    // 3. Verify application is APPROVED
    if (application.status !== ApplicationStatus.APPROVED) {
      throw new BadRequestException('Can only create contract for approved applications');
    }

    // 4. Check no existing contract
    if (application.contract) {
      throw new BadRequestException('Contract already exists for this application');
    }

    // 5. Validate dates
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // 6. Get landlord info for template
    const landlord = await this.prisma.user.findUnique({
      where: { id: landlordId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!landlord) {
      throw new NotFoundException('Landlord not found');
    }

    // 7. Generate contract HTML from template
    const templateData = this.buildTemplateData(
      landlord,
      application.tenant,
      application.property,
      dto,
      startDate,
      endDate,
    );
    const contractHtml = this.templateService.render(templateData);

    // 8. Create contract
    const contract = await this.prisma.contract.create({
      data: {
        applicationId: dto.applicationId,
        propertyId: application.property.id,
        landlordId,
        tenantId: application.tenant.id,
        status: ContractStatus.DRAFT,
        startDate,
        endDate,
        monthlyRent: dto.monthlyRent,
        deposit: dto.deposit,
        paymentDay: dto.paymentDay,
        includesInsurance: dto.includesInsurance ?? false,
        insuranceDetails: dto.insuranceDetails,
        customClauses: JSON.parse(JSON.stringify(dto.customClauses ?? [])) as Prisma.InputJsonValue,
        contractHtml,
      },
    });

    return contract;
  }

  /**
   * Get contract preview (HTML for display).
   * Either landlord or tenant of the contract can view.
   */
  async getPreview(contractId: string, userId: string): Promise<{ html: string }> {
    const contract = await this.verifyAccess(contractId, userId);

    if (!contract.contractHtml) {
      throw new BadRequestException('Contract HTML not generated');
    }

    return { html: contract.contractHtml };
  }

  /**
   * Get contract by ID with all details.
   * Either party can view.
   *
   * Requirements: CONT-10
   */
  async getById(contractId: string, userId: string): Promise<Contract & {
    property: { id: string; title: string; address: string };
    landlord: { id: string; firstName: string | null; lastName: string | null; email: string };
    tenant: { id: string; firstName: string | null; lastName: string | null; email: string };
  }> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        property: { select: { id: true, title: true, address: true } },
        landlord: { select: { id: true, firstName: true, lastName: true, email: true } },
        tenant: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== userId && contract.tenantId !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }

    return contract;
  }

  /**
   * List contracts for a user (as landlord or tenant).
   */
  async listForUser(userId: string): Promise<Array<{
    id: string;
    status: ContractStatus;
    propertyTitle: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
    role: 'LANDLORD' | 'TENANT';
    createdAt: Date;
  }>> {
    const contracts = await this.prisma.contract.findMany({
      where: {
        OR: [
          { landlordId: userId },
          { tenantId: userId },
        ],
      },
      include: {
        property: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return contracts.map((c) => ({
      id: c.id,
      status: c.status as ContractStatus,
      propertyTitle: c.property.title,
      monthlyRent: c.monthlyRent,
      startDate: c.startDate,
      endDate: c.endDate,
      role: c.landlordId === userId ? 'LANDLORD' as const : 'TENANT' as const,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Send contract for signing (DRAFT -> PENDING_LANDLORD_SIGNATURE).
   * Only landlord can do this.
   */
  async sendForSigning(contractId: string, landlordId: string): Promise<Contract> {
    const contract = await this.verifyLandlordAccess(contractId, landlordId);

    this.stateMachine.validateTransition(
      contract.status as ContractStatus,
      ContractStatus.PENDING_LANDLORD_SIGNATURE,
    );

    return this.prisma.contract.update({
      where: { id: contractId },
      data: { status: ContractStatus.PENDING_LANDLORD_SIGNATURE },
    });
  }

  /**
   * Landlord signs the contract.
   * Transition: PENDING_LANDLORD_SIGNATURE -> PENDING_TENANT_SIGNATURE
   * Captures full audit trail per Ley 527/1999.
   *
   * Requirements: CONT-06, CONT-08
   */
  async signAsLandlord(
    contractId: string,
    landlordId: string,
    dto: SignContractDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<Contract> {
    const contract = await this.verifyLandlordAccess(contractId, landlordId);

    this.stateMachine.validateTransition(
      contract.status as ContractStatus,
      ContractStatus.PENDING_TENANT_SIGNATURE,
    );

    if (!contract.contractHtml) {
      throw new BadRequestException('Contract HTML not generated');
    }

    // Get landlord info for audit trail
    const landlord = await this.prisma.user.findUnique({
      where: { id: landlordId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!landlord) {
      throw new NotFoundException('Landlord not found');
    }

    // Create audit trail
    const signatureAudit = this.signatureService.createAuditTrail(
      landlordId,
      landlord.email,
      [landlord.firstName, landlord.lastName].filter(Boolean).join(' ') || 'N/A',
      'LANDLORD',
      contract.contractHtml,
      dto,
      ipAddress,
      userAgent,
    );

    // Update contract with signature and new status
    const updatedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.PENDING_TENANT_SIGNATURE,
        landlordSignature: signatureAudit as unknown as Prisma.InputJsonValue,
        documentHash: signatureAudit.documentHash,
      },
    });

    // Get property for notification
    const property = await this.prisma.property.findUnique({
      where: { id: contract.propertyId },
    });
    const propertyTitle = property?.title || 'Propiedad';
    const landlordName = [landlord.firstName, landlord.lastName].filter(Boolean).join(' ') || landlord.email;

    // Emit notification event - landlord signed, notify tenant
    this.eventEmitter.emit(
      'contract.signed',
      new ContractSignedEvent(
        contractId,
        contract.propertyId,
        contract.tenantId,
        landlordId,
        propertyTitle,
        'LANDLORD',
        landlordName,
        false, // not fully completed yet
      ),
    );

    return updatedContract;
  }

  /**
   * Tenant signs the contract.
   * Transition: PENDING_TENANT_SIGNATURE -> SIGNED
   * Generates PDF after both signatures.
   *
   * Requirements: CONT-07, CONT-08, CONT-09
   */
  async signAsTenant(
    contractId: string,
    tenantId: string,
    dto: SignContractDto,
    ipAddress: string,
    userAgent: string,
  ): Promise<Contract> {
    const contract = await this.verifyTenantAccess(contractId, tenantId);

    this.stateMachine.validateTransition(
      contract.status as ContractStatus,
      ContractStatus.SIGNED,
    );

    if (!contract.contractHtml) {
      throw new BadRequestException('Contract HTML not generated');
    }

    // Verify landlord already signed
    if (!contract.landlordSignature) {
      throw new BadRequestException('Landlord must sign first');
    }

    // Get tenant info for audit trail
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
      select: { id: true, email: true, firstName: true, lastName: true },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Create audit trail
    const signatureAudit = this.signatureService.createAuditTrail(
      tenantId,
      tenant.email,
      [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || 'N/A',
      'TENANT',
      contract.contractHtml,
      dto,
      ipAddress,
      userAgent,
    );

    // Update contract with signature
    const signedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.SIGNED,
        tenantSignature: signatureAudit as unknown as Prisma.InputJsonValue,
        signedAt: new Date(),
      },
    });

    // Generate PDF with signatures
    const pdfPath = await this.pdfGenerator.generateContractPdf(
      contractId,
      contract.contractHtml,
    );

    // Update with PDF path
    const finalContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: { signedPdfPath: pdfPath },
    });

    // Get property for notification
    const property = await this.prisma.property.findUnique({
      where: { id: contract.propertyId },
    });
    const propertyTitle = property?.title || 'Propiedad';
    const tenantName = [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || tenant.email;

    // Emit notification event - both signed, contract completed
    this.eventEmitter.emit(
      'contract.signed',
      new ContractSignedEvent(
        contractId,
        contract.propertyId,
        tenantId,
        contract.landlordId,
        propertyTitle,
        'TENANT',
        tenantName,
        true, // fully completed
      ),
    );

    return finalContract;
  }

  /**
   * Activate a signed contract.
   * Transition: SIGNED -> ACTIVE
   * Emits event for lease creation.
   * Only landlord can activate (typically when tenant moves in or start date arrives).
   *
   * Requirements: LEAS-01
   */
  async activateContract(contractId: string, landlordId: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        property: {
          select: {
            id: true,
            address: true,
            city: true,
          },
        },
        landlord: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        tenant: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can activate the contract');
    }

    // Validate state transition
    this.stateMachine.validateTransition(
      contract.status as ContractStatus,
      ContractStatus.ACTIVE,
    );

    // Update contract status
    const updatedContract = await this.prisma.contract.update({
      where: { id: contractId },
      data: {
        status: ContractStatus.ACTIVE,
        activatedAt: new Date(),
      },
    });

    // Emit event for lease creation
    const landlordName = [contract.landlord.firstName, contract.landlord.lastName]
      .filter(Boolean)
      .join(' ') || 'N/A';
    const tenantName = [contract.tenant.firstName, contract.tenant.lastName]
      .filter(Boolean)
      .join(' ') || 'N/A';

    this.eventEmitter.emit(
      'contract.activated',
      new ContractActivatedEvent(
        contract.id,
        contract.property.id,
        contract.landlordId,
        contract.tenantId,
        contract.startDate,
        contract.endDate,
        contract.monthlyRent,
        contract.deposit,
        contract.paymentDay,
        contract.property.address,
        contract.property.city,
        landlordName,
        contract.landlord.email,
        tenantName,
        contract.tenant.email,
        contract.tenant.phone,
      ),
    );

    return updatedContract;
  }

  /**
   * Get signed URL to download the signed PDF.
   * Either party can download.
   *
   * Requirements: CONT-09
   */
  async getSignedPdfUrl(
    contractId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const contract = await this.verifyAccess(contractId, userId);

    if (!contract.signedPdfPath) {
      throw new BadRequestException('Contract has not been signed yet');
    }

    return this.pdfGenerator.getSignedPdfUrl(contract.signedPdfPath);
  }

  // === Private helpers ===

  private async verifyAccess(contractId: string, userId: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== userId && contract.tenantId !== userId) {
      throw new ForbiddenException('You do not have access to this contract');
    }

    return contract;
  }

  private async verifyLandlordAccess(contractId: string, landlordId: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.landlordId !== landlordId) {
      throw new ForbiddenException('Only the landlord can perform this action');
    }

    return contract;
  }

  private async verifyTenantAccess(contractId: string, tenantId: string): Promise<Contract> {
    const contract = await this.prisma.contract.findUnique({
      where: { id: contractId },
    });

    if (!contract) {
      throw new NotFoundException('Contract not found');
    }

    if (contract.tenantId !== tenantId) {
      throw new ForbiddenException('Only the tenant can perform this action');
    }

    return contract;
  }

  private buildTemplateData(
    landlord: { id: string; email: string; firstName: string | null; lastName: string | null },
    tenant: { id: string; email: string; firstName: string | null; lastName: string | null },
    property: { id: string; title: string; address: string; city: string; type: string },
    dto: CreateContractDto,
    startDate: Date,
    endDate: Date,
  ): ContractTemplateData {
    const durationMonths = this.templateService.calculateDurationMonths(startDate, endDate);

    return {
      landlordName: [landlord.firstName, landlord.lastName].filter(Boolean).join(' ') || 'N/A',
      landlordId: '', // Will be filled from personalInfo in future
      landlordEmail: landlord.email,
      tenantName: [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || 'N/A',
      tenantId: '', // Will be filled from application personalInfo
      tenantEmail: tenant.email,
      propertyAddress: property.address,
      propertyCity: property.city,
      propertyType: property.type,
      startDate: startDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
      endDate: endDate.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
      durationMonths,
      monthlyRent: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(dto.monthlyRent),
      deposit: new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(dto.deposit),
      paymentDay: dto.paymentDay,
      customClauses: dto.customClauses ?? [],
      includesInsurance: dto.includesInsurance ?? false,
      insuranceDetails: dto.insuranceDetails,
      contractNumber: '', // Set after creation
      generatedAt: new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  }
}
