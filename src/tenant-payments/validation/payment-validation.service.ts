import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaymentsService } from '../../leases/payments.service.js';
import { ReceiptStorageService } from '../receipt-storage/receipt-storage.service.js';
import { LeasesService } from '../../leases/leases.service.js';
import { TenantPaymentRequestStatus, PaymentMethod } from '../../common/enums/index.js';
import type { TenantPaymentRequest, Payment } from '@prisma/client';

/**
 * PaymentValidationService
 *
 * Handles landlord validation of tenant payment requests.
 * - View pending payment requests for landlord's properties
 * - Approve payment requests (creates Payment record via PaymentsService)
 * - Reject payment requests with reason
 * - Get signed URLs for receipts
 *
 * Key integration: Uses PaymentsService.recordPayment to maintain
 * Phase 9 payment history scoring compatibility.
 *
 * Requirement: TPAY-10
 */
@Injectable()
export class PaymentValidationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly receiptStorage: ReceiptStorageService,
    private readonly leasesService: LeasesService,
  ) {}

  /**
   * Get pending payment requests for landlord's properties.
   *
   * Returns requests in PENDING_VALIDATION status for all leases
   * where the user is the landlord, ordered by creation date (oldest first).
   */
  async getPendingForLandlord(
    landlordId: string,
  ): Promise<TenantPaymentRequest[]> {
    return this.prisma.tenantPaymentRequest.findMany({
      where: {
        status: TenantPaymentRequestStatus.PENDING_VALIDATION,
        lease: { landlordId },
      },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        lease: {
          select: {
            id: true,
            propertyAddress: true,
            monthlyRent: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get single request with landlord access verification.
   *
   * @param requestId - The payment request ID
   * @param landlordId - The landlord user ID
   * @throws NotFoundException if request not found
   * @throws ForbiddenException if landlord doesn't own the lease
   */
  async findByIdForLandlord(
    requestId: string,
    landlordId: string,
  ): Promise<TenantPaymentRequest & {
    tenant: { firstName: string | null; lastName: string | null; email: string };
    lease: { id: string; propertyAddress: string; monthlyRent: number; landlordId: string };
  }> {
    const request = await this.prisma.tenantPaymentRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        lease: {
          select: {
            id: true,
            propertyAddress: true,
            monthlyRent: true,
            landlordId: true,
          },
        },
      },
    });

    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    if (request.lease.landlordId !== landlordId) {
      throw new ForbiddenException('You do not have access to this payment request');
    }

    return request;
  }

  /**
   * Approve payment request.
   *
   * Creates Payment record via existing PaymentsService.recordPayment
   * to ensure Phase 9 payment history scoring works correctly.
   *
   * Updates request status to APPROVED and links to created Payment.
   *
   * Requirement: TPAY-10
   *
   * @param requestId - The payment request ID
   * @param landlordId - The landlord user ID
   * @returns Created Payment record
   * @throws BadRequestException if request is not pending
   */
  async approve(requestId: string, landlordId: string): Promise<Payment> {
    const request = await this.findByIdForLandlord(requestId, landlordId);

    if (request.status !== TenantPaymentRequestStatus.PENDING_VALIDATION) {
      throw new BadRequestException('Can only approve pending requests');
    }

    // Create Payment via existing service (maintains Phase 9 compatibility)
    // Cast Prisma enum to app enum (same string values)
    const payment = await this.paymentsService.recordPayment(
      landlordId,
      request.leaseId,
      {
        amount: request.amount,
        method: request.paymentMethod as PaymentMethod,
        referenceNumber:
          request.referenceNumber ??
          request.pseTransactionId ??
          `TPAY-${requestId.slice(0, 8)}`,
        paymentDate: request.paymentDate.toISOString().split('T')[0],
        periodMonth: request.periodMonth,
        periodYear: request.periodYear,
        notes: 'Approved from tenant payment request',
      },
    );

    // Update request status
    await this.prisma.tenantPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: TenantPaymentRequestStatus.APPROVED,
        validatedAt: new Date(),
        validatedBy: landlordId,
        paymentId: payment.id,
      },
    });

    return payment;
  }

  /**
   * Reject payment request.
   *
   * Updates request status to REJECTED with reason.
   * Tenant can view rejection reason and optionally dispute.
   *
   * @param requestId - The payment request ID
   * @param landlordId - The landlord user ID
   * @param reason - Rejection reason (min 10 chars)
   * @returns Updated payment request
   * @throws BadRequestException if request is not pending
   */
  async reject(
    requestId: string,
    landlordId: string,
    reason: string,
  ): Promise<TenantPaymentRequest> {
    const request = await this.findByIdForLandlord(requestId, landlordId);

    if (request.status !== TenantPaymentRequestStatus.PENDING_VALIDATION) {
      throw new BadRequestException('Can only reject pending requests');
    }

    return this.prisma.tenantPaymentRequest.update({
      where: { id: requestId },
      data: {
        status: TenantPaymentRequestStatus.REJECTED,
        validatedAt: new Date(),
        validatedBy: landlordId,
        rejectionReason: reason,
      },
    });
  }

  /**
   * Get signed URL for receipt viewing.
   *
   * Allows landlord to view the uploaded receipt for validation.
   *
   * @param requestId - The payment request ID
   * @param landlordId - The landlord user ID
   * @returns Signed URL and expiration date
   * @throws NotFoundException if no receipt attached
   */
  async getReceiptUrl(
    requestId: string,
    landlordId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const request = await this.findByIdForLandlord(requestId, landlordId);

    if (!request.receiptPath) {
      throw new NotFoundException('No receipt attached to this request');
    }

    return this.receiptStorage.getSignedUrl(request.receiptPath);
  }
}
