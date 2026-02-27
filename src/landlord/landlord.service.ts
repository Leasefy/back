import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../database/prisma.service.js';
import { ApplicationEventService } from '../applications/events/application-event.service.js';
import { ApplicationStateMachine } from '../applications/state-machine/application-state-machine.js';
import { DocumentsService } from '../documents/documents.service.js';
import { PropertiesService } from '../properties/properties.service.js';
import {
  ApplicationStatus,
  RiskLevel,
  DocumentType,
  ApplicationEventType,
} from '../common/enums/index.js';
import { ApplicationStatusChangedEvent } from '../notifications/events/application.events.js';
import {
  CandidateCardDto,
  CandidateDetailDto,
  PreapproveCandidateDto,
  ApproveCandidateDto,
  RejectCandidateDto,
  RequestInfoDto,
  CreateNoteDto,
} from './dto/index.js';
import type { Application, LandlordNote } from '@prisma/client';
import { PropertyAccessService } from '../property-access/property-access.service.js';
import { ChatService } from '../chat/chat.service.js';

/**
 * LandlordService
 *
 * Business logic for landlord candidate management.
 * Orchestrates existing services - does not duplicate logic.
 *
 * Key patterns:
 * - verifyPropertyAccess() before every operation (supports agents)
 * - Use existing ApplicationEventService for event logging
 * - Use existing DocumentsService for document access
 * - Sort candidates by score (highest first)
 */
@Injectable()
export class LandlordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ApplicationStateMachine,
    private readonly eventService: ApplicationEventService,
    private readonly documentsService: DocumentsService,
    private readonly propertiesService: PropertiesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly propertyAccessService: PropertyAccessService,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Verify user can access the property (owner or assigned agent).
   * Returns property if access granted, throws ForbiddenException if not.
   */
  private async verifyPropertyAccess(
    propertyId: string,
    userId: string,
  ): Promise<{ id: string; title: string; monthlyRent: number }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, monthlyRent: true, landlordId: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    await this.propertyAccessService.ensurePropertyAccess(userId, propertyId);

    return {
      id: property.id,
      title: property.title,
      monthlyRent: property.monthlyRent,
    };
  }

  /**
   * Verify user can access the property that the application belongs to.
   * Returns application with property info if access granted.
   */
  private async verifyApplicationAccess(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            monthlyRent: true,
            landlordId: true,
          },
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
        riskScore: true,
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        notes: {
          where: { landlordId: userId },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }

    await this.propertyAccessService.ensurePropertyAccess(
      userId,
      application.property.id,
    );

    return application;
  }

  /**
   * Get all candidates (submitted applications) for a property.
   * Sorted by risk score (highest first).
   * Only shows applications in reviewable states.
   *
   * Requirements: LAND-01, LAND-02, LAND-03
   */
  async getCandidates(
    propertyId: string,
    userId: string,
  ): Promise<CandidateCardDto[]> {
    await this.verifyPropertyAccess(propertyId, userId);

    // All visible states: reviewable + decided (so landlord sees full history)
    const reviewableStatuses = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.NEEDS_INFO,
      ApplicationStatus.PREAPPROVED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ];

    const applications = await this.prisma.application.findMany({
      where: {
        propertyId,
        status: { in: reviewableStatuses },
      },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        riskScore: {
          select: { totalScore: true, level: true },
        },
        notes: {
          where: { landlordId: userId },
          select: { id: true, content: true, updatedAt: true },
        },
      },
      orderBy: [
        // Primary: by score (highest first, nulls last)
        { riskScore: { totalScore: 'desc' } },
        // Secondary: by submission date (earliest first)
        { submittedAt: 'asc' },
      ],
    });

    return applications.map((app) => ({
      id: app.id,
      tenantName:
        [app.tenant.firstName, app.tenant.lastName].filter(Boolean).join(' ') ||
        'Unknown',
      tenantEmail: app.tenant.email,
      status: app.status as ApplicationStatus,
      submittedAt: app.submittedAt!,
      riskScore: app.riskScore
        ? {
            totalScore: app.riskScore.totalScore,
            level: app.riskScore.level as RiskLevel,
          }
        : undefined,
      note: app.notes[0]
        ? {
            id: app.notes[0].id,
            content: app.notes[0].content,
            updatedAt: app.notes[0].updatedAt,
          }
        : undefined,
    }));
  }

  /**
   * Get ALL candidates across all landlord properties.
   * Used by the /panel/candidatos page to show a global list.
   * Includes property title for display context.
   */
  async getAllCandidates(userId: string): Promise<{
    candidates: (CandidateCardDto & { propertyId: string; propertyTitle: string })[];
    total: number;
    stats: { total: number; pending: number; approved: number; rejected: number };
  }> {
    // Get all properties owned by this landlord
    const propertyIds = await this.prisma.property.findMany({
      where: { landlordId: userId },
      select: { id: true },
    });

    if (propertyIds.length === 0) {
      return { candidates: [], total: 0, stats: { total: 0, pending: 0, approved: 0, rejected: 0 } };
    }

    const ids = propertyIds.map((p) => p.id);

    // All reviewable + decided statuses for a complete view
    const allStatuses = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.NEEDS_INFO,
      ApplicationStatus.PREAPPROVED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ];

    const applications = await this.prisma.application.findMany({
      where: {
        propertyId: { in: ids },
        status: { in: allStatuses },
      },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        property: {
          select: { id: true, title: true },
        },
        riskScore: {
          select: { totalScore: true, level: true },
        },
        notes: {
          where: { landlordId: userId },
          select: { id: true, content: true, updatedAt: true },
        },
      },
      orderBy: [
        { riskScore: { totalScore: 'desc' } },
        { submittedAt: 'asc' },
      ],
    });

    const candidates = applications.map((app) => ({
      id: app.id,
      tenantName:
        [app.tenant.firstName, app.tenant.lastName].filter(Boolean).join(' ') ||
        'Unknown',
      tenantEmail: app.tenant.email,
      status: app.status as ApplicationStatus,
      submittedAt: app.submittedAt!,
      propertyId: app.property.id,
      propertyTitle: app.property.title,
      riskScore: app.riskScore
        ? {
            totalScore: app.riskScore.totalScore,
            level: app.riskScore.level as RiskLevel,
          }
        : undefined,
      note: app.notes[0]
        ? {
            id: app.notes[0].id,
            content: app.notes[0].content,
            updatedAt: app.notes[0].updatedAt,
          }
        : undefined,
    }));

    const pending = candidates.filter((c) =>
      [ApplicationStatus.SUBMITTED, ApplicationStatus.UNDER_REVIEW, ApplicationStatus.NEEDS_INFO, ApplicationStatus.PREAPPROVED].includes(c.status),
    ).length;
    const approved = candidates.filter((c) => c.status === ApplicationStatus.APPROVED).length;
    const rejected = candidates.filter((c) => c.status === ApplicationStatus.REJECTED).length;

    return {
      candidates,
      total: candidates.length,
      stats: { total: candidates.length, pending, approved, rejected },
    };
  }

  /**
   * Get full candidate detail for landlord review.
   * Includes score breakdown, documents list, timeline, and note.
   *
   * Requirements: LAND-04
   */
  async getCandidateDetail(
    applicationId: string,
    userId: string,
  ): Promise<CandidateDetailDto> {
    const app = await this.verifyApplicationAccess(applicationId, userId);

    // Get timeline separately using existing service
    const timeline = await this.eventService.getTimeline(applicationId);

    return {
      id: app.id,
      status: app.status as ApplicationStatus,
      submittedAt: app.submittedAt!,
      tenant: {
        id: app.tenant.id,
        firstName: app.tenant.firstName ?? '',
        lastName: app.tenant.lastName ?? '',
        email: app.tenant.email,
        phone: app.tenant.phone ?? undefined,
      },
      property: {
        id: app.property.id,
        title: app.property.title,
        monthlyRent: app.property.monthlyRent,
      },
      riskScore: app.riskScore
        ? {
            totalScore: app.riskScore.totalScore,
            level: app.riskScore.level as RiskLevel,
            financialScore: app.riskScore.financialScore,
            stabilityScore: app.riskScore.stabilityScore,
            historyScore: app.riskScore.historyScore,
            integrityScore: app.riskScore.integrityScore,
            drivers: app.riskScore.drivers as Array<{
              text: string;
              positive: boolean;
            }>,
            flags: app.riskScore.flags as Array<{
              code: string;
              severity: string;
              message: string;
            }>,
            conditions: app.riskScore.conditions as Array<{
              type: string;
              message: string;
              required: boolean;
            }>,
          }
        : undefined,
      documents: app.documents.map((doc) => ({
        id: doc.id,
        type: doc.type as DocumentType,
        originalName: doc.originalName,
        createdAt: doc.createdAt,
      })),
      timeline: timeline.map((event) => ({
        id: event.id,
        type: event.type as ApplicationEventType,
        metadata: event.metadata as Record<string, unknown>,
        createdAt: event.createdAt,
        actor: {
          id: (event as any).actor.id,
          firstName: (event as any).actor.firstName,
          lastName: (event as any).actor.lastName,
        },
      })),
      note: app.notes[0]
        ? {
            id: app.notes[0].id,
            content: app.notes[0].content,
            updatedAt: app.notes[0].updatedAt,
          }
        : undefined,
    };
  }

  /**
   * Get signed URL for a candidate's document.
   * Delegates to DocumentsService which already handles authorization.
   *
   * Requirements: LAND-10
   */
  async getDocumentUrl(
    applicationId: string,
    documentId: string,
    userId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    // DocumentsService.getSignedUrl already verifies access
    return this.documentsService.getSignedUrl(applicationId, documentId, userId);
  }

  /**
   * Pre-approve a candidate.
   * Transition: UNDER_REVIEW -> PREAPPROVED
   *
   * Requirements: LAND-05
   */
  async preapprove(
    applicationId: string,
    userId: string,
    dto: PreapproveCandidateDto,
  ): Promise<Application> {
    const app = await this.verifyApplicationAccess(applicationId, userId);

    // Validate transition using existing state machine
    this.stateMachine.validateTransition(
      app.status as ApplicationStatus,
      ApplicationStatus.PREAPPROVED,
    );

    // Update status
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.PREAPPROVED },
    });

    // Log event using existing event service
    await this.eventService.logStatusChanged(
      applicationId,
      userId,
      app.status as ApplicationStatus,
      ApplicationStatus.PREAPPROVED,
      dto.message,
    );

    return updated;
  }

  /**
   * Approve a candidate.
   * Transition: UNDER_REVIEW -> APPROVED or PREAPPROVED -> APPROVED
   *
   * Requirements: LAND-06
   */
  async approve(
    applicationId: string,
    userId: string,
    dto: ApproveCandidateDto,
  ): Promise<Application> {
    const app = await this.verifyApplicationAccess(applicationId, userId);

    // Validate transition
    this.stateMachine.validateTransition(
      app.status as ApplicationStatus,
      ApplicationStatus.APPROVED,
    );

    // Update status
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.APPROVED },
    });

    // Log event
    await this.eventService.logStatusChanged(
      applicationId,
      userId,
      app.status as ApplicationStatus,
      ApplicationStatus.APPROVED,
      dto.message,
    );

    // Emit notification event - use property landlord for notification target
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const actorName = actor
      ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
        actor.email
      : 'El propietario';

    this.eventEmitter.emit(
      'application.statusChanged',
      new ApplicationStatusChangedEvent(
        applicationId,
        app.property.id,
        app.tenantId,
        app.property.landlordId, // Notify the actual landlord
        ApplicationStatus.APPROVED,
        app.property.title,
        actorName,
      ),
    );

    return updated;
  }

  /**
   * Reject a candidate.
   * Transition: UNDER_REVIEW -> REJECTED or PREAPPROVED -> REJECTED
   *
   * Requirements: LAND-07
   */
  async reject(
    applicationId: string,
    userId: string,
    dto: RejectCandidateDto,
  ): Promise<Application> {
    const app = await this.verifyApplicationAccess(applicationId, userId);

    // Validate transition
    this.stateMachine.validateTransition(
      app.status as ApplicationStatus,
      ApplicationStatus.REJECTED,
    );

    // Update status
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.REJECTED },
    });

    // Log event with rejection reason
    await this.eventService.logStatusChanged(
      applicationId,
      userId,
      app.status as ApplicationStatus,
      ApplicationStatus.REJECTED,
      dto.reason,
    );

    // Emit notification event - use property landlord for notification target
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const actorName = actor
      ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
        actor.email
      : 'El propietario';

    this.eventEmitter.emit(
      'application.statusChanged',
      new ApplicationStatusChangedEvent(
        applicationId,
        app.property.id,
        app.tenantId,
        app.property.landlordId, // Notify the actual landlord
        ApplicationStatus.REJECTED,
        app.property.title,
        actorName,
      ),
    );

    // Delete chat conversation on rejection
    await this.chatService.deleteConversation(applicationId);

    return updated;
  }

  /**
   * Request additional information from candidate.
   * Transition: UNDER_REVIEW -> NEEDS_INFO
   *
   * Requirements: LAND-08
   */
  async requestInfo(
    applicationId: string,
    userId: string,
    dto: RequestInfoDto,
  ): Promise<Application> {
    const app = await this.verifyApplicationAccess(applicationId, userId);

    // Validate transition
    this.stateMachine.validateTransition(
      app.status as ApplicationStatus,
      ApplicationStatus.NEEDS_INFO,
    );

    // Update status
    const updated = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.NEEDS_INFO },
    });

    // Log INFO_REQUESTED event with the specific request
    await this.eventService.logInfoRequested(applicationId, userId, dto.message);

    // Log status change event
    await this.eventService.logStatusChanged(
      applicationId,
      userId,
      app.status as ApplicationStatus,
      ApplicationStatus.NEEDS_INFO,
      dto.message,
    );

    // Emit notification event - use property landlord for notification target
    const actor = await this.prisma.user.findUnique({ where: { id: userId } });
    const actorName = actor
      ? [actor.firstName, actor.lastName].filter(Boolean).join(' ') ||
        actor.email
      : 'El propietario';

    this.eventEmitter.emit(
      'application.statusChanged',
      new ApplicationStatusChangedEvent(
        applicationId,
        app.property.id,
        app.tenantId,
        app.property.landlordId, // Notify the actual landlord
        ApplicationStatus.NEEDS_INFO,
        app.property.title,
        actorName,
      ),
    );

    return updated;
  }

  /**
   * Create or update a private note on a candidate.
   * Uses upsert - creates if not exists, updates if exists.
   *
   * Requirements: LAND-09
   */
  async upsertNote(
    applicationId: string,
    userId: string,
    dto: CreateNoteDto,
  ): Promise<LandlordNote> {
    await this.verifyApplicationAccess(applicationId, userId);

    return this.prisma.landlordNote.upsert({
      where: {
        applicationId_landlordId: {
          applicationId,
          landlordId: userId,
        },
      },
      update: {
        content: dto.content,
      },
      create: {
        applicationId,
        landlordId: userId,
        content: dto.content,
      },
    });
  }

  /**
   * Delete a private note from a candidate.
   *
   * Requirements: LAND-09
   */
  async deleteNote(applicationId: string, userId: string): Promise<void> {
    await this.verifyApplicationAccess(applicationId, userId);

    await this.prisma.landlordNote.deleteMany({
      where: {
        applicationId,
        landlordId: userId,
      },
    });
  }

  /**
   * Get all properties for the authenticated landlord with candidate counts.
   * Returns properties + a summary object for the frontend dashboard.
   */
  async getMyProperties(landlordId: string) {
    const properties = await this.propertiesService.findByLandlord(landlordId);

    // Count applications per property
    const propertiesWithCounts = await Promise.all(
      properties.map(async (property) => {
        const counts = await this.prisma.application.groupBy({
          by: ['status'],
          where: { propertyId: property.id },
          _count: true,
        });

        const statusCounts = counts.reduce(
          (acc, c) => {
            acc[c.status] = c._count;
            return acc;
          },
          {} as Record<string, number>,
        );

        const candidateCount = counts.reduce((sum, c) => sum + c._count, 0);
        const pendingCount =
          (statusCounts[ApplicationStatus.SUBMITTED] ?? 0) +
          (statusCounts[ApplicationStatus.UNDER_REVIEW] ?? 0) +
          (statusCounts[ApplicationStatus.NEEDS_INFO] ?? 0);
        const preApprovedCount =
          statusCounts[ApplicationStatus.PREAPPROVED] ?? 0;
        const approvedCount = statusCounts[ApplicationStatus.APPROVED] ?? 0;

        return {
          ...property,
          candidateCount,
          pendingCount,
          preApprovedCount,
          approvedCount,
        };
      }),
    );

    const summary = {
      totalProperties: properties.length,
      activeLeases: 0,
      pendingApplications: propertiesWithCounts.reduce(
        (sum, p) => sum + p.pendingCount,
        0,
      ),
      monthlyRevenue: 0,
    };

    return { properties: propertiesWithCounts, summary };
  }

  /**
   * Get a single property for the authenticated landlord with candidate counts.
   */
  async getMyProperty(propertyId: string, landlordId: string) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        images: { orderBy: { order: 'asc' } },
      },
    });

    if (!property) {
      throw new NotFoundException(
        `Property with ID ${propertyId} not found`,
      );
    }

    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

    const counts = await this.prisma.application.groupBy({
      by: ['status'],
      where: { propertyId },
      _count: true,
    });

    const statusCounts = counts.reduce(
      (acc, c) => {
        acc[c.status] = c._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      ...property,
      candidateCount: counts.reduce((sum, c) => sum + c._count, 0),
      pendingCount:
        (statusCounts[ApplicationStatus.SUBMITTED] ?? 0) +
        (statusCounts[ApplicationStatus.UNDER_REVIEW] ?? 0) +
        (statusCounts[ApplicationStatus.NEEDS_INFO] ?? 0),
      preApprovedCount: statusCounts[ApplicationStatus.PREAPPROVED] ?? 0,
      approvedCount: statusCounts[ApplicationStatus.APPROVED] ?? 0,
    };
  }
}
