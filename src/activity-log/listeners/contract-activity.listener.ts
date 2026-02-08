import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType } from '../../common/enums/index.js';
import {
  ContractReadyEvent,
  ContractSignedEvent,
} from '../../notifications/events/contract.events.js';
import { ContractActivatedEvent } from '../../leases/events/contract-activated.event.js';

/**
 * Listener for contract-related events.
 * Creates activity log entries for both tenant and landlord
 * when contracts are created, signed, or activated.
 */
@Injectable()
export class ContractActivityListener {
  private readonly logger = new Logger(ContractActivityListener.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Handle contract.ready event.
   * Create activity entries for both parties when a contract is ready to sign.
   */
  @OnEvent('contract.ready')
  async handleContractReady(event: ContractReadyEvent): Promise<void> {
    try {
      // Entry for tenant (landlord created the contract)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.landlordId,
        type: ActivityType.CONTRACT_CREATED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
        },
      });

      // Entry for landlord (landlord is also the actor)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.landlordId,
        type: ActivityType.CONTRACT_CREATED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de contrato creado: ${event.contractId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle contract.signed event.
   * Create activity entries for both parties when one party signs.
   */
  @OnEvent('contract.signed')
  async handleContractSigned(event: ContractSignedEvent): Promise<void> {
    try {
      const actorId =
        event.signedBy === 'LANDLORD' ? event.landlordId : event.tenantId;

      // Entry for tenant
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId,
        type: ActivityType.CONTRACT_SIGNED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          signedBy: event.signedBy,
          fullyCompleted: event.fullyCompleted,
        },
      });

      // Entry for landlord
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId,
        type: ActivityType.CONTRACT_SIGNED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          signedBy: event.signedBy,
          fullyCompleted: event.fullyCompleted,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de contrato firmado: ${event.contractId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle contract.activated event.
   * Create CONTRACT_ACTIVATED and LEASE_CREATED activity entries for both parties.
   * This event is emitted when both signatures are complete and the contract transitions to ACTIVE.
   */
  @OnEvent('contract.activated')
  async handleContractActivated(
    event: ContractActivatedEvent,
  ): Promise<void> {
    try {
      // CONTRACT_ACTIVATED entries for both parties
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.landlordId,
        type: ActivityType.CONTRACT_ACTIVATED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: `${event.propertyAddress}, ${event.propertyCity}`,
        },
      });

      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.landlordId,
        type: ActivityType.CONTRACT_ACTIVATED,
        resourceType: 'contract',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: `${event.propertyAddress}, ${event.propertyCity}`,
        },
      });

      // LEASE_CREATED entries for both parties
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.landlordId,
        type: ActivityType.LEASE_CREATED,
        resourceType: 'lease',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: `${event.propertyAddress}, ${event.propertyCity}`,
          monthlyRent: event.monthlyRent,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
        },
      });

      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.landlordId,
        type: ActivityType.LEASE_CREATED,
        resourceType: 'lease',
        resourceId: event.contractId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: `${event.propertyAddress}, ${event.propertyCity}`,
          monthlyRent: event.monthlyRent,
          tenantName: event.tenantName,
          startDate: event.startDate.toISOString(),
          endDate: event.endDate.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de contrato activado: ${event.contractId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
