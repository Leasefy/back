import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service.js';
import { ReceiptStorageService } from '../receipt-storage/receipt-storage.service.js';
import {
  TenantPaymentRequestStatus,
  PaymentDisputeStatus,
} from '../../common/enums/index.js';
import { PaymentDisputeOpenedEvent } from '../../notifications/events/payment.events.js';
import type { PaymentDispute } from '@prisma/client';

/**
 * DisputesService
 *
 * Business logic for payment disputes.
 * Allows tenants to contest rejected payment requests
 * with additional evidence for admin/support review.
 *
 * Requirements: TPAY-11, TPAY-12
 */
@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptStorage: ReceiptStorageService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Create dispute for rejected payment request.
   * TPAY-11, TPAY-12
   *
   * @param paymentRequestId - The rejected payment request ID
   * @param tenantId - The tenant's user ID
   * @param reason - Tenant's explanation for the dispute
   * @param evidenceFile - Optional additional evidence file
   * @returns Created dispute record
   */
  async create(
    paymentRequestId: string,
    tenantId: string,
    reason: string,
    evidenceFile?: Express.Multer.File,
  ): Promise<PaymentDispute> {
    // 1. Verify request is rejected and belongs to tenant
    const request = await this.prisma.tenantPaymentRequest.findFirst({
      where: {
        id: paymentRequestId,
        tenantId,
        status: TenantPaymentRequestStatus.REJECTED,
      },
      include: { lease: true },
    });

    if (!request) {
      throw new NotFoundException(
        'Rejected payment request not found. Only rejected requests can be disputed.',
      );
    }

    // 2. Check no existing dispute
    const existingDispute = await this.prisma.paymentDispute.findUnique({
      where: { paymentRequestId },
    });

    if (existingDispute) {
      throw new BadRequestException('Dispute already exists for this payment request');
    }

    // 3. Upload additional evidence if provided
    let evidencePath: string | undefined;
    if (evidenceFile) {
      // Reuse receipt storage with different prefix for dispute evidence
      evidencePath = await this.receiptStorage.upload(
        request.leaseId,
        `dispute-${paymentRequestId}`,
        evidenceFile,
      );
    }

    // 4. Create dispute
    const dispute = await this.prisma.paymentDispute.create({
      data: {
        paymentRequestId,
        reason,
        additionalEvidencePath: evidencePath,
        status: PaymentDisputeStatus.OPEN,
      },
    });

    // 5. Update request status to DISPUTED
    await this.prisma.tenantPaymentRequest.update({
      where: { id: paymentRequestId },
      data: { status: TenantPaymentRequestStatus.DISPUTED },
    });

    // 6. Emit notification event for landlord
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });
    const tenantName = tenant
      ? [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || tenant.email
      : 'El inquilino';

    this.eventEmitter.emit(
      'payment.disputeOpened',
      new PaymentDisputeOpenedEvent(
        dispute.id,
        paymentRequestId,
        request.leaseId,
        tenantId,
        request.lease.landlordId,
        request.lease.propertyAddress,
        request.amount,
        tenantName,
      ),
    );

    return dispute;
  }

  /**
   * Get disputes for a tenant.
   *
   * @param tenantId - The tenant's user ID
   * @returns List of tenant's disputes with payment request details
   */
  async findByTenant(tenantId: string): Promise<PaymentDispute[]> {
    return this.prisma.paymentDispute.findMany({
      where: {
        paymentRequest: { tenantId },
      },
      include: {
        paymentRequest: {
          select: {
            amount: true,
            periodMonth: true,
            periodYear: true,
            rejectionReason: true,
            lease: {
              select: { propertyAddress: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get single dispute with tenant access verification.
   *
   * @param disputeId - The dispute ID
   * @param tenantId - The tenant's user ID
   * @returns Dispute with full details
   */
  async findById(disputeId: string, tenantId: string): Promise<PaymentDispute> {
    const dispute = await this.prisma.paymentDispute.findUnique({
      where: { id: disputeId },
      include: {
        paymentRequest: {
          include: {
            lease: { select: { propertyAddress: true } },
          },
        },
      },
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dispute.paymentRequest.tenantId !== tenantId) {
      throw new ForbiddenException('You do not have access to this dispute');
    }

    return dispute;
  }

  /**
   * Get signed URL for additional evidence.
   *
   * @param disputeId - The dispute ID
   * @param tenantId - The tenant's user ID
   * @returns Signed URL and expiration
   */
  async getEvidenceUrl(
    disputeId: string,
    tenantId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    const dispute = await this.findById(disputeId, tenantId);

    if (!dispute.additionalEvidencePath) {
      throw new NotFoundException('No additional evidence attached to this dispute');
    }

    return this.receiptStorage.getSignedUrl(dispute.additionalEvidencePath);
  }
}
