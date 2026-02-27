import { Injectable, Logger } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { ApplicationStatus } from '../common/enums/index.js';
import { FeatureBuilder } from './features/feature-builder.js';
import { FinancialModel } from './models/financial-model.js';
import { StabilityModel } from './models/stability-model.js';
import { HistoryModel } from './models/history-model.js';
import { IntegrityEngine } from './models/integrity-engine.js';
import { PaymentHistoryModel } from './models/payment-history-model.js';
import { DocumentVerificationModel } from './models/document-verification-model.js';
import { ScoreAggregator } from './aggregator/score-aggregator.js';
import { PaymentHistoryService } from './services/payment-history.service.js';
import { ExplainabilityService } from './explainability/explainability.service.js';
import { SubscriptionsService } from '../subscriptions/services/subscriptions.service.js';
import { MlPersistenceService } from '../ml-persistence/ml-persistence.service.js';
import { RiskScoreResult } from '@prisma/client';

/**
 * ScoringService
 *
 * Processes risk score calculations on-demand (no BullMQ queue).
 * Called directly when scoring is requested — no background polling.
 */
@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly featureBuilder: FeatureBuilder,
    private readonly financialModel: FinancialModel,
    private readonly stabilityModel: StabilityModel,
    private readonly historyModel: HistoryModel,
    private readonly integrityEngine: IntegrityEngine,
    private readonly scoreAggregator: ScoreAggregator,
    private readonly paymentHistoryService: PaymentHistoryService,
    private readonly paymentHistoryModel: PaymentHistoryModel,
    private readonly documentVerificationModel: DocumentVerificationModel,
    private readonly explainabilityService: ExplainabilityService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mlPersistenceService: MlPersistenceService,
  ) {}

  /**
   * Run scoring directly for an application.
   * No queue — processes inline when called.
   */
  async addScoringJob(
    applicationId: string,
    triggeredBy: string,
  ): Promise<void> {
    this.logger.log(`Processing scoring for application ${applicationId}`);

    // 1. Load application with property data
    const application = await this.prisma.application.findUniqueOrThrow({
      where: { id: applicationId },
      include: { property: true },
    });

    // 2. Get payment history metrics for tenant
    const paymentMetrics = await this.paymentHistoryService.getMetricsForTenant(
      application.tenantId,
    );
    const paymentHistoryResult =
      this.paymentHistoryModel.calculate(paymentMetrics);

    // 3. Extract features from application data
    const features = this.featureBuilder.build(
      application,
      application.property,
    );

    // 4. Run all scoring models
    const financialResult = this.financialModel.calculate(features);
    const stabilityResult = this.stabilityModel.calculate(features);
    const historyResult = this.historyModel.calculate(features);
    const integrityResult = this.integrityEngine.analyze(application, features);

    // 4b. Get document verification bonus
    const documentVerificationResult =
      await this.documentVerificationModel.calculate(applicationId);

    // 5. Aggregate scores into final result
    const result = this.scoreAggregator.combine({
      financial: financialResult,
      stability: stabilityResult,
      history: historyResult,
      integrity: integrityResult,
      paymentHistory: paymentHistoryResult,
      documentVerification: documentVerificationResult,
    });

    const allSignals = [
      ...financialResult.signals,
      ...stabilityResult.signals,
      ...historyResult.signals,
      ...integrityResult.signals,
      ...paymentHistoryResult.signals,
      ...documentVerificationResult.signals,
    ];

    // 6. Persist result to database
    await this.prisma.riskScoreResult.create({
      data: {
        applicationId,
        totalScore: result.total,
        level: result.level,
        financialScore: result.categories.financial,
        stabilityScore: result.categories.stability,
        historyScore: result.categories.history,
        integrityScore: result.categories.integrity,
        paymentHistoryScore: result.categories.paymentHistory ?? 0,
        signals: allSignals as unknown as Prisma.InputJsonValue,
        drivers: result.drivers as unknown as Prisma.InputJsonValue,
        flags: result.flags as unknown as Prisma.InputJsonValue,
        conditions: result.conditions as unknown as Prisma.InputJsonValue,
        algorithmVersion: '2.1',
      },
    });

    // 6a. Persist ML snapshot (non-blocking)
    try {
      await this.mlPersistenceService.createSnapshot(
        applicationId,
        features,
        '2.1',
      );
      await this.mlPersistenceService.createPredictionLog(
        applicationId,
        result.total,
        result.level,
        '2.1',
      );
    } catch (mlError) {
      this.logger.warn(
        `Failed to persist ML data for application ${applicationId}: ${
          mlError instanceof Error ? mlError.message : 'Unknown error'
        }`,
      );
    }

    // 6b. Generate AI narrative if premium
    try {
      const [tenantPlan, landlordPlan] = await Promise.all([
        this.subscriptionsService.getUserPlanConfig(application.tenantId),
        this.subscriptionsService.getUserPlanConfig(
          application.property.landlordId,
        ),
      ]);

      if (tenantPlan.hasPremiumScoring || landlordPlan.hasPremiumScoring) {
        const scoreResult = await this.prisma.riskScoreResult.findUnique({
          where: { applicationId },
          select: { id: true },
        });

        if (scoreResult) {
          await this.explainabilityService.generateAndCacheNarrative(
            scoreResult.id,
          );
        }
      }
    } catch (narrativeError) {
      this.logger.warn(
        `Failed to generate AI narrative for application ${applicationId}: ${
          narrativeError instanceof Error
            ? narrativeError.message
            : 'Unknown error'
        }`,
      );
    }

    // 7. Update application status to UNDER_REVIEW
    await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.UNDER_REVIEW },
    });

    this.logger.log(
      `Scoring complete for application ${applicationId}: ` +
        `total=${result.total}, level=${result.level}`,
    );
  }

  /**
   * Get the risk score result for an application.
   */
  async getScoreResult(applicationId: string): Promise<RiskScoreResult | null> {
    return this.prisma.riskScoreResult.findUnique({
      where: { applicationId },
    });
  }
}
