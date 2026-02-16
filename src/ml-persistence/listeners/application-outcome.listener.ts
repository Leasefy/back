import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { MlPersistenceService } from '../ml-persistence.service.js';
import { PredictionOutcome } from '../dto/prediction-outcome.enum.js';

/**
 * ApplicationOutcomeListener
 *
 * Listens to application.statusChanged events to record terminal
 * negative outcomes (REJECTED, WITHDRAWN) in PredictionLog.
 *
 * This is a dedicated ML listener, separate from the notification
 * listener that also listens to the same event. NestJS EventEmitter
 * supports multiple listeners per event.
 *
 * Failures are caught and logged -- ML tracking must NEVER block
 * the application flow.
 */
@Injectable()
export class ApplicationOutcomeListener {
  private readonly logger = new Logger(ApplicationOutcomeListener.name);

  constructor(private readonly mlPersistenceService: MlPersistenceService) {}

  @OnEvent('application.statusChanged')
  async handleApplicationStatusChanged(event: {
    applicationId: string;
    newStatus: string;
  }): Promise<void> {
    // Only track terminal negative outcomes
    if (event.newStatus !== 'REJECTED' && event.newStatus !== 'WITHDRAWN') {
      return;
    }

    try {
      const outcome =
        event.newStatus === 'REJECTED'
          ? PredictionOutcome.REJECTED
          : PredictionOutcome.WITHDRAWN;

      await this.mlPersistenceService.recordOutcome(
        event.applicationId,
        outcome,
      );
      this.logger.debug(
        `ML: Recorded ${outcome} outcome for application ${event.applicationId}`,
      );
    } catch (error) {
      // ML tracking failure must NEVER affect the application flow
      this.logger.warn(
        `ML: Failed to record outcome for application ${event.applicationId}: ${
          error instanceof Error ? error.message : 'Unknown'
        }`,
      );
    }
  }
}
