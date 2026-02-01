import { Module } from '@nestjs/common';
import { LandlordController } from './landlord.controller.js';
import { LandlordService } from './landlord.service.js';
import { ApplicationsModule } from '../applications/applications.module.js';
import { DocumentsModule } from '../documents/documents.module.js';
import { ScoringModule } from '../scoring/scoring.module.js';

/**
 * LandlordModule
 *
 * Provides landlord-specific functionality for managing candidates.
 * Orchestrates existing services - does not duplicate logic.
 *
 * Imports:
 * - ApplicationsModule: For state machine and event logging
 * - DocumentsModule: For document access (signed URLs)
 * - ScoringModule: For score retrieval
 */
@Module({
  imports: [ApplicationsModule, DocumentsModule, ScoringModule],
  controllers: [LandlordController],
  providers: [LandlordService],
  exports: [LandlordService],
})
export class LandlordModule {}
