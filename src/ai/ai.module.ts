import { Module } from '@nestjs/common';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { AiController } from './ai.controller.js';
import { CohereService } from './services/cohere.service.js';
import { OcrService } from './services/ocr.service.js';
import { DocumentAnalyzerService } from './services/document-analyzer.service.js';
import { CrossValidationService } from './services/cross-validation.service.js';

/**
 * AiModule
 *
 * Provides AI-powered document analysis:
 * - OCR text extraction (Tesseract.js + pdf-parse)
 * - AI analysis with Cohere Command R+
 * - Cross-document validation
 *
 * Analysis runs on-demand (no BullMQ queue, no Redis polling).
 * Subscription gated: PRO/BUSINESS only.
 */
@Module({
  imports: [SubscriptionsModule],
  controllers: [AiController],
  providers: [
    CohereService,
    OcrService,
    DocumentAnalyzerService,
    CrossValidationService,
  ],
  exports: [CrossValidationService, CohereService],
})
export class AiModule {}
