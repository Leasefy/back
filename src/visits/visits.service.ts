import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PropertyVisit } from '@prisma/client';
import { PrismaService } from '../database/prisma.service.js';
import { SlotsService } from './availability/slots.service.js';
import { VisitStateMachine } from './state-machine/visit-state-machine.js';
import { VisitStatus } from '../common/enums/index.js';
import { CreateVisitDto, RescheduleVisitDto } from './dto/index.js';
import {
  VisitRequestedEvent,
  VisitStatusChangedEvent,
} from './events/index.js';
import { PropertyAccessService } from '../property-access/property-access.service.js';

/**
 * Visit with included property and tenant details.
 */
export interface VisitWithDetails extends PropertyVisit {
  property: {
    id: string;
    title: string;
    address: string;
    city: string;
    landlordId: string;
    landlord: {
      id: string;
      firstName: string | null;
      lastName: string | null;
      email: string;
    };
  };
  tenant: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    phone: string | null;
  };
}

@Injectable()
export class VisitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly slotsService: SlotsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly stateMachine: VisitStateMachine,
    private readonly propertyAccessService: PropertyAccessService,
  ) {}

  /**
   * Create a visit request.
   * Uses transaction to prevent double-booking race conditions.
   * VISIT-04: Tenant can request a visit
   * VISIT-05: System prevents double-booking
   */
  async create(
    tenantId: string,
    dto: CreateVisitDto,
  ): Promise<VisitWithDetails> {
    // Verify slot is available (throws if not)
    const { slotDuration } = await this.slotsService.verifySlotAvailable(
      dto.propertyId,
      dto.date,
      dto.startTime,
    );

    // Get property details for event
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
      include: {
        landlord: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    // Prevent tenant from requesting visit on their own property
    if (property.landlordId === tenantId) {
      throw new ForbiddenException(
        'Cannot request a visit on your own property',
      );
    }

    // Check tenant doesn't already have an active visit for this property
    const existingVisit = await this.prisma.propertyVisit.findFirst({
      where: {
        propertyId: dto.propertyId,
        tenantId,
        status: { in: [VisitStatus.PENDING, VisitStatus.ACCEPTED] },
      },
    });

    if (existingVisit) {
      throw new ConflictException(
        'You already have an active visit request for this property',
      );
    }

    // Get tenant details for event
    const tenant = await this.prisma.user.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Calculate end time
    const endTime = this.addMinutesToTime(dto.startTime, slotDuration);

    // Create visit with transaction to prevent race conditions
    const visit = await this.prisma.$transaction(async (tx) => {
      // Double-check slot is still available inside transaction
      const conflictingVisit = await tx.propertyVisit.findFirst({
        where: {
          propertyId: dto.propertyId,
          visitDate: new Date(dto.date),
          startTime: dto.startTime,
          status: { in: [VisitStatus.PENDING, VisitStatus.ACCEPTED] },
        },
      });

      if (conflictingVisit) {
        throw new ConflictException('This time slot is no longer available');
      }

      return tx.propertyVisit.create({
        data: {
          propertyId: dto.propertyId,
          tenantId,
          visitDate: new Date(dto.date),
          startTime: dto.startTime,
          endTime,
          tenantNotes: dto.notes,
          status: VisitStatus.PENDING,
        },
        include: {
          property: {
            select: {
              id: true,
              title: true,
              address: true,
              city: true,
              landlordId: true,
              landlord: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
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
        },
      });
    });

    // Emit event for notifications (Phase 13)
    const tenantName =
      [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') ||
      tenant.email;

    this.eventEmitter.emit(
      'visit.requested',
      new VisitRequestedEvent(
        visit.id,
        visit.propertyId,
        visit.tenantId,
        property.landlordId,
        visit.visitDate,
        visit.startTime,
        visit.endTime,
        tenantName,
        property.title,
        `${property.address}, ${property.city}`,
        dto.notes,
      ),
    );

    return visit as VisitWithDetails;
  }

  /**
   * Get visits for a tenant.
   * VISIT-11: Tenant can view their scheduled visits
   */
  async findByTenant(tenantId: string): Promise<VisitWithDetails[]> {
    const visits = await this.prisma.propertyVisit.findMany({
      where: { tenantId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            landlordId: true,
            landlord: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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
      },
      orderBy: [{ visitDate: 'asc' }, { startTime: 'asc' }],
    });

    return visits as VisitWithDetails[];
  }

  /**
   * Get visits for a landlord's properties.
   * VISIT-12: Landlord can view all visits for their properties
   */
  async findByLandlord(landlordId: string): Promise<VisitWithDetails[]> {
    const visits = await this.prisma.propertyVisit.findMany({
      where: {
        property: { landlordId },
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            landlordId: true,
            landlord: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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
      },
      orderBy: [{ visitDate: 'asc' }, { startTime: 'asc' }],
    });

    return visits as VisitWithDetails[];
  }

  /**
   * Get a single visit by ID.
   * Validates the requesting user is the tenant, landlord, or assigned agent.
   */
  async findById(visitId: string, userId: string): Promise<VisitWithDetails> {
    const visit = await this.findByIdWithValidation(visitId);

    // Tenant can always view their own visits
    if (visit.tenantId === userId) {
      return visit;
    }

    // Check if user has property access (landlord or agent)
    const canAccess = await this.propertyAccessService.canAccessProperty(
      userId,
      visit.propertyId,
    );
    if (!canAccess) {
      throw new ForbiddenException('You do not have access to this visit');
    }

    return visit;
  }

  /**
   * Get visits for a specific property.
   * Validates the requesting user is the landlord or assigned agent.
   */
  async findByProperty(
    propertyId: string,
    userId: string,
  ): Promise<VisitWithDetails[]> {
    // Verify access (landlord or agent)
    await this.propertyAccessService.ensurePropertyAccess(userId, propertyId);

    const visits = await this.prisma.propertyVisit.findMany({
      where: { propertyId },
      include: {
        property: {
          select: {
            id: true,
            title: true,
            address: true,
            city: true,
            landlordId: true,
            landlord: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
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
      },
      orderBy: [{ visitDate: 'asc' }, { startTime: 'asc' }],
    });

    return visits as VisitWithDetails[];
  }

  /**
   * Accept a visit request.
   * VISIT-06: Landlord or agent can accept visit request
   */
  async accept(userId: string, visitId: string): Promise<VisitWithDetails> {
    const visit = await this.findByIdWithValidation(visitId);

    // Verify access to property (landlord or agent)
    await this.propertyAccessService.ensurePropertyAccess(
      userId,
      visit.propertyId,
    );

    // Validate transition
    this.stateMachine.validateTransition(
      visit.status as VisitStatus,
      VisitStatus.ACCEPTED,
      'LANDLORD',
    );

    const updatedVisit = await this.prisma.propertyVisit.update({
      where: { id: visitId },
      data: { status: VisitStatus.ACCEPTED },
      include: this.getVisitIncludes(),
    });

    // Emit status change event
    this.emitStatusChangedEvent(
      updatedVisit as VisitWithDetails,
      visit.status as VisitStatus,
      VisitStatus.ACCEPTED,
      'LANDLORD',
      userId,
    );

    return updatedVisit as VisitWithDetails;
  }

  /**
   * Reject a visit request.
   * VISIT-07: Landlord or agent can reject visit request with reason
   */
  async reject(
    userId: string,
    visitId: string,
    reason: string,
  ): Promise<VisitWithDetails> {
    const visit = await this.findByIdWithValidation(visitId);

    // Verify access to property (landlord or agent)
    await this.propertyAccessService.ensurePropertyAccess(
      userId,
      visit.propertyId,
    );

    // Validate transition
    this.stateMachine.validateTransition(
      visit.status as VisitStatus,
      VisitStatus.REJECTED,
      'LANDLORD',
    );

    const updatedVisit = await this.prisma.propertyVisit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.REJECTED,
        rejectionReason: reason,
      },
      include: this.getVisitIncludes(),
    });

    // Emit status change event
    this.emitStatusChangedEvent(
      updatedVisit as VisitWithDetails,
      visit.status as VisitStatus,
      VisitStatus.REJECTED,
      'LANDLORD',
      userId,
      reason,
    );

    return updatedVisit as VisitWithDetails;
  }

  /**
   * Cancel a visit.
   * VISIT-09: Either party can cancel a visit with reason
   */
  async cancel(
    userId: string,
    visitId: string,
    reason: string,
  ): Promise<VisitWithDetails> {
    const visit = await this.findByIdWithValidation(visitId);

    // Determine role
    let role: 'TENANT' | 'LANDLORD';
    if (visit.tenantId === userId) {
      role = 'TENANT';
    } else {
      // Check if user has property access (landlord or agent)
      const canAccess = await this.propertyAccessService.canAccessProperty(
        userId,
        visit.propertyId,
      );
      if (canAccess) {
        role = 'LANDLORD';
      } else {
        throw new ForbiddenException('You do not have access to this visit');
      }
    }

    // Validate transition
    this.stateMachine.validateTransition(
      visit.status as VisitStatus,
      VisitStatus.CANCELLED,
      role,
    );

    const updatedVisit = await this.prisma.propertyVisit.update({
      where: { id: visitId },
      data: {
        status: VisitStatus.CANCELLED,
        cancellationReason: reason,
        cancelledBy: userId,
      },
      include: this.getVisitIncludes(),
    });

    // Emit status change event
    this.emitStatusChangedEvent(
      updatedVisit as VisitWithDetails,
      visit.status as VisitStatus,
      VisitStatus.CANCELLED,
      role,
      userId,
      reason,
    );

    return updatedVisit as VisitWithDetails;
  }

  /**
   * Reschedule a visit to a new date/time.
   * VISIT-08: Tenant or landlord/agent can reschedule a visit
   * Creates a new PENDING visit and marks original as RESCHEDULED.
   */
  async reschedule(
    userId: string,
    visitId: string,
    dto: RescheduleVisitDto,
  ): Promise<VisitWithDetails> {
    const originalVisit = await this.findByIdWithValidation(visitId);

    // Determine role
    let role: 'TENANT' | 'LANDLORD';
    if (originalVisit.tenantId === userId) {
      role = 'TENANT';
    } else {
      // Check if user has property access (landlord or agent)
      const canAccess = await this.propertyAccessService.canAccessProperty(
        userId,
        originalVisit.propertyId,
      );
      if (canAccess) {
        role = 'LANDLORD';
      } else {
        throw new ForbiddenException('You do not have access to this visit');
      }
    }

    // Validate transition
    this.stateMachine.validateTransition(
      originalVisit.status as VisitStatus,
      VisitStatus.RESCHEDULED,
      role,
    );

    // Verify new slot is available
    const { slotDuration } = await this.slotsService.verifySlotAvailable(
      originalVisit.propertyId,
      dto.newDate,
      dto.newStartTime,
    );

    const newEndTime = this.addMinutesToTime(dto.newStartTime, slotDuration);

    // Use transaction to update original and create new visit
    const newVisit = await this.prisma.$transaction(async (tx) => {
      // Mark original as rescheduled
      await tx.propertyVisit.update({
        where: { id: visitId },
        data: { status: VisitStatus.RESCHEDULED },
      });

      // Create new visit
      const created = await tx.propertyVisit.create({
        data: {
          propertyId: originalVisit.propertyId,
          tenantId: originalVisit.tenantId,
          visitDate: new Date(dto.newDate),
          startTime: dto.newStartTime,
          endTime: newEndTime,
          tenantNotes: originalVisit.tenantNotes,
          status: VisitStatus.PENDING,
          rescheduledFromId: visitId,
        },
        include: this.getVisitIncludes(),
      });

      // Link original to new
      await tx.propertyVisit.update({
        where: { id: visitId },
        data: { rescheduledToId: created.id },
      });

      return created;
    });

    // Emit status change event for original visit
    this.emitStatusChangedEvent(
      originalVisit,
      originalVisit.status as VisitStatus,
      VisitStatus.RESCHEDULED,
      role,
      userId,
      dto.reason,
    );

    // Emit new visit requested event
    const tenantName =
      [originalVisit.tenant.firstName, originalVisit.tenant.lastName]
        .filter(Boolean)
        .join(' ') || originalVisit.tenant.email;

    this.eventEmitter.emit(
      'visit.requested',
      new VisitRequestedEvent(
        newVisit.id,
        newVisit.propertyId,
        newVisit.tenantId,
        originalVisit.property.landlordId,
        newVisit.visitDate,
        newVisit.startTime,
        newVisit.endTime,
        tenantName,
        originalVisit.property.title,
        `${originalVisit.property.address}, ${originalVisit.property.city}`,
        `Reprogramada desde visita anterior (${originalVisit.visitDate.toISOString().split('T')[0]} ${originalVisit.startTime})`,
      ),
    );

    return newVisit as VisitWithDetails;
  }

  /**
   * Mark a visit as completed.
   * Only landlord or agent can mark completion after the visit date.
   */
  async complete(userId: string, visitId: string): Promise<VisitWithDetails> {
    const visit = await this.findByIdWithValidation(visitId);

    // Verify access to property (landlord or agent)
    await this.propertyAccessService.ensurePropertyAccess(
      userId,
      visit.propertyId,
    );

    // Validate transition
    this.stateMachine.validateTransition(
      visit.status as VisitStatus,
      VisitStatus.COMPLETED,
      'LANDLORD',
    );

    const updatedVisit = await this.prisma.propertyVisit.update({
      where: { id: visitId },
      data: { status: VisitStatus.COMPLETED },
      include: this.getVisitIncludes(),
    });

    // Emit status change event
    this.emitStatusChangedEvent(
      updatedVisit as VisitWithDetails,
      visit.status as VisitStatus,
      VisitStatus.COMPLETED,
      'LANDLORD',
      userId,
    );

    return updatedVisit as VisitWithDetails;
  }

  /**
   * Get visit by ID with validation.
   */
  private async findByIdWithValidation(
    visitId: string,
  ): Promise<VisitWithDetails> {
    const visit = await this.prisma.propertyVisit.findUnique({
      where: { id: visitId },
      include: this.getVisitIncludes(),
    });

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    return visit as VisitWithDetails;
  }

  /**
   * Standard includes for visit queries.
   */
  private getVisitIncludes() {
    return {
      property: {
        select: {
          id: true,
          title: true,
          address: true,
          city: true,
          landlordId: true,
          landlord: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
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
    };
  }

  /**
   * Emit visit status changed event.
   */
  private emitStatusChangedEvent(
    visit: VisitWithDetails,
    oldStatus: VisitStatus,
    newStatus: VisitStatus,
    changedBy: 'TENANT' | 'LANDLORD',
    changedByUserId: string,
    reason?: string,
  ): void {
    this.eventEmitter.emit(
      'visit.statusChanged',
      new VisitStatusChangedEvent(
        visit.id,
        visit.propertyId,
        visit.tenantId,
        visit.property.landlordId,
        oldStatus,
        newStatus,
        changedBy,
        changedByUserId,
        visit.visitDate,
        visit.startTime,
        visit.property.title,
        reason,
      ),
    );
  }

  /**
   * Add minutes to a time string.
   * @param time "HH:mm" format
   * @param minutes Minutes to add
   * @returns New time in "HH:mm" format
   */
  private addMinutesToTime(time: string, minutes: number): string {
    const [hours, mins] = time.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60);
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
  }
}
