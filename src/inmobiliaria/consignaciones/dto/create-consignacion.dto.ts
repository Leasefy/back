import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  IsDateString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsignacionPropertyType } from '../../../common/enums/consignacion-property-type.enum.js';

export class CreateConsignacionDto {
  @ApiProperty({ description: 'ID of the propietario who owns this property' })
  @IsUUID()
  propietarioId!: string;

  @ApiPropertyOptional({ description: 'Optional linked property ID from properties table' })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'User ID of the assigned agent' })
  @IsOptional()
  @IsUUID()
  agenteUserId?: string;

  @ApiProperty({ description: 'Title/name of the property' })
  @IsString()
  @IsNotEmpty()
  propertyTitle!: string;

  @ApiProperty({ description: 'Physical address of the property' })
  @IsString()
  @IsNotEmpty()
  propertyAddress!: string;

  @ApiProperty({ description: 'City where the property is located' })
  @IsString()
  @IsNotEmpty()
  propertyCity!: string;

  @ApiPropertyOptional({ description: 'Zone/neighborhood within the city' })
  @IsOptional()
  @IsString()
  propertyZone?: string;

  @ApiPropertyOptional({ enum: ConsignacionPropertyType, description: 'Type of property' })
  @IsOptional()
  @IsEnum(ConsignacionPropertyType)
  propertyType?: ConsignacionPropertyType;

  @ApiPropertyOptional({ description: 'Thumbnail image URL' })
  @IsOptional()
  @IsString()
  propertyThumbnail?: string;

  @ApiProperty({ description: 'Monthly rent amount in COP', minimum: 0 })
  @IsInt()
  @Min(0)
  monthlyRent!: number;

  @ApiPropertyOptional({ description: 'Monthly admin fee in COP', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  adminFee?: number;

  @ApiProperty({ description: 'Commission percentage for the agency', minimum: 0 })
  @IsNumber()
  @Min(0)
  commissionPercent!: number;

  @ApiProperty({ description: 'Consignment contract start date (YYYY-MM-DD)', example: '2026-01-15' })
  @IsDateString()
  contractDate!: string;

  @ApiPropertyOptional({ description: 'Consignment contract end date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  contractEndDate?: string;

  @ApiPropertyOptional({ description: 'Minimum lease term in months' })
  @IsOptional()
  @IsInt()
  @Min(1)
  minimumTerm?: number;
}
