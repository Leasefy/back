import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LeasesService } from '../leases/leases.service.js';
import { ReceiptStorageService } from './receipt-storage/receipt-storage.service.js';
import { CreatePaymentRequestDto } from './dto/create-payment-request.dto.js';
import { PaymentInfoResponseDto } from './dto/payment-info-response.dto.js';
import {
  TenantPaymentRequestStatus,
  LeaseStatus,
  PaymentMethod,
  ColombianBank,
} from '../common/enums/index.js';
import type { TenantPaymentRequest, LandlordPaymentMethod } from '@prisma/client';

/**
 * TenantPaymentsService
 *
 * Business logic for tenant payment requests.
 * Handles viewing landlord payment methods, creating payment requests,
 * and uploading receipts for landlord validation.
 *
 * Requirements: TPAY-03, TPAY-05, TPAY-06, TPAY-09
 */
@Injectable()
export class TenantPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leasesService: LeasesService,
    private readonly receiptStorage: ReceiptStorageService,
  ) {}

  /**
   * TPAY-08: Create payment request from successful PSE mock.
   *
   * No receipt needed - PSE transaction ID serves as reference.
   * Called by PseMockController after successful PSE processing.
   */
  async createFromPse(
    tenantId: string,
    leaseId: string,
    data: {
      amount?: number;
      periodMonth: number;
      periodYear: number;
      pseTransactionId: string;
      pseBankCode: ColombianBank;
    },
  ): Promise<TenantPaymentRequest> {
    // Verify tenant access to lease
    const lease = await this.verifyTenantAccess(leaseId, tenantId);

    // Check lease is active
    if (
      lease.status !== LeaseStatus.ACTIVE &&
      lease.status !== LeaseStatus.ENDING_SOON
    ) {
      throw new BadRequestException('Can only submit payments for active leases');
    }

    // Check for duplicates
    await this.checkNoDuplicates(leaseId, data.periodMonth, data.periodYear);

    // Use lease rent if amount not provided
    const amount = data.amount ?? lease.monthlyRent;

    // Create payment request with PSE data
    return this.prisma.tenantPaymentRequest.create({
      data: {
        leaseId,
        tenantId,
        amount,
        paymentMethod: PaymentMethod.PSE,
        periodMonth: data.periodMonth,
        periodYear: data.periodYear,
        paymentDate: new Date(),
        pseTransactionId: data.pseTransactionId,
        pseBankCode: data.pseBankCode,
        referenceNumber: data.pseTransactionId,
        status: TenantPaymentRequestStatus.PENDING_VALIDATION,
      },
    });
  }

  /**
   * TPAY-03: Get landlord's payment methods for a lease.
   *
   * Tenant can view the landlord's configured bank accounts
   * to know where to transfer rent payments.
   */
  async getPaymentMethodsForLease(
    leaseId: string,
    tenantId: string,
  ): Promise<LandlordPaymentMethod[]> {
    // Verify tenant access to lease
    const lease = await this.verifyTenantAccess(leaseId, tenantId);

    // Get landlord's active payment methods
    return this.prisma.landlordPaymentMethod.findMany({
      where: {
        landlordId: lease.landlordId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * TPAY-05: Get payment info with auto-filled amount and current period.
   *
   * Returns all information needed for tenant to make a payment:
   * - Monthly rent amount (auto-fills payment form)
   * - Payment day
   * - Landlord's payment methods
   * - Current period (calculated from today's date)
   */
  async getPaymentInfo(
    leaseId: string,
    tenantId: string,
  ): Promise<PaymentInfoResponseDto> {
    // Verify tenant access
    const lease = await this.verifyTenantAccess(leaseId, tenantId);

    // Get landlord's payment methods
    const methods = await this.prisma.landlordPaymentMethod.findMany({
      where: {
        landlordId: lease.landlordId,
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Calculate current period from today's date
    const today = new Date();
    const currentPeriod = {
      month: today.getMonth() + 1, // 1-12
      year: today.getFullYear(),
    };

    return {
      leaseId: lease.id,
      monthlyRent: lease.monthlyRent,
      paymentDay: lease.paymentDay,
      paymentMethods: methods.map((m) => ({
        id: m.id,
        bankName: m.bankName,
        accountType: m.accountType,
        accountNumber: m.accountNumber,
        holderName: m.holderName,
        phoneNumber: m.phoneNumber,
        methodType: m.methodType,
        instructions: m.instructions,
      })),
      currentPeriod,
    };
  }

  /**
   * TPAY-06, TPAY-09: Create payment request with receipt upload.
   *
   * Tenant submits payment request with receipt for landlord validation.
   * Creates request with PENDING_VALIDATION status.
   *
   * Validates:
   * - Tenant owns the lease
   * - Lease is active
   * - No duplicate pending request for same period
   * - No existing payment for same period
   */
  async createWithReceipt(
    tenantId: string,
    leaseId: string,
    dto: CreatePaymentRequestDto,
    receiptFile: Express.Multer.File,
  ): Promise<TenantPaymentRequest> {
    // Verify tenant access to lease
    const lease = await this.verifyTenantAccess(leaseId, tenantId);

    // Check lease is active
    if (
      lease.status !== LeaseStatus.ACTIVE &&
      lease.status !== LeaseStatus.ENDING_SOON
    ) {
      throw new BadRequestException('Can only submit payments for active leases');
    }

    // Check for duplicates
    await this.checkNoDuplicates(leaseId, dto.periodMonth, dto.periodYear);

    // Generate a temporary request ID for the storage path
    const tempRequestId = crypto.randomUUID();

    // Upload receipt to storage
    const receiptPath = await this.receiptStorage.upload(
      leaseId,
      tempRequestId,
      receiptFile,
    );

    // Use lease rent if amount not provided
    const amount = dto.amount ?? lease.monthlyRent;

    // Create payment request
    try {
      const paymentRequest = await this.prisma.tenantPaymentRequest.create({
        data: {
          id: tempRequestId, // Use the same ID we used for storage
          leaseId,
          tenantId,
          amount,
          paymentMethod: dto.paymentMethod,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
          paymentDate: new Date(dto.paymentDate),
          receiptPath,
          referenceNumber: dto.referenceNumber,
          status: TenantPaymentRequestStatus.PENDING_VALIDATION,
        },
      });

      return paymentRequest;
    } catch (error) {
      // Clean up uploaded receipt if database insert fails
      await this.receiptStorage.delete(receiptPath);
      throw error;
    }
  }

  /**
   * Get tenant's payment requests for a lease.
   */
  async findByLease(
    leaseId: string,
    tenantId: string,
  ): Promise<TenantPaymentRequest[]> {
    // Verify tenant access
    await this.verifyTenantAccess(leaseId, tenantId);

    return this.prisma.tenantPaymentRequest.findMany({
      where: { leaseId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single payment request with access check.
   */
  async findById(
    requestId: string,
    tenantId: string,
  ): Promise<TenantPaymentRequest & { receiptUrl?: { url: string; expiresAt: Date } }> {
    const request = await this.prisma.tenantPaymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new ForbiddenException('You do not own this payment request');
    }

    // Generate signed URL for receipt if exists
    let receiptUrl: { url: string; expiresAt: Date } | undefined;
    if (request.receiptPath) {
      receiptUrl = await this.receiptStorage.getSignedUrl(request.receiptPath);
    }

    return {
      ...request,
      receiptUrl,
    };
  }

  /**
   * Cancel a pending payment request.
   *
   * Only pending requests can be cancelled.
   */
  async cancel(
    requestId: string,
    tenantId: string,
  ): Promise<TenantPaymentRequest> {
    const request = await this.prisma.tenantPaymentRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    if (request.tenantId !== tenantId) {
      throw new ForbiddenException('You do not own this payment request');
    }

    if (request.status !== TenantPaymentRequestStatus.PENDING_VALIDATION) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    // Delete receipt from storage
    if (request.receiptPath) {
      await this.receiptStorage.delete(request.receiptPath);
    }

    // Update status to cancelled
    return this.prisma.tenantPaymentRequest.update({
      where: { id: requestId },
      data: { status: TenantPaymentRequestStatus.CANCELLED },
    });
  }

  /**
   * Helper: Verify tenant has access to lease.
   */
  private async verifyTenantAccess(
    leaseId: string,
    tenantId: string,
  ) {
    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found');
    }

    if (lease.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have access to this lease');
    }

    return lease;
  }

  /**
   * Helper: Check no duplicate pending request or existing payment for period.
   */
  private async checkNoDuplicates(
    leaseId: string,
    periodMonth: number,
    periodYear: number,
  ): Promise<void> {
    // Check for existing pending request
    const pendingRequest = await this.prisma.tenantPaymentRequest.findFirst({
      where: {
        leaseId,
        periodMonth,
        periodYear,
        status: TenantPaymentRequestStatus.PENDING_VALIDATION,
      },
    });

    if (pendingRequest) {
      throw new ConflictException(
        `A pending payment request already exists for ${periodMonth}/${periodYear}`,
      );
    }

    // Check for existing approved payment
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        leaseId,
        periodMonth,
        periodYear,
      },
    });

    if (existingPayment) {
      throw new ConflictException(
        `Payment already exists for ${periodMonth}/${periodYear}`,
      );
    }
  }
}
