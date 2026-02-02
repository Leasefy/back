import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaymentHistoryMetrics } from '../features/payment-history-metrics.interface.js';

const GRACE_PERIOD_DAYS = 5; // Colombian standard grace period

@Injectable()
export class PaymentHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculate payment history metrics for a tenant across all leases.
   *
   * @param tenantId - UUID of the tenant
   * @returns PaymentHistoryMetrics with all calculated values
   */
  async getMetricsForTenant(tenantId: string): Promise<PaymentHistoryMetrics> {
    // Get all leases with payments for this tenant
    const leases = await this.prisma.lease.findMany({
      where: { tenantId },
      include: {
        payments: {
          orderBy: [{ periodYear: 'asc' }, { periodMonth: 'asc' }],
        },
      },
    });

    // No history = empty metrics
    if (leases.length === 0) {
      return {
        totalPayments: 0,
        onTimePercentage: 0,
        latePaymentCount: 0,
        totalMonthsOnPlatform: 0,
        totalAmountPaid: 0,
        isReturningTenant: false,
        leaseCount: 0,
      };
    }

    // Calculate expected payments per lease and aggregate
    let onTimePayments = 0;
    let latePayments = 0;
    let totalAmountPaid = 0;
    let totalMonthsOnPlatform = 0;

    for (const lease of leases) {
      // Calculate tenure for this lease
      totalMonthsOnPlatform += this.calculateLeaseTenureMonths(lease);

      // Analyze each payment
      for (const payment of lease.payments) {
        totalAmountPaid += payment.amount;

        if (this.isPaymentOnTime(payment, lease)) {
          onTimePayments++;
        } else {
          latePayments++;
        }
      }
    }

    // Calculate on-time percentage
    const totalRecordedPayments = leases.reduce(
      (sum, l) => sum + l.payments.length,
      0,
    );
    const onTimePercentage =
      totalRecordedPayments > 0 ? onTimePayments / totalRecordedPayments : 0;

    return {
      totalPayments: totalRecordedPayments,
      onTimePercentage,
      latePaymentCount: latePayments,
      totalMonthsOnPlatform,
      totalAmountPaid,
      isReturningTenant: leases.length > 1,
      leaseCount: leases.length,
    };
  }

  /**
   * Check if a payment was made on time (within grace period).
   */
  private isPaymentOnTime(
    payment: { paymentDate: Date; periodMonth: number; periodYear: number },
    lease: { paymentDay: number },
  ): boolean {
    // Due date is the paymentDay of the period month/year
    const dueDate = new Date(
      payment.periodYear,
      payment.periodMonth - 1,
      lease.paymentDay,
    );

    // Add grace period
    const gracePeriodEnd = new Date(dueDate);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + GRACE_PERIOD_DAYS);

    // Payment is on-time if made by grace period end
    return payment.paymentDate <= gracePeriodEnd;
  }

  /**
   * Calculate tenure in months for a lease.
   */
  private calculateLeaseTenureMonths(lease: {
    startDate: Date;
    endDate: Date;
  }): number {
    const start = new Date(lease.startDate);
    const end = new Date(lease.endDate);
    const today = new Date();

    // Effective end is earlier of lease end or today
    const effectiveEnd = end < today ? end : today;

    const months =
      (effectiveEnd.getFullYear() - start.getFullYear()) * 12 +
      (effectiveEnd.getMonth() - start.getMonth());

    return Math.max(0, months);
  }
}
