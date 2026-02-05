import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

/**
 * Query DTO for getting available time slots.
 * Date range is required - max 30 days recommended.
 */
export class GetSlotsQueryDto {
  @ApiProperty({
    example: '2026-02-15',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({ example: '2026-02-28', description: 'End date (YYYY-MM-DD)' })
  @IsDateString()
  endDate!: string;
}
