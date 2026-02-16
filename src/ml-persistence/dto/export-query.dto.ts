import {
  IsOptional,
  IsString,
  IsInt,
  IsBoolean,
  IsIn,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * ExportQueryDto
 *
 * Query parameters for the ML training data export endpoint.
 * Supports filtering by algorithm version, minimum observation period,
 * output format (CSV/JSON), and whether to include only completed outcomes.
 */
export class ExportQueryDto {
  @ApiPropertyOptional({
    description: 'Algorithm version to filter by',
    default: '2.1',
    example: '2.1',
  })
  @IsOptional()
  @IsString()
  algorithmVersion?: string = '2.1';

  @ApiPropertyOptional({
    description:
      'Minimum months tracked for inclusion (only applies to lease outcomes)',
    default: 6,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minMonthsTracked?: number = 6;

  @ApiPropertyOptional({
    description: 'Output format',
    enum: ['csv', 'json'],
    default: 'csv',
  })
  @IsOptional()
  @IsIn(['csv', 'json'])
  format?: 'csv' | 'json' = 'csv';

  @ApiPropertyOptional({
    description:
      'Only include records with a non-null actual outcome (excludes PENDING)',
    default: true,
  })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  completedOnly?: boolean = true;
}
