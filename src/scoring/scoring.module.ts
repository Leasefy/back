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

// Score aggregation
import { ScoreAggregator } from './aggregator/score-aggregator.js';

// Payment history scoring
import { PaymentHistoryService } from './services/payment-history.service.js';
import { PaymentHistoryModel } from './models/payment-history-model.js';

// Document verification scoring
import { DocumentVerificationModel } from './models/document-verification-model.js';

// Processor, service, and controller
import { ScoringProcessor } from './processors/scoring.processor.js';
import { ScoringService } from './scoring.service.js';
import { ScoringController } from './scoring.controller.js';

// Subscriptions for plan enforcement
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';

// AI module (Cohere service for narrative generation)
import { AiModule } from '../ai/ai.module.js';

// ML persistence for predictions
import { MlPersistenceModule } from '../ml-persistence/ml-persistence.module.js';

// Explainability services
import { DriverFormatterService } from './explainability/driver-formatter.service.js';
import { NarrativeGeneratorService } from './explainability/narrative-generator.service.js';
import { TemplateGeneratorService } from './explainability/template-generator.service.js';
import { ExplainabilityService } from './explainability/explainability.service.js';

/**
 * ScoringModule
 *
 * Provides the scoring engine infrastructure:
 * - BullMQ queue for async scoring jobs
 * - Redis connection via Upstash
 * - Feature extraction from application data
 * - Scoring models for different risk dimensions
 * - Payment history bonus scoring
 *
 * The queue 'scoring' is used to:
 * - Process applications asynchronously
 * - Retry failed scoring attempts (3 attempts, exponential backoff)
 * - Keep history of completed/failed jobs for debugging
 *
 * Scoring Models (total 100 points base + 15 bonus):
 * - FinancialModel (35): RTI, DTI, disposable buffer
 * - StabilityModel (25): employment type, tenure, employer contact
 * - HistoryModel (15): landlord, employment, personal references
 * - IntegrityEngine (25): data consistency checks
 * - PaymentHistoryModel (+0-15 bonus): platform payment track record
 * - DocumentVerificationModel (+0-15 bonus): AI document analysis verification
 *
 * Complete provider list:
 * - FeatureBuilder: Extract scoring features from application data
 * - FinancialModel, StabilityModel, HistoryModel, IntegrityEngine: Base scoring models
 * - PaymentHistoryService, PaymentHistoryModel: Payment history bonus scoring
 * - DocumentVerificationModel: AI document verification bonus scoring
 * - ScoreAggregator: Combine subscores into final result (capped at 100)
 * - ScoringProcessor: BullMQ worker for async job processing
 * - ScoringService: Queue job creation interface
 */
@Module({
  controllers: [ScoringController],
  imports: [
    SubscriptionsModule,
    AiModule,
    MlPersistenceModule,
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
    // Payment history scoring
    PaymentHistoryService,
    PaymentHistoryModel,
    // Document verification scoring
    DocumentVerificationModel,
    // Score aggregation
    ScoreAggregator,
    // Explainability services
    DriverFormatterService,
    NarrativeGeneratorService,
    TemplateGeneratorService,
    ExplainabilityService,
    // Async processing
    ScoringProcessor,
    ScoringService,
  ],
  exports: [
    // Export ScoringService for use in ApplicationsModule
    ScoringService,
    // Export PaymentHistoryService for controller use
    PaymentHistoryService,
    PaymentHistoryModel,
    // Explainability for other modules
    ExplainabilityService,
  ],
})
export class ScoringModule {}
