import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import type { Application } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { ApplicationStatus } from '../common/enums/index.js';
import { ApplicationStateMachine } from './state-machine/application-state-machine.js';
import { ApplicationEventService } from './events/application-event.service.js';
import {
  CreateApplicationDto,
  PersonalInfoDto,
  EmploymentInfoDto,
  IncomeInfoDto,
  ReferencesDto,
} from './dto/index.js';

type StepDto = PersonalInfoDto | EmploymentInfoDto | IncomeInfoDto | ReferencesDto;

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
  ) {}

  /**
   * Create a new application for a property.
   */
  async create(tenantId: string, dto: CreateApplicationDto): Promise<Application> {
    // Verify property exists and is available
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${dto.propertyId} not found`);
    }

    if (property.status !== 'AVAILABLE') {
      throw new BadRequestException('Property is not available for applications');
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
      throw new ConflictException('You already have an active application for this property');
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
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }
    return application;
  }

  /**
   * Get application with full details including events.
   */
  async findByIdWithDetails(applicationId: string, userId: string): Promise<Application> {
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
      throw new NotFoundException(`Application with ID ${applicationId} not found`);
    }

    // Only tenant or property landlord can view full details
    const isOwner = application.tenantId === userId;
    const isLandlord = application.property.landlordId === userId;

    if (!isOwner && !isLandlord) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
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
  private ensureStatus(application: Application, expectedStatus: ApplicationStatus): void {
    if (application.status !== expectedStatus) {
      throw new BadRequestException(
        `Application must be in ${expectedStatus} status. Current: ${application.status}`,
      );
    }
  }
}
