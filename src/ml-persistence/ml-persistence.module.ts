import { Module } from '@nestjs/common';
import { MlPersistenceService } from './ml-persistence.service.js';
import { ApplicationOutcomeListener } from './listeners/application-outcome.listener.js';
import { ContractOutcomeListener } from './listeners/contract-outcome.listener.js';
import { OutcomeTrackerScheduler } from './scheduled/outcome-tracker.scheduler.js';
import { MlExportService } from './export/ml-export.service.js';
import { MlExportController } from './export/ml-export.controller.js';

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
 * - MlExportService: training data export with point-in-time correct queries
 * - MlExportController: ADMIN-only export and stats endpoints
 *
 * Exports MlPersistenceService for use in ScoringModule.
 */
@Module({
  controllers: [MlExportController],
  providers: [
    MlPersistenceService,
    ApplicationOutcomeListener,
    ContractOutcomeListener,
    OutcomeTrackerScheduler,
    MlExportService,
  ],
  exports: [MlPersistenceService],
})
export class MlPersistenceModule {}
