import { Module } from '@nestjs/common';
import { MlPersistenceService } from './ml-persistence.service.js';

/**
 * MlPersistenceModule
 *
 * Provides ML persistence services for scoring predictions.
 * Tracks features, predictions, and outcomes for model evaluation.
 *
 * Exports MlPersistenceService for use in ScoringModule.
 */
@Module({
  providers: [MlPersistenceService],
  exports: [MlPersistenceService],
})
export class MlPersistenceModule {}
