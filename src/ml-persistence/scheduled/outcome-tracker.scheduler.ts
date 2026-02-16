import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { MlPersistenceService } from '../ml-persistence.service.js';
import { PredictionOutcome } from '../dto/prediction-outcome.enum.js';

/**
 * OutcomeTrackerScheduler
 *
 * Daily cron job that evaluates lease payment performance and updates
 * PredictionLog outcomes accordingly.
 *
 * Outcome categories:
 * - APPROVED_PAID_ON_TIME: 6+ months, zero late payments
 * - APPROVED_LATE_PAYMENTS: 6+ months, 1-3 late payments
 * - APPROVED_DEFAULTED: terminated with >3 late payments, or >5 late payments
 * - APPROVED_PENDING: not enough data yet (< 6 months, < 5 late payments)
 *
 * Late payment = paid after 5-day grace period from due date (matching Phase 9 convention).
 *
 * Runs daily at 4 AM Colombia time (09:00 UTC).
 */
@Injectable()
export class OutcomeTrackerScheduler {
  private readonly logger = new Logger(OutcomeTrackerScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlPersistenceService: MlPersistenceService,
  ) {}

  @Cron('0 9 * * *')
  async updatePredictionOutcomes(): Promise<void> {
    this.logger.debug('Updating prediction outcomes from lease data...');

    // Find all leases that are 3+ months old and have contracts
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const leases = await this.prisma.lease.findMany({
      where: {
        startDate: { lte: threeMonthsAgo },
        status: { in: ['ACTIVE', 'ENDING_SOON', 'ENDED', 'TERMINATED'] },
      },
      include: {
        payments: true,
        contract: {
          select: { applicationId: true },
        },
      },
    });

    let updated = 0;

    for (const lease of leases) {
      try {
        const applicationId = lease.contract.applicationId;

        // Check if prediction log exists
        const predictionLog = await this.prisma.predictionLog.findUnique({
          where: { applicationId },
        });
        if (!predictionLog) continue;

        // Calculate months since lease start
        const monthsTracked = this.monthsDiff(lease.startDate, new Date());

        // Count late payments (paid after 5-day grace period from due date)
        const latePaymentCount = lease.payments.filter((p) => {
          const dueDate = new Date(
            p.periodYear,
            p.periodMonth - 1,
            lease.paymentDay,
          );
          const graceDate = new Date(dueDate);
          graceDate.setDate(graceDate.getDate() + 5);
          return p.paymentDate > graceDate;
        }).length;

        // Determine outcome category
        let outcome: PredictionOutcome;
        if (lease.status === 'TERMINATED' && latePaymentCount > 3) {
          outcome = PredictionOutcome.APPROVED_DEFAULTED;
        } else if (monthsTracked >= 6 && latePaymentCount === 0) {
          outcome = PredictionOutcome.APPROVED_PAID_ON_TIME;
        } else if (monthsTracked >= 6 && latePaymentCount <= 3) {
          outcome = PredictionOutcome.APPROVED_LATE_PAYMENTS;
        } else if (latePaymentCount > 5) {
          outcome = PredictionOutcome.APPROVED_DEFAULTED;
        } else {
          outcome = PredictionOutcome.APPROVED_PENDING; // Not enough data yet
        }

        await this.mlPersistenceService.recordLeaseOutcome(
          applicationId,
          lease.id,
          outcome,
          monthsTracked,
          latePaymentCount,
        );

        updated++;
      } catch (error) {
        this.logger.warn(
          `Failed to update outcome for lease ${lease.id}: ${
            error instanceof Error ? error.message : 'Unknown'
          }`,
        );
      }
    }

    if (updated > 0) {
      this.logger.log(`Updated ${updated} prediction outcomes`);
    }
  }

  private monthsDiff(start: Date, end: Date): number {
    return (
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth())
    );
  }
}
