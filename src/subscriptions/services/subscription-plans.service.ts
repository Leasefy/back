import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { SubscriptionPlanConfig } from '@prisma/client';
import type { PlanType, SubscriptionPlan } from '../../common/enums/index.js';
import type { UpdatePlanPricingDto } from '../dto/index.js';

/**
 * SubscriptionPlansService
 *
 * Manages subscription plan configurations (admin-configurable).
 * Provides read access for public plan listing and internal lookups.
 * Provides admin update access for pricing/limits changes.
 */
@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all active plans, optionally filtered by TENANT/LANDLORD.
   * Used by public endpoint to display available plans.
   */
  async findAll(planType?: PlanType): Promise<SubscriptionPlanConfig[]> {
    return this.prisma.subscriptionPlanConfig.findMany({
      where: {
        isActive: true,
        ...(planType ? { planType } : {}),
      },
      orderBy: [{ planType: 'asc' }, { monthlyPrice: 'asc' }],
    });
  }

  /**
   * Get a single plan by ID.
   * Throws NotFoundException if not found.
   */
  async findById(id: string): Promise<SubscriptionPlanConfig> {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: { id },
    });

    if (!plan) {
      throw new NotFoundException(`Plan con ID ${id} no encontrado`);
    }

    return plan;
  }

  /**
   * Look up plan config by type + tier combination.
   * Used internally to find the correct plan for a user's role.
   */
  async findByTypeAndTier(
    planType: PlanType,
    tier: SubscriptionPlan,
  ): Promise<SubscriptionPlanConfig> {
    const plan = await this.prisma.subscriptionPlanConfig.findUnique({
      where: {
        planType_tier: {
          planType,
          tier,
        },
      },
    });

    if (!plan) {
      throw new NotFoundException(
        `Plan ${tier} para ${planType} no encontrado`,
      );
    }

    return plan;
  }

  /**
   * Admin updates plan pricing/limits.
   * Validates plan exists, applies partial update.
   */
  async updatePricing(
    id: string,
    dto: UpdatePlanPricingDto,
  ): Promise<SubscriptionPlanConfig> {
    // Verify plan exists
    await this.findById(id);

    return this.prisma.subscriptionPlanConfig.update({
      where: { id },
      data: {
        ...(dto.monthlyPrice !== undefined && {
          monthlyPrice: dto.monthlyPrice,
        }),
        ...(dto.annualPrice !== undefined && { annualPrice: dto.annualPrice }),
        ...(dto.scoringViewPrice !== undefined && {
          scoringViewPrice: dto.scoringViewPrice,
        }),
        ...(dto.maxProperties !== undefined && {
          maxProperties: dto.maxProperties,
        }),
        ...(dto.maxScoringViews !== undefined && {
          maxScoringViews: dto.maxScoringViews,
        }),
        ...(dto.hasPremiumScoring !== undefined && {
          hasPremiumScoring: dto.hasPremiumScoring,
        }),
        ...(dto.hasApiAccess !== undefined && {
          hasApiAccess: dto.hasApiAccess,
        }),
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
    });
  }
}
