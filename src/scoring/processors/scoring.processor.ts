import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { ApplicationStatus } from '../../common/enums/index.js';
import { FeatureBuilder } from '../features/feature-builder.js';
import { FinancialModel } from '../models/financial-model.js';
import { StabilityModel } from '../models/stability-model.js';
import { HistoryModel } from '../models/history-model.js';
import { IntegrityEngine } from '../models/integrity-engine.js';
import { PaymentHistoryModel } from '../models/payment-history-model.js';
import { ScoreAggregator } from '../aggregator/score-aggregator.js';
import { PaymentHistoryService } from '../services/payment-history.service.js';
import { ScoringJobData } from '../dto/scoring-job.dto.js';

/**
 * ScoringProcessor
 *
 * BullMQ worker that processes scoring jobs asynchronously.
 * Workflow:
 * 1. Receive job from 'scoring' queue
 * 2. Load application with property data
 * 3. Extract features using FeatureBuilder
 * 4. Run all scoring models (Financial, Stability, History, Integrity)
 * 5. Aggregate scores using ScoreAggregator
 * 6. Persist result to RiskScoreResult table
 * 7. Update application status to UNDER_REVIEW
 */
@Processor('scoring')
export class ScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(ScoringProcessor.name);

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
  ) {
    super();
  }

  /**
   * Process a scoring job.
   *
   * @param job - BullMQ job containing ScoringJobData
   */
  async process(job: Job<ScoringJobData>): Promise<void> {
    const { applicationId, triggeredBy } = job.data;
    this.logger.log(
      `Processing scoring job ${job.id} for application ${applicationId}`,
    );

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
    // IntegrityEngine uses analyze() which requires the full application for context
    const integrityResult = this.integrityEngine.analyze(application, features);

    // 5. Aggregate scores into final result (including payment history bonus)
    const result = this.scoreAggregator.combine({
      financial: financialResult,
      stability: stabilityResult,
      history: historyResult,
      integrity: integrityResult,
      paymentHistory: paymentHistoryResult,
    });

    // Collect all raw signals for debugging and analysis
    const allSignals = [
      ...financialResult.signals,
      ...stabilityResult.signals,
      ...historyResult.signals,
      ...integrityResult.signals,
      ...paymentHistoryResult.signals,
    ];

    // 6. Persist result to database
    // Cast arrays to InputJsonValue for Prisma 7.x strict JSON typing
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
        algorithmVersion: '1.1',
      },
    });

    // 7. Update application status to UNDER_REVIEW
    // Scoring runs async via BullMQ
    // Application transitions from SUBMITTED to UNDER_REVIEW when scoring completes
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
   * Handle failed jobs.
   * Logs error details for investigation.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<ScoringJobData>, error: Error): void {
    this.logger.error(
      `Scoring job ${job.id} failed for application ${job.data.applicationId}: ${error.message}`,
      error.stack,
    );
  }
}
