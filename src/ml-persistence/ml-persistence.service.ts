import { Injectable, Logger } from '@nestjs/common';
import type { Prisma, RiskLevel } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { PredictionOutcome } from './dto/index.js';
import type { ScoringFeatures } from '../scoring/features/scoring-features.interface.js';

/**
 * MlPersistenceService
 *
 * Handles ML persistence for scoring predictions:
 * 1. Feature snapshots - immutable point-in-time features
 * 2. Prediction logs - predicted score vs actual outcome
 * 3. Outcome tracking - update outcomes when applications are decided
 *
 * This enables:
 * - Model reproducibility (exact features at prediction time)
 * - Performance tracking (prediction accuracy)
 * - Retraining datasets (features + outcomes)
 */
@Injectable()
export class MlPersistenceService {
  private readonly logger = new Logger(MlPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create immutable feature snapshot for an application.
   * Called during scoring to preserve exact features used.
   *
   * @param applicationId - Application UUID
   * @param features - Complete feature vector
   * @param algorithmVersion - Version of algorithm (e.g., "2.1")
   */
  async createSnapshot(
    applicationId: string,
    features: ScoringFeatures,
    algorithmVersion: string,
  ): Promise<void> {
    try {
      await this.prisma.applicationFeatureSnapshot.create({
        data: {
          applicationId,
          features: features as unknown as Prisma.InputJsonValue,
          algorithmVersion,
        },
      });

      this.logger.log(
        `Feature snapshot created for application ${applicationId} (v${algorithmVersion})`,
      );
    } catch (error) {
      // Log error but don't throw - snapshot failure should not block scoring
      this.logger.error(
        `Failed to create feature snapshot for application ${applicationId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Create or update prediction log with predicted score and level.
   * Called after scoring completes. Idempotent (upsert).
   *
   * @param applicationId - Application UUID
   * @param predictedScore - Total score (0-100)
   * @param predictedLevel - Risk level (A, B, C, D)
   * @param algorithmVersion - Version of algorithm
   */
  async createPredictionLog(
    applicationId: string,
    predictedScore: number,
    predictedLevel: RiskLevel,
    algorithmVersion: string,
  ): Promise<void> {
    try {
      await this.prisma.predictionLog.upsert({
        where: { applicationId },
        create: {
          applicationId,
          predictedScore,
          predictedLevel,
          algorithmVersion,
          actualOutcome: PredictionOutcome.PENDING,
        },
        update: {
          predictedScore,
          predictedLevel,
          algorithmVersion,
          // Don't overwrite outcome if already set
        },
      });

      this.logger.log(
        `Prediction log created for application ${applicationId}: score=${predictedScore}, level=${predictedLevel}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to create prediction log for application ${applicationId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Record actual outcome for a prediction log.
   * Called by event listeners when application status changes or contract activates.
   * Only updates if current outcome is PENDING (terminal outcomes are not overwritten).
   *
   * @param applicationId - Application UUID
   * @param outcome - Actual outcome (any PredictionOutcome value)
   */
  async recordOutcome(
    applicationId: string,
    outcome: PredictionOutcome,
  ): Promise<void> {
    try {
      const result = await this.prisma.predictionLog.updateMany({
        where: {
          applicationId,
          actualOutcome: PredictionOutcome.PENDING, // Only update if still pending
        },
        data: {
          actualOutcome: outcome,
          outcomeRecordedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Outcome recorded for application ${applicationId}: ${outcome}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to record outcome for application ${applicationId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Record lease outcome with detailed payment performance data.
   * Called by OutcomeTrackerScheduler to update predictions from lease payment history.
   * Updates APPROVED_PENDING predictions to a final outcome category.
   *
   * @param applicationId - Application UUID
   * @param leaseId - Lease UUID
   * @param outcome - Outcome category (APPROVED_PAID_ON_TIME, APPROVED_LATE_PAYMENTS, etc.)
   * @param monthsTracked - Number of months since lease start
   * @param latePaymentCount - Number of late payments detected
   */
  async recordLeaseOutcome(
    applicationId: string,
    leaseId: string,
    outcome: PredictionOutcome,
    monthsTracked: number,
    latePaymentCount: number,
  ): Promise<void> {
    try {
      const defaulted =
        outcome === PredictionOutcome.APPROVED_DEFAULTED;

      const result = await this.prisma.predictionLog.updateMany({
        where: {
          applicationId,
          // Allow updating from PENDING or APPROVED_PENDING
          actualOutcome: {
            in: [PredictionOutcome.PENDING, PredictionOutcome.APPROVED_PENDING],
          },
        },
        data: {
          actualOutcome: outcome,
          outcomeRecordedAt: new Date(),
          leaseId,
          monthsTracked,
          latePaymentCount,
          defaulted,
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Lease outcome recorded for application ${applicationId}: ${outcome} (months=${monthsTracked}, late=${latePaymentCount})`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to record lease outcome for application ${applicationId}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
