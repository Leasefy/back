import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { TenantDashboardResponseDto } from '../dto/tenant-dashboard-response.dto.js';

/**
 * TenantDashboardService
 *
 * Aggregates real-time statistics for the tenant dashboard.
 * Handles both with-lease and no-lease scenarios gracefully.
 */
@Injectable()
export class TenantDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete tenant dashboard data.
   * Returns lease info, payment status, upcoming visit, and pending applications.
   * Handles tenants with no active lease by returning partial data.
   */
  async getDashboard(tenantId: string): Promise<TenantDashboardResponseDto> {
    // Get active lease with nested data
    const activeLease = await this.prisma.lease.findFirst({
      where: {
        tenantId,
        status: { in: ['ACTIVE', 'ENDING_SOON'] },
      },
      include: {
        property: { select: { title: true, address: true, city: true } },
        payments: { orderBy: { paymentDate: 'desc' }, take: 3 },
        _count: { select: { payments: true } },
      },
    });

    // Get pending applications and upcoming visit in parallel (always needed)
    const [pendingApplications, upcomingVisit] = await Promise.all([
      this.prisma.application.count({
        where: {
          tenantId,
          status: {
            in: [
              'DRAFT',
              'SUBMITTED',
              'UNDER_REVIEW',
              'NEEDS_INFO',
              'PREAPPROVED',
            ],
          },
        },
      }),
      this.getUpcomingVisit(tenantId),
    ]);

    // No active lease scenario
    if (!activeLease) {
      return {
        hasActiveLease: false,
        pendingApplications,
        upcomingVisit,
      };
    }

    // With active lease scenario
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Check if current month payment exists
    const currentMonthPaid = activeLease.payments.some(
      (p) => p.periodMonth === currentMonth && p.periodYear === currentYear,
    );

    // Last payment date (most recent payment)
    const lastPaymentDate =
      activeLease.payments.length > 0
        ? activeLease.payments[0].paymentDate
        : null;

    const nextPaymentDue = this.calculateNextPaymentDate(
      activeLease.paymentDay,
    );

    return {
      hasActiveLease: true,
      lease: {
        propertyTitle: activeLease.property.title,
        propertyAddress: `${activeLease.property.address}, ${activeLease.property.city}`,
        monthlyRent: activeLease.monthlyRent,
        paymentDay: activeLease.paymentDay,
        startDate: activeLease.startDate,
        endDate: activeLease.endDate,
        status: activeLease.status,
      },
      payment: {
        currentMonthPaid,
        lastPaymentDate,
        totalPayments: activeLease._count.payments,
        nextPaymentDue,
      },
      upcomingVisit,
      pendingApplications,
    };
  }

  /**
   * Get the next upcoming visit for the tenant.
   * Only returns visits in PENDING or ACCEPTED status with future dates.
   */
  private async getUpcomingVisit(tenantId: string) {
    const visit = await this.prisma.propertyVisit.findFirst({
      where: {
        tenantId,
        status: { in: ['PENDING', 'ACCEPTED'] },
        visitDate: { gte: new Date() },
      },
      orderBy: { visitDate: 'asc' },
      include: {
        property: { select: { title: true, address: true } },
      },
    });

    if (!visit) {
      return null;
    }

    return {
      propertyTitle: visit.property.title,
      date: visit.visitDate,
      startTime: visit.startTime,
      status: visit.status,
    };
  }

  /**
   * Calculate the next payment due date based on payment day.
   * If the payment day has already passed this month, returns next month's date.
   */
  private calculateNextPaymentDate(paymentDay: number): Date {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-based

    // Create date for this month with paymentDay
    const thisMonthDue = new Date(currentYear, currentMonth, paymentDay);

    // If the due date has passed this month, move to next month
    if (thisMonthDue <= now) {
      return new Date(currentYear, currentMonth + 1, paymentDay);
    }

    return thisMonthDue;
  }
}
