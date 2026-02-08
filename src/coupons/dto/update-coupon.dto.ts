import {
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsISO8601,
  IsArray,
  IsString,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating an existing coupon.
 * Admin-only operation.
 * Code and type are immutable after creation.
 */
export class UpdateCouponDto {
  @ApiPropertyOptional({ description: 'Active status', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Maximum number of uses (null = unlimited)',
    example: 200,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description: 'Valid until date (ISO8601)',
    example: '2027-01-31T23:59:59Z',
  })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional({
    description:
      'Applicable plan keys (e.g. ["TENANT_PRO", "LANDLORD_BUSINESS"]) - empty = all plans',
    example: ['TENANT_PRO', 'TENANT_FREE'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlans?: string[];

  @ApiPropertyOptional({
    description: 'Admin description/notes',
    example: 'Extended summer promotion',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
