import { Module } from '@nestjs/common';

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

// Service and controller (no processor — scoring runs on-demand)
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
 * Provides the scoring engine infrastructure.
 * Scoring runs on-demand (no BullMQ queue, no Redis polling).
 * When scoring is requested, ScoringService processes inline.
 *
 * Scoring Models (total 100 points base + 15 bonus):
 * - FinancialModel (35): RTI, DTI, disposable buffer
 * - StabilityModel (25): employment type, tenure, employer contact
 * - HistoryModel (15): landlord, employment, personal references
 * - IntegrityEngine (25): data consistency checks
 * - PaymentHistoryModel (+0-15 bonus): platform payment track record
 * - DocumentVerificationModel (+0-15 bonus): AI document analysis verification
 */
@Module({
  controllers: [ScoringController],
  imports: [
    SubscriptionsModule,
    AiModule,
    MlPersistenceModule,
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
    // On-demand processing (no queue)
    ScoringService,
  ],
  exports: [
    ScoringService,
    PaymentHistoryService,
    PaymentHistoryModel,
    ExplainabilityService,
  ],
})
export class ScoringModule {}
