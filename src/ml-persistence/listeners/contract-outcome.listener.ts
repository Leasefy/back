import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service.js';
import { MlPersistenceService } from '../ml-persistence.service.js';
import { PredictionOutcome } from '../dto/prediction-outcome.enum.js';

/**
 * ContractOutcomeListener
 *
 * Listens to contract.activated events to:
 * 1. Record APPROVED_PENDING outcome in PredictionLog
 * 2. Link the leaseId to the PredictionLog record
 *
 * The ContractActivatedEvent does NOT carry applicationId, so this
 * listener resolves it by querying the Contract table via contractId.
 *
 * Event ordering note: LeasesModule's ContractActivatedListener creates
 * the Lease before this listener runs (LeasesModule is imported before
 * MlPersistenceModule in AppModule). If the lease hasn't been created yet,
 * the leaseId link is skipped -- the OutcomeTrackerScheduler will pick
 * it up later.
 *
 * Failures are caught and logged -- ML tracking must NEVER block
 * lease creation.
 */
@Injectable()
export class ContractOutcomeListener {
  private readonly logger = new Logger(ContractOutcomeListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mlPersistenceService: MlPersistenceService,
  ) {}

  @OnEvent('contract.activated')
  async handleContractActivated(event: {
    contractId: string;
  }): Promise<void> {
    try {
      // Resolve applicationId from contract -- the event does NOT carry it
      const contract = await this.prisma.contract.findUnique({
        where: { id: event.contractId },
        select: { applicationId: true },
      });

      if (!contract) {
        this.logger.warn(
          `ML: Contract ${event.contractId} not found, skipping outcome tracking`,
        );
        return;
      }

      const applicationId = contract.applicationId;

      // Record APPROVED_PENDING outcome
      await this.mlPersistenceService.recordOutcome(
        applicationId,
        PredictionOutcome.APPROVED_PENDING,
      );

      // Link the leaseId -- the lease was just created by ContractActivatedListener
      const lease = await this.prisma.lease.findFirst({
        where: { contractId: event.contractId },
        select: { id: true },
      });

      if (lease) {
        await this.prisma.predictionLog.updateMany({
          where: { applicationId },
          data: { leaseId: lease.id },
        });
      }

      this.logger.debug(
        `ML: Recorded APPROVED_PENDING outcome for application ${applicationId} (contract ${event.contractId})`,
      );
    } catch (error) {
      // ML tracking failure must NEVER block lease creation
      this.logger.warn(
        `ML: Failed to track lease outcome for contract ${event.contractId}: ${
          error instanceof Error ? error.message : 'Unknown'
        }`,
      );
    }
  }
}
