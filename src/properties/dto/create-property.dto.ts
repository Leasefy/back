import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  Max,
  MaxLength,
  MinLength,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { PropertyType, PropertyStatus } from '../../common/enums/index.js';

/**
 * DTO for creating a new property listing.
 * All required fields must be provided by the landlord.
 */
export class CreatePropertyDto {
  @ApiProperty({ example: 'Apartamento moderno en Chapinero' })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  title!: string;

  @ApiProperty({ example: 'Hermoso apartamento con vista a la ciudad...' })
  @IsString()
  @MinLength(20)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ enum: PropertyType, example: PropertyType.APARTMENT })
  @IsEnum(PropertyType)
  type!: PropertyType;

  @ApiPropertyOptional({ enum: PropertyStatus, default: PropertyStatus.DRAFT })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiProperty({ example: 'Bogota' })
  @IsString()
  @MaxLength(50)
  city!: string;

  @ApiProperty({ example: 'Chapinero' })
  @IsString()
  @MaxLength(100)
  neighborhood!: string;

  @ApiProperty({ example: 'Calle 53 #7-25' })
  @IsString()
  @MaxLength(200)
  address!: string;

  @ApiPropertyOptional({ example: 4.6534 })
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -74.0594 })
  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @ApiProperty({ example: 2500000, description: 'Monthly rent in COP' })
  @IsNumber()
  @Min(100000)
  @Max(100000000)
  monthlyRent!: number;

  @ApiPropertyOptional({ example: 150000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  adminFee?: number;

  @ApiPropertyOptional({ example: 2500000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  deposit?: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(0)
  @Max(20)
  bedrooms!: number;

  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  @Max(10)
  bathrooms!: number;

  @ApiProperty({ example: 75, description: 'Area in square meters' })
  @IsNumber()
  @Min(10)
  @Max(10000)
  area!: number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  floor?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  parkingSpaces?: number;

  @ApiPropertyOptional({ example: 4, description: 'Colombian stratum 1-6' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(6)
  stratum?: number;

  @ApiPropertyOptional({ example: 2015 })
  @IsOptional()
  @IsNumber()
  @Min(1900)
  @Max(2100)
  yearBuilt?: number;

  @ApiPropertyOptional({ example: ['pool', 'gym', 'parking'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];
}
