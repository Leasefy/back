import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionsService } from '../services/subscriptions.service.js';
import { NotificationsService } from '../../notifications/services/notifications.service.js';
import { SubscriptionStatus } from '../../common/enums/index.js';

/**
 * SubscriptionScheduler
 *
 * Handles automated subscription lifecycle tasks:
 * - Trial expiry: notify 1 day before, auto-downgrade when expired
 * - Subscription expiry: auto-downgrade to FREE
 */
@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check trial expiry.
   * - Send notification 1 day before trial ends
   * - Auto-downgrade expired trials
   * Runs daily at 9 AM Colombia time (14:00 UTC).
   */
  @Cron('0 14 * * *')
  async checkTrialExpiry(): Promise<void> {
    this.logger.debug('Checking for trial expiry...');

    // 1. Notify trials expiring tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    const expiringTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { gte: startOfTomorrow, lte: endOfTomorrow },
      },
      include: { plan: true },
    });

    for (const sub of expiringTrials) {
      try {
        await this.notificationsService.send({
          userId: sub.userId,
          templateCode: 'TRIAL_EXPIRING',
          variables: {
            planName: sub.plan.name,
            date: this.formatDate(sub.trialEndsAt!),
          },
          triggeredBy: `scheduler:trial:${sub.id}`,
        });
      } catch {
        this.logger.warn(
          `Failed to send trial expiring notification for user ${sub.userId}`,
        );
      }
    }

    if (expiringTrials.length > 0) {
      this.logger.log(
        `Sent ${expiringTrials.length} trial expiring notifications`,
      );
    }

    // 2. Expire trials that have passed
    const expiredTrials = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.TRIAL,
        trialEndsAt: { lt: new Date() },
      },
    });

    for (const sub of expiredTrials) {
      try {
        await this.subscriptionsService.handleSingleExpiry(sub.id);

        await this.notificationsService.send({
          userId: sub.userId,
          templateCode: 'TRIAL_EXPIRED',
          variables: {},
          triggeredBy: `scheduler:trial-expired:${sub.id}`,
        });
      } catch (error) {
        this.logger.error(
          `Failed to expire trial ${sub.id}: ${error}`,
        );
      }
    }

    if (expiredTrials.length > 0) {
      this.logger.log(`Expired ${expiredTrials.length} trials`);
    }
  }

  /**
   * Check subscription expiry.
   * Runs daily at 8 AM Colombia time (13:00 UTC).
   */
  @Cron('0 13 * * *')
  async checkSubscriptionExpiry(): Promise<void> {
    this.logger.debug('Checking for subscription expiry...');

    const count =
      await this.subscriptionsService.handleExpiredSubscriptions();

    if (count > 0) {
      this.logger.log(`Processed ${count} expired subscriptions`);
    }
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }
}
