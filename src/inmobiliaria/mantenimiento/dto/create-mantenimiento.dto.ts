import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MantenimientoType } from '../../../common/enums/mantenimiento-type.enum.js';
import { MantenimientoPriority } from '../../../common/enums/mantenimiento-priority.enum.js';
import { MantenimientoPaidBy } from '../../../common/enums/mantenimiento-paid-by.enum.js';

export class CreateMantenimientoDto {
  @ApiProperty({ description: 'Consignacion ID' })
  @IsUUID()
  consignacionId!: string;

  @ApiPropertyOptional({ description: 'Assigned agent user ID' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;

  @ApiProperty({ description: 'Type of maintenance', enum: MantenimientoType })
  @IsEnum(MantenimientoType)
  type!: MantenimientoType;

  @ApiPropertyOptional({
    description: 'Priority level',
    enum: MantenimientoPriority,
    default: MantenimientoPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(MantenimientoPriority)
  priority?: MantenimientoPriority;

  @ApiProperty({ description: 'Title of the maintenance request', maxLength: 200 })
  @IsString()
  @MaxLength(200)
  title!: string;

  @ApiProperty({ description: 'Detailed description of the issue' })
  @IsString()
  description!: string;

  @ApiPropertyOptional({ description: 'Photo URLs of the issue', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @ApiPropertyOptional({
    description: 'Who pays for the maintenance',
    enum: MantenimientoPaidBy,
    default: MantenimientoPaidBy.OWNER,
  })
  @IsOptional()
  @IsEnum(MantenimientoPaidBy)
  paidBy?: MantenimientoPaidBy;
}
