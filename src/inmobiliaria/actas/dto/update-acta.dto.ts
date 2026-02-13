import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsArray,
} from 'class-validator';
import { ActaType } from '../../../common/enums/acta-type.enum.js';
import { ItemCondition } from '../../../common/enums/item-condition.enum.js';

/**
 * DTO for updating an acta.
 * Includes all CreateActaDto fields as optional plus JSON detail fields.
 */
export class UpdateActaDto {
  @ApiPropertyOptional({ enum: ActaType, description: 'Type of acta' })
  @IsOptional()
  @IsEnum(ActaType)
  type?: ActaType;

  @ApiPropertyOptional({ description: 'Consignacion ID' })
  @IsOptional()
  @IsUUID()
  consignacionId?: string;

  @ApiPropertyOptional({ description: 'Lease ID' })
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @ApiPropertyOptional({ description: 'Propietario ID' })
  @IsOptional()
  @IsUUID()
  propietarioId?: string;

  @ApiPropertyOptional({ description: 'Agent user ID' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;

  @ApiPropertyOptional({ description: 'Property title' })
  @IsOptional()
  @IsString()
  propertyTitle?: string;

  @ApiPropertyOptional({ description: 'Property address' })
  @IsOptional()
  @IsString()
  propertyAddress?: string;

  @ApiPropertyOptional({ description: 'Tenant name' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({ enum: ItemCondition, description: 'General condition' })
  @IsOptional()
  @IsEnum(ItemCondition)
  generalCondition?: ItemCondition;

  @ApiPropertyOptional({ description: 'General observations' })
  @IsOptional()
  @IsString()
  generalObservations?: string;

  @ApiPropertyOptional({ example: 2000000, description: 'Deposit amount in COP' })
  @IsOptional()
  @IsInt()
  depositAmount?: number;

  // JSON detail fields
  @ApiPropertyOptional({ type: [Object], description: 'Rooms inventory (JSON array)' })
  @IsOptional()
  @IsArray()
  rooms?: any[];

  @ApiPropertyOptional({ type: [Object], description: 'Items inventory (JSON array)' })
  @IsOptional()
  @IsArray()
  items?: any[];

  @ApiPropertyOptional({ type: [Object], description: 'Meter readings (JSON array)' })
  @IsOptional()
  @IsArray()
  meterReadings?: any[];

  @ApiPropertyOptional({ type: [Object], description: 'Keys delivered (JSON array)' })
  @IsOptional()
  @IsArray()
  keysDelivered?: any[];

  @ApiPropertyOptional({ type: [Object], description: 'Deductions (JSON array)' })
  @IsOptional()
  @IsArray()
  deductions?: any[];

  @ApiPropertyOptional({ example: 1800000, description: 'Deposit to return in COP' })
  @IsOptional()
  @IsInt()
  depositToReturn?: number;

  @ApiPropertyOptional({ type: [String], description: 'Photo URLs' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];
}
