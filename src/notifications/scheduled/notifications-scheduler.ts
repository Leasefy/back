import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationsService } from '../services/notifications.service.js';
import { VisitStatus, LeaseStatus } from '../../common/enums/index.js';

/**
 * NotificationsScheduler
 *
 * Handles scheduled notification tasks:
 * - Visit reminders (24h before)
 * - Payment due reminders (3 days before)
 * - Payment overdue checks (5+ days after due date)
 * - Lease expiring soon (30 days before)
 * - Lease expired checks
 */
@Injectable()
export class NotificationsScheduler {
  private readonly logger = new Logger(NotificationsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Send visit reminders 24h before.
   * Runs every hour.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async sendVisitReminders(): Promise<void> {
    this.logger.debug('Checking for visits needing 24h reminder...');

    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Calculate start and end of tomorrow
    const startOfTomorrow = new Date(tomorrow);
    startOfTomorrow.setHours(0, 0, 0, 0);
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);

    // Find accepted visits happening tomorrow
    const visits = await this.prisma.propertyVisit.findMany({
      where: {
        status: VisitStatus.ACCEPTED,
        visitDate: {
          gte: startOfTomorrow,
          lt: endOfTomorrow,
        },
      },
      include: {
        property: true,
        tenant: true,
      },
    });

    for (const visit of visits) {
      const variables = {
        propertyTitle: visit.property.title,
        propertyAddress: `${visit.property.address}, ${visit.property.city}`,
        date: this.formatDateTime(visit.visitDate, visit.startTime),
      };

      // Notify tenant
      await this.notificationsService.send({
        userId: visit.tenantId,
        templateCode: 'VISIT_REMINDER_24H',
        variables,
        triggeredBy: `scheduler:visit:${visit.id}`,
      });

      // Notify landlord
      await this.notificationsService.send({
        userId: visit.property.landlordId,
        templateCode: 'VISIT_REMINDER_24H',
        variables,
        triggeredBy: `scheduler:visit:${visit.id}`,
      });
    }

    if (visits.length > 0) {
      this.logger.log(`Sent ${visits.length * 2} visit reminders`);
    }
  }

  /**
   * Send payment due reminders (3 days before).
   * Runs daily at 9 AM Colombia time (UTC-5).
   */
  @Cron('0 14 * * *') // 9 AM Colombia = 14:00 UTC
  async sendPaymentReminders(): Promise<void> {
    this.logger.debug('Checking for payments due in 3 days...');

    const now = new Date();
    const threeDaysFromNow = new Date(now);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find active leases with payment day matching 3 days from now
    const targetPaymentDay = threeDaysFromNow.getDate();

    const leases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        paymentDay: targetPaymentDay,
      },
    });

    for (const lease of leases) {
      // Check if payment already exists for this month
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          leaseId: lease.id,
          periodMonth: threeDaysFromNow.getMonth() + 1,
          periodYear: threeDaysFromNow.getFullYear(),
        },
      });

      if (existingPayment) {
        continue; // Already paid
      }

      await this.notificationsService.send({
        userId: lease.tenantId,
        templateCode: 'PAYMENT_REMINDER',
        variables: {
          propertyTitle: lease.propertyAddress,
          amount: this.formatCurrency(lease.monthlyRent),
          date: this.formatDate(threeDaysFromNow),
        },
        triggeredBy: `scheduler:payment:${lease.id}`,
      });
    }

    if (leases.length > 0) {
      this.logger.log(`Checked ${leases.length} leases for payment reminders`);
    }
  }

  /**
   * Check for overdue payments.
   * Runs daily at 10 AM Colombia time.
   */
  @Cron('0 15 * * *') // 10 AM Colombia = 15:00 UTC
  async checkOverduePayments(): Promise<void> {
    this.logger.debug('Checking for overdue payments...');

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();

    // Find active leases where payment day has passed this month (5 day grace period)
    const leases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        paymentDay: { lt: currentDay - 5 },
      },
    });

    for (const lease of leases) {
      // Check if payment exists for this month
      const existingPayment = await this.prisma.payment.findFirst({
        where: {
          leaseId: lease.id,
          periodMonth: currentMonth,
          periodYear: currentYear,
        },
      });

      if (existingPayment) {
        continue; // Already paid
      }

      // Check if we already sent overdue notification today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const recentNotification = await this.prisma.notificationLog.findFirst({
        where: {
          userId: lease.tenantId,
          templateCode: 'PAYMENT_OVERDUE',
          createdAt: { gte: todayStart },
        },
      });

      if (recentNotification) {
        continue; // Already notified today
      }

      const variables = {
        propertyTitle: lease.propertyAddress,
        amount: this.formatCurrency(lease.monthlyRent),
        date: `${lease.paymentDay} de ${this.getMonthName(currentMonth)}`,
      };

      // Notify tenant
      await this.notificationsService.send({
        userId: lease.tenantId,
        templateCode: 'PAYMENT_OVERDUE',
        variables,
        triggeredBy: `scheduler:overdue:${lease.id}`,
      });

      // Notify landlord
      await this.notificationsService.send({
        userId: lease.landlordId,
        templateCode: 'PAYMENT_OVERDUE',
        variables: { ...variables, otherPartyName: lease.tenantName },
        triggeredBy: `scheduler:overdue:${lease.id}`,
      });
    }
  }

  /**
   * Check for leases expiring in 30 days.
   * Runs daily at 8 AM Colombia time.
   */
  @Cron('0 13 * * *') // 8 AM Colombia = 13:00 UTC
  async checkExpiringLeases(): Promise<void> {
    this.logger.debug('Checking for leases expiring in 30 days...');

    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Find leases ending in exactly 30 days
    const startOfDay = new Date(thirtyDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(thirtyDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const leases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        endDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    for (const lease of leases) {
      const variables = {
        propertyTitle: lease.propertyAddress,
        date: this.formatDate(lease.endDate),
      };

      // Notify both parties
      await this.notificationsService.sendBulk(
        [lease.tenantId, lease.landlordId],
        'LEASE_EXPIRING_SOON',
        variables,
        `scheduler:expiring:${lease.id}`,
      );
    }

    if (leases.length > 0) {
      this.logger.log(`Sent expiring lease notifications for ${leases.length} leases`);
    }
  }

  /**
   * Check for expired leases.
   * Runs daily at 8 AM Colombia time.
   */
  @Cron('0 13 * * *') // 8 AM Colombia = 13:00 UTC
  async checkExpiredLeases(): Promise<void> {
    this.logger.debug('Checking for expired leases...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    // Find leases that ended yesterday and are still marked ACTIVE
    const startOfYesterday = new Date(yesterday);
    startOfYesterday.setHours(0, 0, 0, 0);
    const endOfYesterday = new Date(yesterday);
    endOfYesterday.setHours(23, 59, 59, 999);

    const leases = await this.prisma.lease.findMany({
      where: {
        status: LeaseStatus.ACTIVE,
        endDate: {
          gte: startOfYesterday,
          lte: endOfYesterday,
        },
      },
    });

    for (const lease of leases) {
      const variables = {
        propertyTitle: lease.propertyAddress,
        date: this.formatDate(lease.endDate),
      };

      // Notify both parties
      await this.notificationsService.sendBulk(
        [lease.tenantId, lease.landlordId],
        'LEASE_EXPIRED',
        variables,
        `scheduler:expired:${lease.id}`,
      );

      // Update lease status
      await this.prisma.lease.update({
        where: { id: lease.id },
        data: { status: LeaseStatus.ENDED },
      });
    }

    if (leases.length > 0) {
      this.logger.log(`Processed ${leases.length} expired leases`);
    }
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private formatDateTime(date: Date, time: string): string {
    const dateStr = this.formatDate(date);
    return `${dateStr} a las ${time}`;
  }

  private getMonthName(month: number): string {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return months[month - 1];
  }
}
