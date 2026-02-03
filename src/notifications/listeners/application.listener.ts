import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service.js';
import {
  ApplicationSubmittedEvent,
  ApplicationStatusChangedEvent,
} from '../events/application.events.js';

/**
 * Listener for application-related events.
 * Sends notifications to landlord/tenant based on event type.
 */
@Injectable()
export class ApplicationNotificationListener {
  private readonly logger = new Logger(ApplicationNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle application.submitted event.
   * Notify landlord of new application.
   */
  @OnEvent('application.submitted')
  async handleApplicationSubmitted(event: ApplicationSubmittedEvent): Promise<void> {
    this.logger.log(`Application submitted: ${event.applicationId}`);

    await this.notificationsService.send({
      userId: event.landlordId,
      templateCode: 'APPLICATION_RECEIVED',
      variables: {
        propertyTitle: event.propertyTitle,
        propertyAddress: event.propertyAddress,
        otherPartyName: event.tenantName,
      },
      triggeredBy: `application:${event.applicationId}`,
    });
  }

  /**
   * Handle application.statusChanged event.
   * Notify tenant of approval/rejection/info request.
   */
  @OnEvent('application.statusChanged')
  async handleApplicationStatusChanged(event: ApplicationStatusChangedEvent): Promise<void> {
    this.logger.log(`Application status changed: ${event.applicationId} -> ${event.newStatus}`);

    let templateCode: string | null = null;

    switch (event.newStatus) {
      case 'APPROVED':
        templateCode = 'APPLICATION_APPROVED';
        break;
      case 'REJECTED':
        templateCode = 'APPLICATION_REJECTED';
        break;
      case 'NEEDS_INFO':
        templateCode = 'APPLICATION_INFO_REQUESTED';
        break;
      default:
        this.logger.debug(`No notification for status: ${event.newStatus}`);
        return;
    }

    await this.notificationsService.send({
      userId: event.tenantId,
      templateCode,
      variables: {
        propertyTitle: event.propertyTitle,
        otherPartyName: event.landlordName,
      },
      triggeredBy: `application:${event.applicationId}`,
    });
  }
}
