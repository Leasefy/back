import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Feature extraction
import { FeatureBuilder } from './features/feature-builder.js';

// Scoring models
import { FinancialModel } from './models/financial-model.js';
import { StabilityModel } from './models/stability-model.js';
import { HistoryModel } from './models/history-model.js';
import { IntegrityEngine } from './models/integrity-engine.js';

/**
 * ScoringModule
 *
 * Provides the scoring engine infrastructure:
 * - BullMQ queue for async scoring jobs
 * - Redis connection via Upstash
 * - Feature extraction from application data
 * - Scoring models for different risk dimensions
 *
 * The queue 'scoring' is used to:
 * - Process applications asynchronously
 * - Retry failed scoring attempts (3 attempts, exponential backoff)
 * - Keep history of completed/failed jobs for debugging
 *
 * Scoring Models (total 100 points):
 * - FinancialModel (35): RTI, DTI, disposable buffer
 * - StabilityModel (25): employment type, tenure, employer contact
 * - HistoryModel (15): landlord, employment, personal references
 * - IntegrityEngine (25): data consistency checks
 *
 * Remaining providers to be added in 05-03:
 * - ScoringService, ScoringProcessor, ScoringController
 */
@Module({
  imports: [
    // Configure BullMQ with Redis connection from environment
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),

    // Register the 'scoring' queue with default job options
    BullModule.registerQueue({
      name: 'scoring',
      defaultJobOptions: {
        // Retry up to 3 times on failure
        attempts: 3,
        // Exponential backoff: 5s, 10s, 20s
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        // Keep last 100 completed jobs for debugging
        removeOnComplete: 100,
        // Keep last 500 failed jobs for investigation
        removeOnFail: 500,
      },
    }),
  ],
  providers: [
    // Feature extraction
    FeatureBuilder,
    // Scoring models
    FinancialModel,
    StabilityModel,
    HistoryModel,
    IntegrityEngine,
  ],
  exports: [
    // Export for use in scoring service (05-03)
    FeatureBuilder,
    FinancialModel,
    StabilityModel,
    HistoryModel,
    IntegrityEngine,
  ],
})
export class ScoringModule {}
