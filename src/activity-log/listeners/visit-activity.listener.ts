import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ActivityLogService } from '../activity-log.service.js';
import { ActivityType, VisitStatus } from '../../common/enums/index.js';
import {
  VisitRequestedEvent,
  VisitStatusChangedEvent,
} from '../../visits/events/index.js';

/**
 * Listener for visit-related events.
 * Creates activity log entries for both tenant and landlord
 * when visits are requested or their status changes.
 */
@Injectable()
export class VisitActivityListener {
  private readonly logger = new Logger(VisitActivityListener.name);

  constructor(private readonly activityLogService: ActivityLogService) {}

  /**
   * Handle visit.requested event.
   * Create activity entries for both tenant (who requested) and landlord (who receives).
   */
  @OnEvent('visit.requested')
  async handleVisitRequested(event: VisitRequestedEvent): Promise<void> {
    try {
      // Entry for tenant (actor is the tenant who requested)
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.tenantId,
        type: ActivityType.VISIT_REQUESTED,
        resourceType: 'visit',
        resourceId: event.visitId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          visitDate: event.visitDate.toISOString(),
          startTime: event.startTime,
        },
      });

      // Entry for landlord (actor is the tenant)
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.tenantId,
        type: ActivityType.VISIT_REQUESTED,
        resourceType: 'visit',
        resourceId: event.visitId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          tenantName: event.tenantName,
          visitDate: event.visitDate.toISOString(),
          startTime: event.startTime,
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de visita solicitada: ${event.visitId}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Handle visit.statusChanged event.
   * Maps VisitStatus to ActivityType and creates entries for both parties.
   */
  @OnEvent('visit.statusChanged')
  async handleVisitStatusChanged(
    event: VisitStatusChangedEvent,
  ): Promise<void> {
    try {
      const activityType = this.mapStatusToActivityType(event.newStatus);
      if (!activityType) {
        this.logger.debug(
          `Sin tipo de actividad para estado de visita: ${event.newStatus}`,
        );
        return;
      }

      // Entry for tenant
      await this.activityLogService.create({
        userId: event.tenantId,
        actorId: event.changedByUserId,
        type: activityType,
        resourceType: 'visit',
        resourceId: event.visitId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          newStatus: event.newStatus,
          visitDate: event.visitDate.toISOString(),
          ...(event.reason ? { reason: event.reason } : {}),
        },
      });

      // Entry for landlord
      await this.activityLogService.create({
        userId: event.landlordId,
        actorId: event.changedByUserId,
        type: activityType,
        resourceType: 'visit',
        resourceId: event.visitId,
        metadata: {
          propertyId: event.propertyId,
          propertyTitle: event.propertyTitle,
          newStatus: event.newStatus,
          visitDate: event.visitDate.toISOString(),
        },
      });
    } catch (error) {
      this.logger.error(
        `Error al registrar actividad de cambio de estado de visita: ${event.visitId} -> ${event.newStatus}`,
        error instanceof Error ? error.stack : error,
      );
    }
  }

  /**
   * Map VisitStatus to the corresponding ActivityType.
   * Returns null for statuses that don't have a corresponding activity type.
   */
  private mapStatusToActivityType(status: VisitStatus): ActivityType | null {
    switch (status) {
      case VisitStatus.ACCEPTED:
        return ActivityType.VISIT_ACCEPTED;
      case VisitStatus.REJECTED:
        return ActivityType.VISIT_REJECTED;
      case VisitStatus.CANCELLED:
        return ActivityType.VISIT_CANCELLED;
      case VisitStatus.COMPLETED:
        return ActivityType.VISIT_COMPLETED;
      case VisitStatus.RESCHEDULED:
        return ActivityType.VISIT_RESCHEDULED;
      default:
        return null;
    }
  }
}
