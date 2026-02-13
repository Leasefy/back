import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class LogActionDto {
  @ApiProperty({ description: 'Action performed (e.g. "llamada", "email", "visita")' })
  @IsString()
  action!: string;

  @ApiPropertyOptional({ description: 'Additional notes about the action' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Date for the next follow-up action (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  nextActionDate?: string;
}
