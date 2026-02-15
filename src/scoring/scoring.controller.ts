import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ForbiddenException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ScoringService } from './scoring.service.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../common/enums/index.js';
import type { User } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { PaymentHistoryService } from './services/payment-history.service.js';
import { PaymentHistoryModel } from './models/payment-history-model.js';
import {
  PaymentReputationDto,
  ReputationTier,
} from './dto/payment-reputation.dto.js';
import { PlanEnforcementService } from '../subscriptions/services/plan-enforcement.service.js';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service.js';
import { ExplainabilityService } from './explainability/explainability.service.js';
import { ExplainabilityResponseDto } from './explainability/dto/index.js';

/**
 * ScoringController
 *
 * Endpoints for accessing risk score results.
 * Accessible by: tenant who owns the application OR landlord who owns the property.
 */
@ApiTags('scoring')
@ApiBearerAuth()
@Controller('scoring')
export class ScoringController {
  constructor(
    private readonly scoringService: ScoringService,
    private readonly prisma: PrismaService,
    private readonly paymentHistoryService: PaymentHistoryService,
    private readonly paymentHistoryModel: PaymentHistoryModel,
    private readonly planEnforcement: PlanEnforcementService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly explainabilityService: ExplainabilityService,
  ) {}

  /**
   * Get current user's payment reputation.
   * Available to tenants.
   */
  @Get('my-reputation')
  @Roles(Role.TENANT)
  @ApiOperation({
    summary: 'Get my payment reputation',
    description:
      'Returns payment history score and metrics for the authenticated tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Payment reputation data',
    type: PaymentReputationDto,
  })
  async getMyReputation(
    @CurrentUser() user: User,
  ): Promise<PaymentReputationDto> {
    // Get metrics for current user
    const metrics = await this.paymentHistoryService.getMetricsForTenant(
      user.id,
    );

    // Calculate score
    const result = this.paymentHistoryModel.calculate(metrics);

    // Calculate tier
    const tier = this.calculateTier(
      result.score,
      metrics.totalMonthsOnPlatform,
    );

    return {
      score: result.score,
      maxScore: result.maxScore,
      onTimePercentage: metrics.onTimePercentage,
      totalPayments: metrics.totalPayments,
      latePaymentCount: metrics.latePaymentCount,
      totalMonthsOnPlatform: metrics.totalMonthsOnPlatform,
      totalAmountPaid: metrics.totalAmountPaid,
      leaseCount: metrics.leaseCount,
      tier,
      signals: result.signals.map((s) => ({
        code: s.code,
        positive: s.positive,
        message: s.message,
      })),
    };
  }

  /**
   * Calculate reputation tier from score and tenure.
   */
  private calculateTier(
    score: number,
    monthsOnPlatform: number,
  ): ReputationTier {
    // Not enough history to have meaningful tier
    if (monthsOnPlatform < 3) return 'NEW';

    // Tier based on score thresholds
    if (score >= 12) return 'GOLD'; // 80%+ of max bonus
    if (score >= 8) return 'SILVER'; // 53%+ of max bonus
    if (score >= 4) return 'BRONZE'; // 27%+ of max bonus
    return 'NEW';
  }

  /**
   * Get detailed score explanation with AI narrative.
   * PRO/BUSINESS subscription required.
   */
  @Get(':applicationId/explanation')
  @ApiOperation({
    summary: 'Get detailed score explanation (PRO/BUSINESS only)',
    description:
      'Returns AI-generated narrative, enhanced drivers with category metadata, risk flags, suggested conditions, and subscore breakdown',
  })
  @ApiResponse({
    status: 200,
    description: 'Explanation generated',
    type: ExplainabilityResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Premium scoring required or not authorized',
  })
  @ApiResponse({ status: 404, description: 'Score not found' })
  async getExplanation(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ): Promise<ExplainabilityResponseDto> {
    // 1. Permission check: must be tenant owner OR property landlord
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: { select: { landlordId: true } },
      },
    });

    if (!application) {
      throw new NotFoundException('Aplicacion no encontrada');
    }

    const isTenantOwner = application.tenantId === user.id;
    const isLandlord = application.property.landlordId === user.id;

    if (!isTenantOwner && !isLandlord) {
      throw new ForbiddenException(
        'No tienes permiso para ver esta explicacion. Solo el aplicante o el propietario pueden acceder.',
      );
    }

    // 2. Check premium scoring access
    const planConfig = await this.subscriptionsService.getUserPlanConfig(
      user.id,
    );
    if (!planConfig.hasPremiumScoring) {
      throw new ForbiddenException({
        message:
          'Tu plan no incluye explicaciones detalladas de scoring. Actualiza a PRO o BUSINESS.',
        requiredPlan: 'PRO',
      });
    }

    // 3. Get score result
    const result = await this.scoringService.getScoreResult(applicationId);
    if (!result) {
      throw new NotFoundException(
        'Score no encontrado. El scoring puede estar en progreso o la aplicacion no fue enviada.',
      );
    }

    // 4. Generate or retrieve explanation
    return this.explainabilityService.getExplanation(result, application);
  }

  /**
   * Get the risk score result for an application.
   * Only accessible by the tenant owner or the property landlord.
   */
  @Get(':applicationId')
  @ApiOperation({ summary: 'Get risk score result for an application' })
  @ApiResponse({ status: 200, description: 'Score result found' })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to view this score',
  })
  @ApiResponse({
    status: 404,
    description: 'Score not found (scoring may still be in progress)',
  })
  async getScore(
    @CurrentUser() user: User,
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
  ) {
    // Fetch application with property to check permissions
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { landlordId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check permissions: must be tenant owner OR property landlord
    const isTenantOwner = application.tenantId === user.id;
    const isLandlord = application.property.landlordId === user.id;

    if (!isTenantOwner && !isLandlord) {
      throw new ForbiddenException(
        'You do not have permission to view this score. Only the applicant or property owner can access it.',
      );
    }

    // Check scoring view limits
    const viewCheck = await this.planEnforcement.canViewScoring(user.id);
    if (!viewCheck.allowed) {
      throw new ForbiddenException({
        message: 'Has alcanzado el limite de vistas de scoring este mes.',
        canMicropay: viewCheck.canMicropay,
        remainingViews: viewCheck.remainingViews,
        micropayPrice: viewCheck.micropayPrice,
      });
    }

    // Get the score result
    const result = await this.scoringService.getScoreResult(applicationId);

    if (!result) {
      throw new NotFoundException(
        'Score not found. Scoring may still be in progress or application was never submitted.',
      );
    }

    // Record the scoring view
    await this.planEnforcement.recordScoringView(user.id);

    // Get user's plan config to determine premium access
    const planConfig = await this.subscriptionsService.getUserPlanConfig(
      user.id,
    );

    // Basic scoring: only totalScore and level
    // Premium scoring: full details including drivers, flags, conditions
    if (!planConfig.hasPremiumScoring) {
      return {
        applicationId: result.applicationId,
        totalScore: result.totalScore,
        level: result.level,
        categories: {
          financial: result.financialScore,
          stability: result.stabilityScore,
          history: result.historyScore,
          integrity: result.integrityScore,
        },
        algorithmVersion: result.algorithmVersion,
        createdAt: result.createdAt,
        isPremium: false,
      };
    }

    return {
      applicationId: result.applicationId,
      totalScore: result.totalScore,
      level: result.level,
      categories: {
        financial: result.financialScore,
        stability: result.stabilityScore,
        history: result.historyScore,
        integrity: result.integrityScore,
      },
      drivers: result.drivers,
      flags: result.flags,
      conditions: result.conditions,
      algorithmVersion: result.algorithmVersion,
      createdAt: result.createdAt,
      isPremium: true,
    };
  }
}
