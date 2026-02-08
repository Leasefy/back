import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsString,
  IsInt,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  Min,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PropertyType } from '../../common/enums/property-type.enum.js';

/**
 * DTO for saving/updating tenant search preferences.
 * All fields are optional - supports full replacement semantics.
 * Frontend sends the complete preferences object on each PATCH.
 */
export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    description: 'Preferred cities for property search',
    example: ['Bogota', 'Medellin'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10)
  preferredCities?: string[];

  @ApiPropertyOptional({
    description: 'Preferred number of bedrooms (null = any)',
    example: 2,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  preferredBedrooms?: number;

  @ApiPropertyOptional({
    description: 'Preferred property types',
    example: ['APARTMENT', 'HOUSE'],
    enum: PropertyType,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(PropertyType, { each: true })
  preferredPropertyTypes?: string[];

  @ApiPropertyOptional({
    description: 'Minimum monthly budget in COP (null = no minimum)',
    example: 1000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minBudget?: number;

  @ApiPropertyOptional({
    description: 'Maximum monthly budget in COP (null = no maximum)',
    example: 3000000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxBudget?: number;

  @ApiPropertyOptional({
    description: 'Looking for pet-friendly properties',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  petFriendly?: boolean;

  @ApiPropertyOptional({
    description: 'Desired move-in date (ISO 8601 date string)',
    example: '2026-03-01',
  })
  @IsOptional()
  @IsDateString()
  moveInDate?: string;
}
