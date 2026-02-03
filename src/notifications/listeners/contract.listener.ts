import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service.js';
import { ContractReadyEvent, ContractSignedEvent } from '../events/contract.events.js';

/**
 * Listener for contract-related events.
 * Sends notifications for contract lifecycle events.
 */
@Injectable()
export class ContractNotificationListener {
  private readonly logger = new Logger(ContractNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle contract.ready event.
   * Notify tenant that contract is ready to sign.
   */
  @OnEvent('contract.ready')
  async handleContractReady(event: ContractReadyEvent): Promise<void> {
    this.logger.log(`Contract ready: ${event.contractId}`);

    await this.notificationsService.send({
      userId: event.tenantId,
      templateCode: 'CONTRACT_READY_TO_SIGN',
      variables: {
        propertyTitle: event.propertyTitle,
        propertyAddress: event.propertyAddress,
        otherPartyName: event.landlordName,
      },
      triggeredBy: `contract:${event.contractId}`,
    });
  }

  /**
   * Handle contract.signed event.
   * Notify other party of signature, or both if completed.
   */
  @OnEvent('contract.signed')
  async handleContractSigned(event: ContractSignedEvent): Promise<void> {
    this.logger.log(
      `Contract signed: ${event.contractId} by ${event.signedBy}, completed: ${event.fullyCompleted}`,
    );

    if (event.fullyCompleted) {
      // Both parties signed - notify both
      await this.notificationsService.sendBulk(
        [event.landlordId, event.tenantId],
        'CONTRACT_COMPLETED',
        {
          propertyTitle: event.propertyTitle,
        },
        `contract:${event.contractId}`,
      );
    } else {
      // One party signed - notify the other
      const templateCode =
        event.signedBy === 'LANDLORD'
          ? 'CONTRACT_LANDLORD_SIGNED'
          : 'CONTRACT_TENANT_SIGNED';
      const recipientId =
        event.signedBy === 'LANDLORD' ? event.tenantId : event.landlordId;

      await this.notificationsService.send({
        userId: recipientId,
        templateCode,
        variables: {
          propertyTitle: event.propertyTitle,
          otherPartyName: event.signerName,
        },
        triggeredBy: `contract:${event.contractId}`,
      });
    }
  }
}
