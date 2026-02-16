import { Module } from '@nestjs/common';
import { MlPersistenceService } from './ml-persistence.service.js';
import { ApplicationOutcomeListener } from './listeners/application-outcome.listener.js';
import { ContractOutcomeListener } from './listeners/contract-outcome.listener.js';
import { OutcomeTrackerScheduler } from './scheduled/outcome-tracker.scheduler.js';

/**
 * MlPersistenceModule
 *
 * Provides ML persistence services for scoring predictions.
 * Tracks features, predictions, and outcomes for model evaluation.
 *
 * Includes:
 * - MlPersistenceService: core persistence operations
 * - ApplicationOutcomeListener: tracks REJECTED/WITHDRAWN outcomes via events
 * - ContractOutcomeListener: tracks APPROVED_PENDING outcomes via contract.activated events
 * - OutcomeTrackerScheduler: daily cron job updating outcomes from lease payment data
 *
 * Exports MlPersistenceService for use in ScoringModule.
 */
@Module({
  providers: [
    MlPersistenceService,
    ApplicationOutcomeListener,
    ContractOutcomeListener,
    OutcomeTrackerScheduler,
  ],
  exports: [MlPersistenceService],
})
export class MlPersistenceModule {}
