import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsString, Matches, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for rescheduling a visit to a new date/time.
 * Original visit will be marked RESCHEDULED and a new PENDING visit created.
 */
export class RescheduleVisitDto {
  @ApiProperty({ example: '2026-02-20', description: 'New visit date (YYYY-MM-DD)' })
  @IsDateString()
  newDate!: string;

  @ApiProperty({ example: '14:00', description: 'New start time (HH:mm 24h format)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'newStartTime must be in HH:mm format (24h)',
  })
  newStartTime!: string;

  @ApiPropertyOptional({
    example: 'Cambio por conflicto de agenda',
    description: 'Reason for rescheduling',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}
