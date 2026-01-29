import { Injectable } from '@nestjs/common';
import type { ApplicationEvent, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { ApplicationEventType, ApplicationStatus } from '../../common/enums/index.js';

/**
 * Service for logging application events.
 * Creates audit trail entries for all significant actions.
 */
@Injectable()
export class ApplicationEventService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log a generic event.
   */
  async logEvent(
    applicationId: string,
    type: ApplicationEventType,
    actorId: string,
    metadata?: Record<string, unknown>,
  ): Promise<ApplicationEvent> {
    return this.prisma.applicationEvent.create({
      data: {
        applicationId,
        type,
        actorId,
        metadata: (metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Log application creation event.
   */
  async logCreated(applicationId: string, tenantId: string): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.CREATED, tenantId);
  }

  /**
   * Log wizard step completion.
   */
  async logStepCompleted(
    applicationId: string,
    actorId: string,
    step: number,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.STEP_COMPLETED, actorId, { step });
  }

  /**
   * Log application submission.
   */
  async logSubmitted(applicationId: string, tenantId: string): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.SUBMITTED, tenantId);
  }

  /**
   * Log status change (with previous and new status).
   */
  async logStatusChanged(
    applicationId: string,
    actorId: string,
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    reason?: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.STATUS_CHANGED, actorId, {
      from: fromStatus,
      to: toStatus,
      reason,
    });
  }

  /**
   * Log info request from landlord.
   */
  async logInfoRequested(
    applicationId: string,
    landlordId: string,
    message: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.INFO_REQUESTED, landlordId, {
      message,
    });
  }

  /**
   * Log info provided by tenant.
   */
  async logInfoProvided(
    applicationId: string,
    tenantId: string,
    message?: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.INFO_PROVIDED, tenantId, {
      message,
    });
  }

  /**
   * Log document upload.
   */
  async logDocumentUploaded(
    applicationId: string,
    tenantId: string,
    documentType: string,
    documentId: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.DOCUMENT_UPLOADED, tenantId, {
      documentType,
      documentId,
    });
  }

  /**
   * Log document deletion.
   */
  async logDocumentDeleted(
    applicationId: string,
    actorId: string,
    documentId: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.DOCUMENT_DELETED, actorId, {
      documentId,
    });
  }

  /**
   * Log withdrawal.
   */
  async logWithdrawn(
    applicationId: string,
    tenantId: string,
    reason?: string,
  ): Promise<ApplicationEvent> {
    return this.logEvent(applicationId, ApplicationEventType.WITHDRAWN, tenantId, { reason });
  }

  /**
   * Get timeline for an application (all events ordered by time).
   */
  async getTimeline(applicationId: string): Promise<ApplicationEvent[]> {
    return this.prisma.applicationEvent.findMany({
      where: { applicationId },
      orderBy: { createdAt: 'asc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        },
      },
    });
  }
}
