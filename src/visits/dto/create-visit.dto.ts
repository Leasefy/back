import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsDateString, IsString, Matches, IsOptional, MaxLength } from 'class-validator';

/**
 * DTO for creating a property visit request.
 */
export class CreateVisitDto {
  @ApiProperty({ description: 'Property ID to visit' })
  @IsUUID()
  propertyId!: string;

  @ApiProperty({ example: '2026-02-15', description: 'Visit date (YYYY-MM-DD)' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '10:00', description: 'Start time (HH:mm 24h format)' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format (24h)',
  })
  startTime!: string;

  @ApiPropertyOptional({
    example: 'Tengo mascotas, me gustaria saber si las permiten',
    description: 'Optional notes for landlord',
    maxLength: 500,
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  notes?: string;
}
