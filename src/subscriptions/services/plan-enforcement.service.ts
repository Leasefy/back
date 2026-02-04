import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { SubscriptionsService } from './subscriptions.service.js';

/**
 * PlanEnforcementService
 *
 * Provides reusable limit checks consumed by other modules.
 * Checks property publication limits for landlords and
 * scoring view limits for tenants.
 */
@Injectable()
export class PlanEnforcementService {
  private readonly logger = new Logger(PlanEnforcementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * Check if landlord can publish another property.
   * Gets user's plan config and compares current property count to maxProperties.
   * -1 means unlimited.
   */
  async canPublishProperty(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    currentCount: number;
    maxAllowed: number;
  }> {
    const planConfig =
      await this.subscriptionsService.getUserPlanConfig(userId);

    const currentCount = await this.prisma.property.count({
      where: {
        landlordId: userId,
        status: { in: ['AVAILABLE', 'PENDING'] },
      },
    });

    const maxAllowed = planConfig.maxProperties;

    // -1 means unlimited
    if (maxAllowed === -1) {
      return {
        allowed: true,
        currentCount,
        maxAllowed,
      };
    }

    if (currentCount >= maxAllowed) {
      return {
        allowed: false,
        reason: `Has alcanzado el limite de ${maxAllowed} propiedad(es) publicada(s) en tu plan ${planConfig.name}. Actualiza tu plan para publicar mas.`,
        currentCount,
        maxAllowed,
      };
    }

    return {
      allowed: true,
      currentCount,
      maxAllowed,
    };
  }

  /**
   * Check if tenant can view scoring.
   * Gets plan config and checks ScoringUsage for current month.
   * Returns whether viewing is allowed and micropayment option.
   */
  async canViewScoring(userId: string): Promise<{
    allowed: boolean;
    reason?: string;
    remainingViews: number;
    canMicropay: boolean;
    micropayPrice?: number;
  }> {
    const planConfig =
      await this.subscriptionsService.getUserPlanConfig(userId);

    // Premium scoring or unlimited views
    if (planConfig.hasPremiumScoring || planConfig.maxScoringViews === -1) {
      return {
        allowed: true,
        remainingViews: -1, // unlimited
        canMicropay: false,
      };
    }

    // Check current month usage
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentYear = now.getFullYear();

    const usage = await this.prisma.scoringUsage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    const viewsUsed = usage ? usage.viewCount : 0;
    const paidViews = usage ? usage.paidViewCount : 0;
    const totalAllowed = planConfig.maxScoringViews + paidViews;
    const remainingViews = Math.max(0, totalAllowed - viewsUsed);

    if (viewsUsed >= totalAllowed) {
      return {
        allowed: false,
        reason: `Has agotado tus ${planConfig.maxScoringViews} vista(s) de scoring este mes. Puedes comprar vistas adicionales por $${planConfig.scoringViewPrice.toLocaleString('es-CO')} COP cada una.`,
        remainingViews: 0,
        canMicropay: planConfig.scoringViewPrice > 0,
        micropayPrice: planConfig.scoringViewPrice,
      };
    }

    return {
      allowed: true,
      remainingViews,
      canMicropay: false,
    };
  }

  /**
   * Record a scoring view for the current month.
   * Uses upsert: creates usage record if not exists, increments if exists.
   */
  async recordScoringView(userId: string): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await this.prisma.scoringUsage.upsert({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      },
      create: {
        userId,
        month: currentMonth,
        year: currentYear,
        viewCount: 1,
        paidViewCount: 0,
      },
      update: {
        viewCount: { increment: 1 },
      },
    });

    this.logger.debug(
      `Recorded scoring view for user ${userId}, month ${currentMonth}/${currentYear}`,
    );
  }

  /**
   * Record a paid scoring view (after micropayment succeeds).
   * Increments paidViewCount for current month.
   */
  async recordPaidScoringView(userId: string): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    await this.prisma.scoringUsage.upsert({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      },
      create: {
        userId,
        month: currentMonth,
        year: currentYear,
        viewCount: 0,
        paidViewCount: 1,
      },
      update: {
        paidViewCount: { increment: 1 },
      },
    });

    this.logger.debug(
      `Recorded paid scoring view for user ${userId}, month ${currentMonth}/${currentYear}`,
    );
  }

  /**
   * Get usage summary for user dashboard.
   * Shows plan name, properties used/limit, scoring views used/limit.
   */
  async getUsageSummary(userId: string): Promise<{
    plan: string;
    propertiesUsed: number;
    propertiesLimit: number;
    scoringViewsUsed: number;
    scoringViewsLimit: number;
  }> {
    const planConfig =
      await this.subscriptionsService.getUserPlanConfig(userId);

    // Count published properties
    const propertiesUsed = await this.prisma.property.count({
      where: {
        landlordId: userId,
        status: { in: ['AVAILABLE', 'PENDING'] },
      },
    });

    // Get current month scoring usage
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const usage = await this.prisma.scoringUsage.findUnique({
      where: {
        userId_month_year: {
          userId,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    return {
      plan: planConfig.name,
      propertiesUsed,
      propertiesLimit: planConfig.maxProperties,
      scoringViewsUsed: usage ? usage.viewCount : 0,
      scoringViewsLimit: planConfig.maxScoringViews,
    };
  }
}
