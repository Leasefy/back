import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../services/notifications.service.js';
import {
  VisitRequestedEvent,
  VisitStatusChangedEvent,
} from '../../visits/events/index.js';
import { VisitStatus } from '../../common/enums/index.js';

/**
 * Listener for visit-related events.
 * Leverages existing events from visits module.
 */
@Injectable()
export class VisitNotificationListener {
  private readonly logger = new Logger(VisitNotificationListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Handle visit.requested event.
   * Notify landlord of visit request.
   */
  @OnEvent('visit.requested')
  async handleVisitRequested(event: VisitRequestedEvent): Promise<void> {
    this.logger.log(`Visit requested: ${event.visitId}`);

    await this.notificationsService.send({
      userId: event.landlordId,
      templateCode: 'VISIT_REQUESTED',
      variables: {
        propertyTitle: event.propertyTitle,
        propertyAddress: event.propertyAddress,
        otherPartyName: event.tenantName,
        date: this.formatDateTime(event.visitDate, event.startTime),
      },
      triggeredBy: `visit:${event.visitId}`,
    });
  }

  /**
   * Handle visit.statusChanged event.
   * Notify relevant party based on status change.
   */
  @OnEvent('visit.statusChanged')
  async handleVisitStatusChanged(
    event: VisitStatusChangedEvent,
  ): Promise<void> {
    this.logger.log(
      `Visit status changed: ${event.visitId} -> ${event.newStatus}`,
    );

    let templateCode: string | null = null;
    let recipientId: string;

    switch (event.newStatus) {
      case VisitStatus.ACCEPTED:
        templateCode = 'VISIT_ACCEPTED';
        recipientId = event.tenantId;
        break;
      case VisitStatus.REJECTED:
        templateCode = 'VISIT_REJECTED';
        recipientId = event.tenantId;
        break;
      case VisitStatus.CANCELLED:
        templateCode = 'VISIT_CANCELLED';
        // Notify the other party (not the canceller)
        recipientId =
          event.changedBy === 'TENANT' ? event.landlordId : event.tenantId;
        break;
      case VisitStatus.RESCHEDULED:
        templateCode = 'VISIT_RESCHEDULED';
        // Notify the other party (not the rescheduler)
        recipientId =
          event.changedBy === 'TENANT' ? event.landlordId : event.tenantId;
        break;
      default:
        this.logger.debug(
          `No notification for visit status: ${event.newStatus}`,
        );
        return;
    }

    // Get actor name from changedBy role
    const actorName =
      event.changedBy === 'LANDLORD' ? 'El propietario' : 'El inquilino';

    await this.notificationsService.send({
      userId: recipientId,
      templateCode,
      variables: {
        propertyTitle: event.propertyTitle,
        otherPartyName: actorName,
        date: this.formatDateTime(event.visitDate, event.startTime),
      },
      triggeredBy: `visit:${event.visitId}`,
    });
  }

  /**
   * Format date and time for display.
   */
  private formatDateTime(date: Date, time: string): string {
    const dateStr = new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
    return `${dateStr} a las ${time}`;
  }
}
