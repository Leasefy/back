import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Application } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import {
  ApplicationStatus,
  ApplicationEventType,
} from '../common/enums/index.js';
import { ApplicationSubmittedEvent } from '../notifications/events/application.events.js';
import { ApplicationStateMachine } from './state-machine/application-state-machine.js';
import { ApplicationEventService } from './events/application-event.service.js';
import {
  CreateApplicationDto,
  CreateCompleteApplicationDto,
  PersonalInfoDto,
  EmploymentInfoDto,
  IncomeInfoDto,
  ReferencesDto,
  SubmitApplicationDto,
  WithdrawApplicationDto,
  RespondInfoRequestDto,
} from './dto/index.js';
import { ScoringService } from '../scoring/scoring.service.js';
import { ChatService } from '../chat/chat.service.js';

type StepDto =
  | PersonalInfoDto
  | EmploymentInfoDto
  | IncomeInfoDto
  | ReferencesDto;

/**
 * Service for application operations.
 * Handles creation, wizard steps, and lifecycle management.
 */
@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: ApplicationStateMachine,
    private readonly eventService: ApplicationEventService,
    private readonly scoringService: ScoringService,
    private readonly eventEmitter: EventEmitter2,
    private readonly chatService: ChatService,
  ) {}

  /**
   * Flatten a Prisma Application into the shape the frontend expects.
   * Extracts fields from personalInfo, employmentInfo, incomeInfo, referencesInfo
   * JSON blobs and puts them at the root level.
   */
  private flattenApplication(app: any) {
    const personal = (app.personalInfo as Record<string, any>) ?? {};
    const employment = (app.employmentInfo as Record<string, any>) ?? {};
    const income = (app.incomeInfo as Record<string, any>) ?? {};
    const refs = (app.referencesInfo as Record<string, any>) ?? {};

    return {
      id: app.id,
      propertyId: app.propertyId,
      tenantId: app.tenantId,
      status: app.status,
      // Personal
      fullName: personal.fullName ?? null,
      documentType: personal.documentType ?? null,
      documentNumber: personal.documentNumber ?? null,
      dateOfBirth: personal.dateOfBirth ?? null,
      phone: personal.phone ?? null,
      email: personal.email ?? null,
      currentAddress: personal.currentAddress ?? null,
      timeAtCurrentAddress: personal.timeAtCurrentAddress ?? null,
      maritalStatus: personal.maritalStatus ?? null,
      dependents: personal.dependents ?? null,
      // Employment
      employmentStatus: employment.employmentStatus ?? null,
      companyName: employment.companyName ?? null,
      industry: employment.industry ?? null,
      position: employment.position ?? null,
      contractType: employment.contractType ?? null,
      timeAtJob: employment.timeAtJob ?? null,
      employerPhone: employment.employerPhone ?? null,
      employerAddress: employment.employerAddress ?? null,
      // Income
      monthlySalary: income.monthlySalary ?? null,
      additionalIncome: income.additionalIncome ?? null,
      additionalIncomeSource: income.additionalIncomeSource ?? null,
      totalMonthlyIncome: income.totalMonthlyIncome ?? null,
      monthlyObligations: income.monthlyObligations ?? null,
      availableForRent: income.availableForRent ?? null,
      // References
      references: {
        previousLandlords: refs.previousLandlords ?? [],
        employmentReferences: refs.employmentReferences ?? [],
        personalReferences: refs.personalReferences ?? [],
      },
      hasCoSigner: refs.hasCoSigner ?? false,
      coSigner: refs.coSigner ?? null,
      // Agent
      agentCode: personal.agentCode ?? null,
      linkCode: personal.linkCode ?? null,
      // Timestamps
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      // Relations (pass through if present)
      ...(app.documents !== undefined && { documents: app.documents }),
      ...(app.property !== undefined && { property: app.property }),
    };
  }

  /**
   * Create a new application for a property.
   */
  async create(
    tenantId: string,
    dto: CreateApplicationDto,
  ): Promise<Application> {
    // Verify property exists and is available
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(
        `Property with ID ${dto.propertyId} not found`,
      );
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Property is not available for applications',
      );
    }

    // Check if tenant already has an active application for this property
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        propertyId: dto.propertyId,
        tenantId,
        status: {
          notIn: [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED],
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You already have an active application for this property',
      );
    }

    // Create application
    const application = await this.prisma.application.create({
      data: {
        propertyId: dto.propertyId,
        tenantId,
        status: ApplicationStatus.DRAFT,
        currentStep: 1,
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log creation event
    await this.eventService.logCreated(application.id, tenantId);

    return application;
  }

  /**
   * Create an application with all wizard steps filled in one request.
   * Returns a flat response matching the frontend BackendApplication shape.
   */
  async createComplete(
    tenantId: string,
    dto: CreateCompleteApplicationDto,
  ) {
    // Verify property exists and is available
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(
        `Property with ID ${dto.propertyId} not found`,
      );
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Property is not available for applications',
      );
    }

    // Check for existing active application
    const existingApplication = await this.prisma.application.findFirst({
      where: {
        propertyId: dto.propertyId,
        tenantId,
        status: {
          notIn: [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED],
        },
      },
    });

    if (existingApplication) {
      throw new ConflictException(
        'You already have an active application for this property',
      );
    }

    // Map flat DTO into the step JSON fields for DB storage
    const personalInfo = {
      fullName: dto.fullName,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      dateOfBirth: dto.dateOfBirth,
      phone: dto.phone,
      email: dto.email,
      currentAddress: dto.currentAddress,
      timeAtCurrentAddress: dto.timeAtCurrentAddress,
      maritalStatus: dto.maritalStatus,
      dependents: dto.dependents,
    };

    const employmentInfo = {
      employmentStatus: dto.employmentStatus,
      companyName: dto.companyName,
      industry: dto.industry,
      position: dto.position,
      contractType: dto.contractType,
      timeAtJob: dto.timeAtJob,
      employerPhone: dto.employerPhone,
      employerAddress: dto.employerAddress,
    };

    const incomeInfo = {
      monthlySalary: dto.monthlySalary,
      additionalIncome: dto.additionalIncome,
      additionalIncomeSource: dto.additionalIncomeSource,
      totalMonthlyIncome: dto.totalMonthlyIncome,
      monthlyObligations: dto.monthlyObligations,
      availableForRent: dto.availableForRent,
    };

    const referencesInfo = JSON.parse(JSON.stringify({
      ...(dto.references ?? {}),
      hasCoSigner: dto.hasCoSigner,
      coSigner: dto.coSigner,
    }));

    // Create application as SUBMITTED with all data filled
    const application = await this.prisma.application.create({
      data: {
        propertyId: dto.propertyId,
        tenantId,
        status: ApplicationStatus.SUBMITTED,
        currentStep: 6,
        personalInfo,
        employmentInfo,
        incomeInfo,
        referencesInfo,
        submittedAt: new Date(),
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log creation + submission events
    await this.eventService.logCreated(application.id, tenantId);
    await this.eventService.logSubmitted(application.id, tenantId);
    await this.eventService.logStatusChanged(
      application.id,
      tenantId,
      ApplicationStatus.DRAFT,
      ApplicationStatus.SUBMITTED,
    );

    // Queue scoring job (runs async, doesn't block response)
    await this.scoringService.addScoringJob(application.id, tenantId);

    // Emit notification to landlord
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (property && tenant) {
      this.eventEmitter.emit(
        'application.submitted',
        new ApplicationSubmittedEvent(
          application.id,
          application.propertyId,
          tenantId,
          property.landlordId,
          property.title,
          property.address,
          [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') ||
            tenant.email,
        ),
      );
    }

    // Create chat conversation
    await this.chatService.getOrCreateConversation(application.id);

    return this.flattenApplication(application);
  }

  /**
   * Update a wizard step (1-4).
   * Step 5 (documents) handled separately.
   * Step 6 (review/submit) handled by submit method.
   */
  async updateStep(
    applicationId: string,
    tenantId: string,
    step: number,
    data: StepDto,
  ): Promise<Application> {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);
    this.ensureStatus(application, ApplicationStatus.DRAFT);

    // Validate step number
    if (step < 1 || step > 4) {
      throw new BadRequestException('Step must be between 1 and 4');
    }

    // Map step number to field name
    const fieldMap: Record<number, string> = {
      1: 'personalInfo',
      2: 'employmentInfo',
      3: 'incomeInfo',
      4: 'referencesInfo',
    };

    const field = fieldMap[step];

    // Update the step data
    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        [field]: data,
        // Advance currentStep if completing a new step
        currentStep: Math.max(application.currentStep, step + 1),
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log step completion
    await this.eventService.logStepCompleted(applicationId, tenantId, step);

    return updatedApplication;
  }

  /**
   * Get application by ID.
   */
  async findById(applicationId: string): Promise<Application | null> {
    return this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1, // Only thumbnail
            },
          },
        },
        documents: true,
      },
    });
  }

  /**
   * Get application by ID or throw NotFoundException.
   */
  async findByIdOrThrow(applicationId: string): Promise<Application> {
    const application = await this.findById(applicationId);
    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }
    return application;
  }

  /**
   * Get application with full details including events.
   */
  async findByIdWithDetails(
    applicationId: string,
    userId: string,
  ) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          include: {
            images: {
              orderBy: { order: 'asc' },
            },
            landlord: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        documents: true,
        events: {
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
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }

    // Only tenant or property landlord can view full details
    const isOwner = application.tenantId === userId;
    const isLandlord = application.property.landlordId === userId;

    if (!isOwner && !isLandlord) {
      throw new ForbiddenException(
        'You do not have access to this application',
      );
    }

    return this.flattenApplication(application);
  }

  /**
   * Validate that user owns the application.
   */
  private ensureOwnership(application: Application, tenantId: string): void {
    if (application.tenantId !== tenantId) {
      throw new ForbiddenException('You do not own this application');
    }
  }

  /**
   * Validate application is in expected status.
   */
  private ensureStatus(
    application: Application,
    expectedStatus: ApplicationStatus,
  ): void {
    if (application.status !== expectedStatus) {
      throw new BadRequestException(
        `Application must be in ${expectedStatus} status. Current: ${application.status}`,
      );
    }
  }

  /**
   * Submit a completed application.
   * Validates all wizard steps are complete and at least 1 document uploaded.
   */
  async submit(
    applicationId: string,
    tenantId: string,
    dto: SubmitApplicationDto,
  ): Promise<Application> {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);

    // Validate current state allows submission
    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.SUBMITTED,
    );

    // Validate all wizard steps are complete
    if (!application.personalInfo) {
      throw new BadRequestException('Step 1 (Personal Info) is not complete');
    }
    if (!application.employmentInfo) {
      throw new BadRequestException('Step 2 (Employment Info) is not complete');
    }
    if (!application.incomeInfo) {
      throw new BadRequestException('Step 3 (Income Info) is not complete');
    }
    if (!application.referencesInfo) {
      throw new BadRequestException('Step 4 (References) is not complete');
    }

    // Validate at least one document uploaded
    const documentCount = await this.prisma.applicationDocument.count({
      where: { applicationId },
    });

    if (documentCount === 0) {
      throw new BadRequestException('At least one document must be uploaded');
    }

    // Update status
    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.SUBMITTED,
        currentStep: 6,
        submittedAt: new Date(),
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log events
    await this.eventService.logSubmitted(applicationId, tenantId);
    await this.eventService.logStatusChanged(
      applicationId,
      tenantId,
      ApplicationStatus.DRAFT,
      ApplicationStatus.SUBMITTED,
      dto.message,
    );

    // Queue scoring job
    // Scoring runs async via BullMQ
    // Application will transition to UNDER_REVIEW when scoring completes
    await this.scoringService.addScoringJob(applicationId, tenantId);

    // Emit event for notification to landlord
    const property = await this.prisma.property.findUnique({
      where: { id: application.propertyId },
      include: { landlord: true },
    });

    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
    });

    if (property && tenant) {
      this.eventEmitter.emit(
        'application.submitted',
        new ApplicationSubmittedEvent(
          application.id,
          application.propertyId,
          application.tenantId,
          property.landlordId,
          property.title,
          property.address,
          [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') ||
            tenant.email,
        ),
      );
    }

    // Create chat conversation for communication between tenant and landlord/agent
    await this.chatService.getOrCreateConversation(application.id);

    return updatedApplication;
  }

  /**
   * Withdraw an application.
   * Can be done from most non-terminal states.
   */
  async withdraw(
    applicationId: string,
    tenantId: string,
    dto: WithdrawApplicationDto,
  ): Promise<Application> {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);

    // Validate transition
    const currentStatus = application.status as ApplicationStatus;
    this.stateMachine.validateTransition(
      currentStatus,
      ApplicationStatus.WITHDRAWN,
    );

    // Update status
    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.WITHDRAWN,
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log events
    await this.eventService.logWithdrawn(applicationId, tenantId, dto.reason);
    await this.eventService.logStatusChanged(
      applicationId,
      tenantId,
      currentStatus,
      ApplicationStatus.WITHDRAWN,
      dto.reason,
    );

    // Delete chat conversation
    await this.chatService.deleteConversation(applicationId);

    return updatedApplication;
  }

  /**
   * Get all applications for a tenant.
   */
  async findByTenant(tenantId: string) {
    const applications = await this.prisma.application.findMany({
      where: { tenantId },
      include: {
        property: {
          include: {
            images: {
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            originalName: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return applications.map((app) => this.flattenApplication(app));
  }

  /**
   * Get timeline (events) for an application.
   * Only accessible by tenant owner or property landlord.
   */
  async getTimeline(applicationId: string, userId: string) {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        property: {
          select: { landlordId: true },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(
        `Application with ID ${applicationId} not found`,
      );
    }

    // Only tenant or landlord can view timeline
    const isOwner = application.tenantId === userId;
    const isLandlord = application.property.landlordId === userId;

    if (!isOwner && !isLandlord) {
      throw new ForbiddenException(
        'You do not have access to this application timeline',
      );
    }

    return this.eventService.getTimeline(applicationId);
  }

  /**
   * Get information requests for an application.
   * Returns all INFO_REQUESTED events with the landlord's message.
   * Only accessible by tenant owner.
   */
  async getInfoRequests(applicationId: string, tenantId: string) {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);

    // Get all INFO_REQUESTED events for this application
    const events = await this.prisma.applicationEvent.findMany({
      where: {
        applicationId,
        type: ApplicationEventType.INFO_REQUESTED,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return events.map((event) => ({
      id: event.id,
      message: (event.metadata as { message?: string })?.message || '',
      requestedBy: event.actor
        ? `${event.actor.firstName || ''} ${event.actor.lastName || ''}`.trim() ||
          'Propietario'
        : 'Propietario',
      requestedAt: event.createdAt,
    }));
  }

  /**
   * Reactivate a withdrawn application.
   * Returns the application to DRAFT status so tenant can edit and re-submit.
   * Preserves all existing data, documents, and events.
   */
  async reactivate(
    applicationId: string,
    tenantId: string,
  ): Promise<Application> {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);

    // Validate current state allows reactivation
    this.stateMachine.validateTransition(
      application.status as ApplicationStatus,
      ApplicationStatus.DRAFT,
    );

    // Verify property is still available
    const property = await this.prisma.property.findUnique({
      where: { id: application.propertyId },
    });

    if (!property) {
      throw new NotFoundException('Property no longer exists');
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException(
        'Property is no longer available for applications',
      );
    }

    // Check if tenant has another active application for this property
    const existingActive = await this.prisma.application.findFirst({
      where: {
        propertyId: application.propertyId,
        tenantId,
        id: { not: applicationId }, // Exclude this application
        status: {
          notIn: [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED],
        },
      },
    });

    if (existingActive) {
      throw new ConflictException(
        'You already have another active application for this property',
      );
    }

    // Reactivate - return to DRAFT status
    const updatedApplication = await this.prisma.application.update({
      where: { id: applicationId },
      data: {
        status: ApplicationStatus.DRAFT,
        // Keep currentStep as-is so user continues where they left off
        // Clear submittedAt since it's no longer submitted
        submittedAt: null,
      },
      include: {
        property: true,
        documents: true,
      },
    });

    // Log reactivation event
    await this.eventService.logStatusChanged(
      applicationId,
      tenantId,
      ApplicationStatus.WITHDRAWN,
      ApplicationStatus.DRAFT,
      'Application reactivated by tenant',
    );

    return updatedApplication;
  }

  /**
   * Respond to a landlord's info request.
   * Only valid when application is in NEEDS_INFO status.
   */
  async respondToInfoRequest(
    applicationId: string,
    tenantId: string,
    dto: RespondInfoRequestDto,
  ): Promise<Application> {
    const application = await this.findByIdOrThrow(applicationId);
    this.ensureOwnership(application, tenantId);

    // Must be in NEEDS_INFO status
    if (application.status !== ApplicationStatus.NEEDS_INFO) {
      throw new BadRequestException(
        `Application must be in ${ApplicationStatus.NEEDS_INFO} status to respond. Current: ${application.status}`,
      );
    }

    // Log info provided
    await this.eventService.logInfoProvided(
      applicationId,
      tenantId,
      dto.message,
    );

    // If ready for review, transition back to UNDER_REVIEW
    if (dto.readyForReview !== false) {
      this.stateMachine.validateTransition(
        ApplicationStatus.NEEDS_INFO,
        ApplicationStatus.UNDER_REVIEW,
      );

      const updatedApplication = await this.prisma.application.update({
        where: { id: applicationId },
        data: {
          status: ApplicationStatus.UNDER_REVIEW,
        },
        include: {
          property: true,
          documents: true,
        },
      });

      await this.eventService.logStatusChanged(
        applicationId,
        tenantId,
        ApplicationStatus.NEEDS_INFO,
        ApplicationStatus.UNDER_REVIEW,
        'Tenant provided requested information',
      );

      return updatedApplication;
    }

    return this.findByIdOrThrow(applicationId);
  }
}
