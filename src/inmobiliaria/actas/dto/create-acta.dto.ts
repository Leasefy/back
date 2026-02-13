import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
} from 'class-validator';
import { ActaType } from '../../../common/enums/acta-type.enum.js';
import { ItemCondition } from '../../../common/enums/item-condition.enum.js';

export class CreateActaDto {
  @ApiProperty({ enum: ActaType, example: ActaType.ENTREGA, description: 'Type of acta (delivery or return)' })
  @IsEnum(ActaType)
  type!: ActaType;

  @ApiProperty({ description: 'Propietario ID' })
  @IsUUID()
  propietarioId!: string;

  @ApiPropertyOptional({ description: 'Consignacion ID to associate the acta with' })
  @IsOptional()
  @IsUUID()
  consignacionId?: string;

  @ApiPropertyOptional({ description: 'Lease ID to associate the acta with' })
  @IsOptional()
  @IsUUID()
  leaseId?: string;

  @ApiPropertyOptional({ description: 'Agent user ID responsible for the acta' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;

  @ApiProperty({ example: 'Apto 301 Torre B', description: 'Property title' })
  @IsString()
  propertyTitle!: string;

  @ApiProperty({ example: 'Cra 7 #45-23, Bogota', description: 'Property address' })
  @IsString()
  propertyAddress!: string;

  @ApiPropertyOptional({ example: 'Maria Lopez', description: 'Tenant name' })
  @IsOptional()
  @IsString()
  tenantName?: string;

  @ApiPropertyOptional({ enum: ItemCondition, example: ItemCondition.GOOD, description: 'General condition of the property' })
  @IsOptional()
  @IsEnum(ItemCondition)
  generalCondition?: ItemCondition;

  @ApiPropertyOptional({ description: 'General observations about the property' })
  @IsOptional()
  @IsString()
  generalObservations?: string;

  @ApiPropertyOptional({ example: 2000000, description: 'Deposit amount in COP' })
  @IsOptional()
  @IsInt()
  depositAmount?: number;
}
