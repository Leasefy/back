import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType } from '../../common/enums/index.js';
import {
  ApplicationSubmittedEvent,
  ApplicationStatusChangedEvent,
} from '../../notifications/events/application.events.js';

/**
 * Listener for application-related events.
 * Creates activity log entries for both tenant and landlord
 * when applications are submitted or their status changes.
 */
@Injectable()
export class ApplicationActivityListener {
  private readonly logger = new Logger(ApplicationActivityListener.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Handle application.submitted event.
   * Create activity entries for both tenant (who submitted) and landlord (who receives).
   */
  @OnEvent('application.submitted')
  async handleApplicationSubmitted(
    event: ApplicationSubmittedEvent,
  ): Promise<void> {
    try {
      // Entry for tenant (actor is the tenant)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.tenantId,
        type: ActivityType.APPLICATION_SUBMITTED,
        resourceType: 'application',
        resourceId: event.applicationId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
        },
      });

      // Entry for landlord (actor is the tenant who submitted)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.tenantId,
        type: ActivityType.APPLICATION_SUBMITTED,
        resourceType: 'application',
        resourceId: event.applicationId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          tenantName: event.tenantName,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de solicitud enviada: ${event.applicationId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle application.statusChanged event.
   * Create activity entries for both tenant and landlord
   * when a landlord changes application status (approve, reject, request info).
   */
  @OnEvent('application.statusChanged')
  async handleApplicationStatusChanged(
    event: ApplicationStatusChangedEvent,
  ): Promise<void> {
    try {
      // Entry for tenant (landlord changed the status)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.landlordId,
        type: ActivityType.APPLICATION_STATUS_CHANGED,
        resourceType: 'application',
        resourceId: event.applicationId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          newStatus: event.newStatus,
        },
      });

      // Entry for landlord (landlord is also the actor)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.landlordId,
        type: ActivityType.APPLICATION_STATUS_CHANGED,
        resourceType: 'application',
        resourceId: event.applicationId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          newStatus: event.newStatus,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de cambio de estado: ${event.applicationId} -> ${event.newStatus}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }
}
