import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { LeasesService } from './leases.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import type { Payment } from '@prisma/client';

/**
 * PaymentsService
 *
 * Business logic for payment recording and history.
 *
 * Requirements: LEAS-04, LEAS-05, LEAS-06
 */
@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leasesService: LeasesService,
  ) {}

  /**
   * Record a payment for a lease.
   * Only the landlord can record payments.
   * Prevents duplicate payments for same month/year.
   *
   * Requirements: LEAS-04, LEAS-05
   */
  async recordPayment(
    landlordId: string,
    leaseId: string,
    dto: CreatePaymentDto,
  ): Promise<Payment> {
    // Verify landlord owns this lease
    await this.leasesService.verifyLandlordAccess(leaseId, landlordId);

    // Check for duplicate payment (same month/year)
    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        leaseId_periodMonth_periodYear: {
          leaseId,
          periodMonth: dto.periodMonth,
          periodYear: dto.periodYear,
        },
      },
    });

    if (existingPayment) {
      throw new BadRequestException(
        `Payment already recorded for ${dto.periodMonth}/${dto.periodYear}`,
      );
    }

    // Create payment record
    return this.prisma.payment.create({
      data: {
        leaseId,
        amount: dto.amount,
        method: dto.method,
        referenceNumber: dto.referenceNumber,
        paymentDate: new Date(dto.paymentDate),
        periodMonth: dto.periodMonth,
        periodYear: dto.periodYear,
        notes: dto.notes,
        recordedBy: landlordId,
      },
    });
  }

  /**
   * Get payment history for a lease.
   * Either landlord or tenant can view.
   * Returns payments ordered by period (newest first).
   *
   * Requirements: LEAS-06
   */
  async getPaymentHistory(leaseId: string, userId: string): Promise<Payment[]> {
    // Verify user has access to this lease
    await this.leasesService.verifyAccess(leaseId, userId);

    return this.prisma.payment.findMany({
      where: { leaseId },
      orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
    });
  }

  /**
   * Get payment summary for a lease.
   * Returns total paid, total expected, and payment status.
   */
  async getPaymentSummary(
    leaseId: string,
    userId: string,
  ): Promise<{
    totalPaid: number;
    paymentCount: number;
    lastPaymentDate: Date | null;
  }> {
    await this.leasesService.verifyAccess(leaseId, userId);

    const payments = await this.prisma.payment.findMany({
      where: { leaseId },
      select: {
        amount: true,
        paymentDate: true,
      },
      orderBy: { paymentDate: 'desc' },
    });

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
    const lastPaymentDate =
      payments.length > 0 ? payments[0].paymentDate : null;

    return {
      totalPaid,
      paymentCount: payments.length,
      lastPaymentDate,
    };
  }
}
