import { PartialType, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { CreateAgencyDto } from './create-agency.dto.js';

/**
 * DTO for updating agency configuration.
 * All fields from CreateAgencyDto are optional (via PartialType).
 * Additional agency config fields included.
 */
export class UpdateAgencyDto extends PartialType(CreateAgencyDto) {
  @ApiPropertyOptional({ example: 2, description: 'Default late fee percentage' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  defaultLateFeePercent?: number;

  @ApiPropertyOptional({ example: 5, description: 'Payment due day of month (1-28)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  paymentDueDay?: number;

  @ApiPropertyOptional({ example: 15, description: 'Disbursement day of month (1-28)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(28)
  disbursementDay?: number;

  @ApiPropertyOptional({ example: 3, description: 'Reminder days before due date' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  reminderDaysBefore?: number;

  @ApiPropertyOptional({ example: 3, description: 'Reminder days after due date' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  reminderDaysAfter?: number;

  @ApiPropertyOptional({ example: 'Juan Perez', description: 'Legal representative name' })
  @IsOptional()
  @IsString()
  legalRepresentative?: string;

  @ApiPropertyOptional({ example: '1234567890', description: 'Legal representative document number' })
  @IsOptional()
  @IsString()
  legalDocumentNumber?: string;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', description: 'Agency logo URL' })
  @IsOptional()
  @IsString()
  logoUrl?: string;
}
