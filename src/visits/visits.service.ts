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
import { VisitStatus } from '../common/enums/index.js';
import { CreateVisitDto } from './dto/index.js';
import { VisitRequestedEvent, VisitStatusChangedEvent } from './events/index.js';

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
  ) {}

  /**
   * Create a visit request.
   * Uses transaction to prevent double-booking race conditions.
   * VISIT-04: Tenant can request a visit
   * VISIT-05: System prevents double-booking
   */
  async create(tenantId: string, dto: CreateVisitDto): Promise<VisitWithDetails> {
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
      throw new ForbiddenException('Cannot request a visit on your own property');
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
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
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
                select: { id: true, firstName: true, lastName: true, email: true },
              },
            },
          },
          tenant: {
            select: { id: true, firstName: true, lastName: true, email: true, phone: true },
          },
        },
      });
    });

    // Emit event for notifications (Phase 13)
    const tenantName = [tenant.firstName, tenant.lastName].filter(Boolean).join(' ') || tenant.email;

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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: [{ visitDate: 'asc' }, { startTime: 'asc' }],
    });

    return visits as VisitWithDetails[];
  }

  /**
   * Get a single visit by ID.
   * Validates the requesting user is the tenant or landlord.
   */
  async findById(visitId: string, userId: string): Promise<VisitWithDetails> {
    const visit = await this.prisma.propertyVisit.findUnique({
      where: { id: visitId },
      include: {
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
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
    });

    if (!visit) {
      throw new NotFoundException('Visit not found');
    }

    // Only tenant or landlord can view
    if (visit.tenantId !== userId && visit.property.landlordId !== userId) {
      throw new ForbiddenException('You do not have access to this visit');
    }

    return visit as VisitWithDetails;
  }

  /**
   * Get visits for a specific property.
   * Validates the requesting user is the landlord.
   */
  async findByProperty(propertyId: string, landlordId: string): Promise<VisitWithDetails[]> {
    // Verify ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { landlordId: true },
    });

    if (!property) {
      throw new NotFoundException('Property not found');
    }

    if (property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

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
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
        tenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: [{ visitDate: 'asc' }, { startTime: 'asc' }],
    });

    return visits as VisitWithDetails[];
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
