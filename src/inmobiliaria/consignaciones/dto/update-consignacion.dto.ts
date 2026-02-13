import { PartialType } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateConsignacionDto } from './create-consignacion.dto.js';

export class UpdateConsignacionDto extends PartialType(CreateConsignacionDto) {
  @ApiPropertyOptional({ description: 'Consignacion status (ACTIVE, TERMINATED, EXPIRED, PENDING)' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ description: 'Availability (AVAILABLE, RENTED, IN_PROCESS, MAINTENANCE)' })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiPropertyOptional({ description: 'Current lease ID if property is rented' })
  @IsOptional()
  @IsUUID()
  currentLeaseId?: string;

  @ApiPropertyOptional({ description: 'Name of the current tenant' })
  @IsOptional()
  @IsString()
  currentTenantName?: string;

  @ApiPropertyOptional({ description: 'Current lease end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  leaseEndDate?: string;

  @ApiPropertyOptional({ description: 'URL to the consignment contract document' })
  @IsOptional()
  @IsString()
  consignmentContractUrl?: string;
}
