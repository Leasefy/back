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
   * Record actual outcome when application is rejected or withdrawn.
   * Called by application state transitions.
   *
   * @param applicationId - Application UUID
   * @param outcome - Actual outcome (REJECTED | WITHDRAWN)
   */
  async recordOutcome(
    applicationId: string,
    outcome: PredictionOutcome.REJECTED | PredictionOutcome.WITHDRAWN,
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
   * Record lease outcome when lease ends.
   * Called by lease lifecycle events.
   *
   * @param applicationId - Application UUID
   * @param successful - Whether lease completed successfully
   */
  async recordLeaseOutcome(
    applicationId: string,
    successful: boolean,
  ): Promise<void> {
    const outcome = successful
      ? PredictionOutcome.LEASE_SUCCESSFUL
      : PredictionOutcome.LEASE_PROBLEMATIC;

    try {
      const result = await this.prisma.predictionLog.updateMany({
        where: {
          applicationId,
          actualOutcome: PredictionOutcome.PENDING,
        },
        data: {
          actualOutcome: outcome,
          outcomeRecordedAt: new Date(),
        },
      });

      if (result.count > 0) {
        this.logger.log(
          `Lease outcome recorded for application ${applicationId}: ${outcome}`,
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
