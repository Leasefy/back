import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service.js';
import { ContractActivatedEvent } from './contract-activated.event.js';
import { LeaseStatus, PropertyStatus } from '../../common/enums/index.js';

/**
 * Listener for contract.activated event
 * Creates a Lease and updates property status to RENTED
 *
 * Requirements: LEAS-01, LEAS-03
 */
@Injectable()
export class ContractActivatedListener {
  private readonly logger = new Logger(ContractActivatedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('contract.activated')
  async handleContractActivated(event: ContractActivatedEvent): Promise<void> {
    this.logger.log(`Creating lease for contract ${event.contractId}`);

    try {
      // Use transaction to create lease and update property atomically
      await this.prisma.$transaction(async (tx) => {
        // Create the lease with denormalized data
        await tx.lease.create({
          data: {
            contractId: event.contractId,
            propertyId: event.propertyId,
            landlordId: event.landlordId,
            tenantId: event.tenantId,
            status: LeaseStatus.ACTIVE,
            propertyAddress: event.propertyAddress,
            propertyCity: event.propertyCity,
            landlordName: event.landlordName,
            landlordEmail: event.landlordEmail,
            tenantName: event.tenantName,
            tenantEmail: event.tenantEmail,
            tenantPhone: event.tenantPhone,
            startDate: event.startDate,
            endDate: event.endDate,
            monthlyRent: event.monthlyRent,
            deposit: event.deposit,
            paymentDay: event.paymentDay,
          },
        });

        // Update property status to RENTED
        await tx.property.update({
          where: { id: event.propertyId },
          data: { status: PropertyStatus.RENTED },
        });
      });

      this.logger.log(`Lease created successfully for contract ${event.contractId}`);
    } catch (error) {
      this.logger.error(`Failed to create lease for contract ${event.contractId}`, error);
      throw error;
    }
  }
}
