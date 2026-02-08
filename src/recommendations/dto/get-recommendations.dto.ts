import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Sort order for recommendations.
 */
export enum RecommendationSort {
  MATCH = 'match',
  PRICE_ASC = 'price_asc',
  PRICE_DESC = 'price_desc',
  PROBABILITY = 'probability',
}

/**
 * Acceptance probability filter.
 */
export enum AcceptanceProbability {
  ALTA = 'alta',
  MEDIA = 'media',
  BAJA = 'baja',
}

/**
 * Query parameters for GET /recommendations.
 * Supports sorting, probability filtering, and pagination.
 */
export class GetRecommendationsDto {
  @ApiPropertyOptional({
    enum: RecommendationSort,
    default: RecommendationSort.MATCH,
    description: 'Sort order: match score, price ascending/descending, or acceptance probability',
  })
  @IsOptional()
  @IsEnum(RecommendationSort)
  sort?: RecommendationSort = RecommendationSort.MATCH;

  @ApiPropertyOptional({
    enum: AcceptanceProbability,
    description: 'Filter by acceptance probability level',
  })
  @IsOptional()
  @IsEnum(AcceptanceProbability)
  probability?: AcceptanceProbability;

  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 9,
    minimum: 1,
    maximum: 50,
    description: 'Results per page',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 9;
}
