import { IsOptional, IsInt, Min, IsBoolean, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for admin updates to plan pricing and limits.
 * All fields optional - admin updates only what changes.
 */
export class UpdatePlanPricingDto {
  @ApiPropertyOptional({ description: 'Monthly price in COP (0 for free)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  monthlyPrice?: number;

  @ApiPropertyOptional({ description: 'Annual price in COP (0 for free)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  annualPrice?: number;

  @ApiPropertyOptional({
    description: 'Price per extra scoring view in COP (0 for none)',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  scoringViewPrice?: number;

  @ApiPropertyOptional({
    description: 'Max properties allowed (-1 for unlimited)',
  })
  @IsOptional()
  @IsInt()
  maxProperties?: number;

  @ApiPropertyOptional({
    description: 'Max scoring views per month (-1 for unlimited)',
  })
  @IsOptional()
  @IsInt()
  maxScoringViews?: number;

  @ApiPropertyOptional({ description: 'Whether plan includes premium scoring' })
  @IsOptional()
  @IsBoolean()
  hasPremiumScoring?: boolean;

  @ApiPropertyOptional({ description: 'Whether plan includes API access' })
  @IsOptional()
  @IsBoolean()
  hasApiAccess?: boolean;

  @ApiPropertyOptional({ description: 'Plan display name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Plan description' })
  @IsOptional()
  @IsString()
  description?: string;
}
