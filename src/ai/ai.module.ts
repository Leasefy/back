import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { AiController } from './ai.controller.js';
import { CohereService } from './services/cohere.service.js';
import { OcrService } from './services/ocr.service.js';
import { DocumentAnalyzerService } from './services/document-analyzer.service.js';
import { CrossValidationService } from './services/cross-validation.service.js';
import { DocumentAnalysisProcessor } from './processors/document-analysis.processor.js';

/**
 * AiModule
 *
 * Provides AI-powered document analysis:
 * - OCR text extraction (Tesseract.js + pdf-parse)
 * - AI analysis with Cohere Command R+
 * - Cross-document validation
 * - BullMQ async processing queue
 *
 * Requires COHERE_API_KEY environment variable for AI features.
 * Subscription gated: PRO/BUSINESS only.
 */
@Module({
  imports: [
    SubscriptionsModule,
    // Reuse existing BullMQ Redis connection from ScoringModule root config
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'document-analysis',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  controllers: [AiController],
  providers: [
    CohereService,
    OcrService,
    DocumentAnalyzerService,
    CrossValidationService,
    DocumentAnalysisProcessor,
  ],
  exports: [CrossValidationService, CohereService],
})
export class AiModule {}
