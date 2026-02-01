import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { ApplicationEventService } from '../applications/events/application-event.service.js';
import { DocumentsService } from '../documents/documents.service.js';
import { ApplicationStatus, RiskLevel, DocumentType, ApplicationEventType } from '../common/enums/index.js';
import { CandidateCardDto, CandidateDetailDto } from './dto/index.js';

/**
 * LandlordService
 *
 * Business logic for landlord candidate management.
 * Orchestrates existing services - does not duplicate logic.
 *
 * Key patterns:
 * - verifyLandlordOwnership() before every operation
 * - Use existing ApplicationEventService for event logging
 * - Use existing DocumentsService for document access
 * - Sort candidates by score (highest first)
 */
@Injectable()
export class LandlordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventService: ApplicationEventService,
    private readonly documentsService: DocumentsService,
  ) {}

  /**
   * Verify landlord owns the property.
   * Returns property if owned, throws ForbiddenException if not.
   */
  private async verifyPropertyOwnership(
    propertyId: string,
    landlordId: string,
  ): Promise<{ id: string; title: string; monthlyRent: number }> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, title: true, monthlyRent: true, landlordId: true },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

    return { id: property.id, title: property.title, monthlyRent: property.monthlyRent };
  }

  /**
   * Verify landlord owns the property that the application belongs to.
   * Returns application with property info if owned.
   */
  private async verifyApplicationOwnership(
    applicationId: string,
    landlordId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { id: true, title: true, monthlyRent: true, landlordId: true },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
        riskScore: true,
        documents: {
          orderBy: { createdAt: 'asc' },
        },
        notes: {
          where: { landlordId },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    if (application.property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not have access to this application');
    }

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
    landlordId: string,
  ): Promise<CandidateCardDto[]> {
    await this.verifyPropertyOwnership(propertyId, landlordId);

    // Reviewable states: applications landlord can take action on
    const reviewableStatuses = [
      ApplicationStatus.SUBMITTED,
      ApplicationStatus.UNDER_REVIEW,
      ApplicationStatus.NEEDS_INFO,
      ApplicationStatus.PREAPPROVED,
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
          where: { landlordId },
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
      tenantName: [app.tenant.firstName, app.tenant.lastName].filter(Boolean).join(' ') || 'Unknown',
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
   * Get full candidate detail for landlord review.
   * Includes score breakdown, documents list, timeline, and note.
   *
   * Requirements: LAND-04
   */
  async getCandidateDetail(
    applicationId: string,
    landlordId: string,
  ): Promise<CandidateDetailDto> {
    const app = await this.verifyApplicationOwnership(applicationId, landlordId);

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
            drivers: app.riskScore.drivers as Array<{ text: string; positive: boolean }>,
            flags: app.riskScore.flags as Array<{ code: string; severity: string; message: string }>,
            conditions: app.riskScore.conditions as Array<{ type: string; message: string; required: boolean }>,
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
    landlordId: string,
  ): Promise<{ url: string; expiresAt: Date }> {
    // DocumentsService.getSignedUrl already verifies landlord access
    return this.documentsService.getSignedUrl(applicationId, documentId, landlordId);
  }
}
