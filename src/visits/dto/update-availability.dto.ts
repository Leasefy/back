import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  Matches,
  IsInt,
  IsIn,
  IsBoolean,
} from 'class-validator';

/**
 * DTO for updating landlord availability.
 * All fields optional - only provided fields are updated.
 */
export class UpdateAvailabilityDto {
  @ApiPropertyOptional({
    example: '10:00',
    description: 'Start time (HH:mm 24h format)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format (24h)',
  })
  startTime?: string;

  @ApiPropertyOptional({
    example: '18:00',
    description: 'End time (HH:mm 24h format)',
  })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format (24h)',
  })
  endTime?: string;

  @ApiPropertyOptional({
    example: 30,
    description: 'Slot duration in minutes (15, 30, 45, or 60)',
    enum: [15, 30, 45, 60],
  })
  @IsOptional()
  @IsInt()
  @IsIn([15, 30, 45, 60], {
    message: 'slotDuration must be 15, 30, 45, or 60 minutes',
  })
  slotDuration?: number;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether this availability is active',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
