import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';

/**
 * ScoringModule
 *
 * Provides the scoring engine infrastructure:
 * - BullMQ queue for async scoring jobs
 * - Redis connection via Upstash
 *
 * The queue 'scoring' is used to:
 * - Process applications asynchronously
 * - Retry failed scoring attempts (3 attempts, exponential backoff)
 * - Keep history of completed/failed jobs for debugging
 *
 * Providers and exports will be added in subsequent plans:
 * - 05-02: ScoringCalculator, FinancialScorer, StabilityScorer, etc.
 * - 05-03: ScoringService, ScoringProcessor, ScoringController
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
  providers: [],
  exports: [],
})
export class ScoringModule {}
