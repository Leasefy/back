import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min, Max, Matches, IsIn } from 'class-validator';

/**
 * DTO for creating landlord availability.
 * Supports 15, 30, 45, or 60 minute slot durations.
 */
export class CreateAvailabilityDto {
  @ApiProperty({
    example: 1,
    description: 'Day of week (0=Sunday, 6=Saturday)',
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    example: '09:00',
    description: 'Start time (HH:mm 24h format)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format (24h)',
  })
  startTime!: string;

  @ApiProperty({ example: '17:00', description: 'End time (HH:mm 24h format)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format (24h)',
  })
  endTime!: string;

  @ApiProperty({
    example: 30,
    description: 'Slot duration in minutes (15, 30, 45, or 60)',
    enum: [15, 30, 45, 60],
  })
  @IsInt()
  @IsIn([15, 30, 45, 60], {
    message: 'slotDuration must be 15, 30, 45, or 60 minutes',
  })
  slotDuration!: number;
}
