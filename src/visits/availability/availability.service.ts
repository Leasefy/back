import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import type { PropertyAvailability } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateAvailabilityDto, UpdateAvailabilityDto } from '../dto/index.js';

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create availability window for a property.
   * Validates landlord ownership and time window logic.
   */
  async create(
    landlordId: string,
    propertyId: string,
    dto: CreateAvailabilityDto,
  ): Promise<PropertyAvailability> {
    // Verify property ownership
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

    // Validate time window
    this.validateTimeWindow(dto.startTime, dto.endTime, dto.slotDuration);

    return this.prisma.propertyAvailability.create({
      data: {
        propertyId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        endTime: dto.endTime,
        slotDuration: dto.slotDuration,
      },
    });
  }

  /**
   * Get all availability windows for a property (active only by default).
   */
  async findByProperty(
    propertyId: string,
    includeInactive = false,
  ): Promise<PropertyAvailability[]> {
    return this.prisma.propertyAvailability.findMany({
      where: {
        propertyId,
        ...(includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Update an availability window.
   * Validates landlord ownership.
   */
  async update(
    landlordId: string,
    propertyId: string,
    availabilityId: string,
    dto: UpdateAvailabilityDto,
  ): Promise<PropertyAvailability> {
    const availability = await this.findAndValidateOwnership(
      landlordId,
      propertyId,
      availabilityId,
    );

    // Validate time window if times are being updated
    const startTime = dto.startTime ?? availability.startTime;
    const endTime = dto.endTime ?? availability.endTime;
    const slotDuration = dto.slotDuration ?? availability.slotDuration;

    if (dto.startTime || dto.endTime || dto.slotDuration) {
      this.validateTimeWindow(startTime, endTime, slotDuration);
    }

    return this.prisma.propertyAvailability.update({
      where: { id: availabilityId },
      data: dto,
    });
  }

  /**
   * Delete an availability window.
   * Validates landlord ownership.
   */
  async delete(
    landlordId: string,
    propertyId: string,
    availabilityId: string,
  ): Promise<void> {
    await this.findAndValidateOwnership(landlordId, propertyId, availabilityId);

    await this.prisma.propertyAvailability.delete({
      where: { id: availabilityId },
    });
  }

  /**
   * Validate ownership and return availability record.
   */
  private async findAndValidateOwnership(
    landlordId: string,
    propertyId: string,
    availabilityId: string,
  ): Promise<PropertyAvailability> {
    const availability = await this.prisma.propertyAvailability.findUnique({
      where: { id: availabilityId },
      include: { property: { select: { landlordId: true } } },
    });

    if (!availability) {
      throw new NotFoundException('Availability not found');
    }

    if (availability.propertyId !== propertyId) {
      throw new NotFoundException('Availability not found for this property');
    }

    if (availability.property.landlordId !== landlordId) {
      throw new ForbiddenException('You do not own this property');
    }

    return availability;
  }

  /**
   * Validate that time window is valid and can fit at least one slot.
   */
  private validateTimeWindow(
    startTime: string,
    endTime: string,
    slotDuration: number,
  ): void {
    const startMinutes = this.parseTime(startTime);
    const endMinutes = this.parseTime(endTime);

    if (startMinutes >= endMinutes) {
      throw new BadRequestException('End time must be after start time');
    }

    const windowDuration = endMinutes - startMinutes;
    if (windowDuration < slotDuration) {
      throw new BadRequestException(
        `Time window (${windowDuration} min) is shorter than slot duration (${slotDuration} min)`,
      );
    }
  }

  /**
   * Parse "HH:mm" to minutes since midnight.
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
