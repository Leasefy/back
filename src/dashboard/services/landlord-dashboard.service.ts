import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { LandlordDashboardResponseDto } from '../dto/landlord-dashboard-response.dto.js';

/**
 * LandlordDashboardService
 *
 * Aggregates real-time statistics for the landlord dashboard.
 * All independent queries run in parallel using Promise.all.
 * Uses direct Prisma queries (no PropertyAccessService dependency).
 */
@Injectable()
export class LandlordDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get complete landlord dashboard data.
   * Runs financial stats, urgent actions, and candidate risk distribution in parallel.
   */
  async getDashboard(
    landlordId: string,
  ): Promise<LandlordDashboardResponseDto> {
    const propertyIds = await this.getAccessiblePropertyIds(landlordId);

    const [financial, urgentActions, candidates] = await Promise.all([
      this.getFinancialStats(landlordId),
      this.getUrgentActions(landlordId, propertyIds),
      this.getCandidateRiskDistribution(propertyIds),
    ]);

    return { financial, urgentActions, candidates };
  }

  /**
   * Get combined property IDs: owned + agent-assigned.
   * Queries Prisma directly without PropertyAccessService dependency.
   */
  private async getAccessiblePropertyIds(
    landlordId: string,
  ): Promise<string[]> {
    const [ownedProperties, agentAccess] = await Promise.all([
      this.prisma.property.findMany({
        where: { landlordId },
        select: { id: true },
      }),
      this.prisma.propertyAccess.findMany({
        where: { agentId: landlordId, isActive: true },
        select: { propertyId: true },
      }),
    ]);

    const ownedIds = ownedProperties.map((p) => p.id);
    const agentIds = agentAccess.map((a) => a.propertyId);

    return [...new Set([...ownedIds, ...agentIds])];
  }

  /**
   * Calculate financial statistics for current month.
   * Includes monthly income, expected income, collection rate, pending and late payments.
   */
  private async getFinancialStats(landlordId: string) {
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    // Get active leases for this landlord
    const activeLeases = await this.prisma.lease.findMany({
      where: {
        landlordId,
        status: { in: ['ACTIVE', 'ENDING_SOON'] },
      },
      select: { id: true, monthlyRent: true },
    });

    const leaseIds = activeLeases.map((l) => l.id);
    const expectedIncome = activeLeases.reduce(
      (sum, l) => sum + l.monthlyRent,
      0,
    );

    // Handle no active leases (division by zero protection)
    if (leaseIds.length === 0) {
      return {
        monthlyIncome: 0,
        expectedIncome: 0,
        collectionRate: 0,
        pendingPayments: 0,
        latePayments: 0,
      };
    }

    // Get payments received this month
    const paymentsAggregate = await this.prisma.payment.aggregate({
      where: {
        leaseId: { in: leaseIds },
        periodMonth: currentMonth,
        periodYear: currentYear,
      },
      _sum: { amount: true },
    });

    const monthlyIncome = paymentsAggregate._sum.amount ?? 0;

    // Calculate collection rate with division-by-zero protection
    const collectionRate =
      expectedIncome > 0
        ? Math.round((monthlyIncome / expectedIncome) * 1000) / 10
        : 0;

    const pendingPayments = expectedIncome - monthlyIncome;

    // Count late payments: leases with NO payment for current month
    const paidLeaseIds = await this.prisma.payment.findMany({
      where: {
        leaseId: { in: leaseIds },
        periodMonth: currentMonth,
        periodYear: currentYear,
      },
      select: { leaseId: true },
    });

    const paidSet = new Set(paidLeaseIds.map((p) => p.leaseId));
    const latePayments = leaseIds.filter((id) => !paidSet.has(id)).length;

    return {
      monthlyIncome,
      expectedIncome,
      collectionRate,
      pendingPayments,
      latePayments,
    };
  }

  /**
   * Count urgent actions across 4 domains.
   * Runs all count queries in parallel.
   */
  private async getUrgentActions(landlordId: string, propertyIds: string[]) {
    const [
      pendingApplications,
      pendingSignatures,
      pendingVisits,
      endingLeases,
    ] = await Promise.all([
      // Applications with reviewable statuses for accessible properties
      propertyIds.length > 0
        ? this.prisma.application.count({
            where: {
              propertyId: { in: propertyIds },
              status: { in: ['SUBMITTED', 'UNDER_REVIEW'] },
            },
          })
        : 0,

      // Contracts awaiting landlord signature
      this.prisma.contract.count({
        where: {
          landlordId,
          status: 'PENDING_LANDLORD_SIGNATURE',
        },
      }),

      // Visits pending for accessible properties
      propertyIds.length > 0
        ? this.prisma.propertyVisit.count({
            where: {
              propertyId: { in: propertyIds },
              status: 'PENDING',
            },
          })
        : 0,

      // Leases ending soon
      this.prisma.lease.count({
        where: {
          landlordId,
          status: 'ENDING_SOON',
        },
      }),
    ]);

    const totalUrgent =
      pendingApplications + pendingSignatures + pendingVisits + endingLeases;

    return {
      totalUrgent,
      pendingApplications,
      pendingSignatures,
      pendingVisits,
      endingLeases,
    };
  }

  /**
   * Get risk distribution of active candidates for accessible properties.
   * Groups applications with risk scores by level (A, B, C, D).
   */
  private async getCandidateRiskDistribution(propertyIds: string[]) {
    if (propertyIds.length === 0) {
      return { a: 0, b: 0, c: 0, d: 0 };
    }

    const applications = await this.prisma.application.findMany({
      where: {
        propertyId: { in: propertyIds },
        status: { in: ['SUBMITTED', 'UNDER_REVIEW', 'PREAPPROVED'] },
        riskScore: { isNot: null },
      },
      select: {
        riskScore: {
          select: { level: true },
        },
      },
    });

    const distribution = applications.reduce(
      (acc, app) => {
        if (app.riskScore) {
          const level = app.riskScore.level.toLowerCase() as 'a' | 'b' | 'c' | 'd';
          if (level in acc) {
            acc[level]++;
          }
        }
        return acc;
      },
      { a: 0, b: 0, c: 0, d: 0 },
    );

    return distribution;
  }
}
