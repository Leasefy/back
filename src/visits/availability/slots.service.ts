import { Injectable, BadRequestException } from '@nestjs/common';
import {
  format,
  addDays,
  getDay,
  startOfDay,
  differenceInDays,
} from 'date-fns';
import { PrismaService } from '../../database/prisma.service.js';
import { VisitStatus } from '../../common/enums/index.js';

/**
 * Represents a single time slot for booking.
 */
export interface TimeSlot {
  date: string; // "2026-02-15"
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  isAvailable: boolean;
}

/**
 * Response for available slots grouped by date.
 */
export interface SlotsResponse {
  propertyId: string;
  startDate: string;
  endDate: string;
  slots: TimeSlot[];
}

// Minimum buffer: don't allow booking within 2 hours
const MIN_BOOKING_BUFFER_HOURS = 2;
// Maximum advance booking: 30 days
const MAX_ADVANCE_BOOKING_DAYS = 30;

@Injectable()
export class SlotsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate available time slots for a property within date range.
   * Filters out already booked slots (PENDING or ACCEPTED visits).
   */
  async getAvailableSlots(
    propertyId: string,
    startDateStr: string,
    endDateStr: string,
  ): Promise<SlotsResponse> {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Validate date range
    this.validateDateRange(startDate, endDate);

    // 1. Get availability rules for property
    const availabilities = await this.prisma.propertyAvailability.findMany({
      where: { propertyId, isActive: true },
    });

    if (availabilities.length === 0) {
      return {
        propertyId,
        startDate: startDateStr,
        endDate: endDateStr,
        slots: [],
      };
    }

    // 2. Get existing booked visits in date range
    const bookedVisits = await this.prisma.propertyVisit.findMany({
      where: {
        propertyId,
        visitDate: { gte: startDate, lte: endDate },
        status: { in: [VisitStatus.PENDING, VisitStatus.ACCEPTED] },
      },
      select: { visitDate: true, startTime: true },
    });

    // 3. Build set of booked slots for O(1) lookup
    const bookedSlots = new Set(
      bookedVisits.map(
        (v) => `${format(v.visitDate, 'yyyy-MM-dd')}_${v.startTime}`,
      ),
    );

    // 4. Generate slots
    const slots: TimeSlot[] = [];
    const now = new Date();
    const minBookingTime = new Date(
      now.getTime() + MIN_BOOKING_BUFFER_HOURS * 60 * 60 * 1000,
    );

    let currentDate = startOfDay(startDate);
    const endDateStart = startOfDay(endDate);

    while (currentDate <= endDateStart) {
      const dayOfWeek = getDay(currentDate); // 0-6
      const dateStr = format(currentDate, 'yyyy-MM-dd');

      // Find availability rules for this day
      const dayAvailabilities = availabilities.filter(
        (a) => a.dayOfWeek === dayOfWeek,
      );

      for (const availability of dayAvailabilities) {
        // Generate slots within this availability window
        let slotStartMinutes = this.parseTime(availability.startTime);
        const windowEndMinutes = this.parseTime(availability.endTime);

        while (
          slotStartMinutes + availability.slotDuration <=
          windowEndMinutes
        ) {
          const slotStartStr = this.formatMinutes(slotStartMinutes);
          const slotEndStr = this.formatMinutes(
            slotStartMinutes + availability.slotDuration,
          );
          const slotKey = `${dateStr}_${slotStartStr}`;

          // Check if slot is in the past or too soon
          const slotDateTime = new Date(`${dateStr}T${slotStartStr}:00`);
          const isInPast = slotDateTime <= minBookingTime;

          // Check if slot is already booked
          const isBooked = bookedSlots.has(slotKey);

          slots.push({
            date: dateStr,
            startTime: slotStartStr,
            endTime: slotEndStr,
            isAvailable: !isBooked && !isInPast,
          });

          slotStartMinutes += availability.slotDuration;
        }
      }

      currentDate = addDays(currentDate, 1);
    }

    return {
      propertyId,
      startDate: startDateStr,
      endDate: endDateStr,
      slots,
    };
  }

  /**
   * Verify a specific slot is available and valid.
   * Returns the availability config if valid.
   */
  async verifySlotAvailable(
    propertyId: string,
    dateStr: string,
    startTime: string,
  ): Promise<{ slotDuration: number }> {
    const visitDate = new Date(dateStr);
    const dayOfWeek = getDay(visitDate);

    // Check availability config exists
    const availability = await this.prisma.propertyAvailability.findFirst({
      where: {
        propertyId,
        dayOfWeek,
        isActive: true,
      },
    });

    if (!availability) {
      throw new BadRequestException('Property is not available on this day');
    }

    // Verify time is within availability window
    const slotMinutes = this.parseTime(startTime);
    const windowStart = this.parseTime(availability.startTime);
    const windowEnd = this.parseTime(availability.endTime);

    if (
      slotMinutes < windowStart ||
      slotMinutes + availability.slotDuration > windowEnd
    ) {
      throw new BadRequestException(
        'Selected time is outside availability window',
      );
    }

    // Verify slot aligns with duration increments
    const offsetFromStart = slotMinutes - windowStart;
    if (offsetFromStart % availability.slotDuration !== 0) {
      throw new BadRequestException(
        'Selected time does not align with slot boundaries',
      );
    }

    // Check not already booked
    const existingVisit = await this.prisma.propertyVisit.findFirst({
      where: {
        propertyId,
        visitDate,
        startTime,
        status: { in: [VisitStatus.PENDING, VisitStatus.ACCEPTED] },
      },
    });

    if (existingVisit) {
      throw new BadRequestException('This time slot is no longer available');
    }

    // Check not in past
    const now = new Date();
    const minBookingTime = new Date(
      now.getTime() + MIN_BOOKING_BUFFER_HOURS * 60 * 60 * 1000,
    );
    const slotDateTime = new Date(`${dateStr}T${startTime}:00`);

    if (slotDateTime <= minBookingTime) {
      throw new BadRequestException(
        'Cannot book a slot in the past or within 2 hours',
      );
    }

    return { slotDuration: availability.slotDuration };
  }

  /**
   * Validate date range is reasonable.
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    if (startDate > endDate) {
      throw new BadRequestException('Start date must be before end date');
    }

    const daysDiff = differenceInDays(endDate, startDate);
    if (daysDiff > MAX_ADVANCE_BOOKING_DAYS) {
      throw new BadRequestException(
        `Date range cannot exceed ${MAX_ADVANCE_BOOKING_DAYS} days`,
      );
    }

    // Start date must be today or later
    const today = startOfDay(new Date());
    if (startDate < today) {
      throw new BadRequestException('Start date cannot be in the past');
    }
  }

  /**
   * Parse "HH:mm" to minutes since midnight.
   */
  private parseTime(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  /**
   * Format minutes since midnight to "HH:mm".
   */
  private formatMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
}
