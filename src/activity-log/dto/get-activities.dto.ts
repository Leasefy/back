import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsInt,
  IsUUID,
  IsArray,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ActivityType } from '../../common/enums/index.js';

export class GetActivitiesDto {
  @ApiPropertyOptional({
    example: '2026-02-08T12:00:00.000Z',
    description: 'ISO timestamp cursor for pagination (activities before this time)',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    example: 20,
    default: 20,
    description: 'Number of items per page (1-100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Filter activities by property ID (via metadata.propertyId)',
  })
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({
    enum: ActivityType,
    isArray: true,
    description: 'Filter by activity types',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((s: string) => s.trim());
    }
    return value;
  })
  @IsArray()
  @IsEnum(ActivityType, { each: true })
  types?: ActivityType[];
}
