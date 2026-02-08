import {
  IsString,
  IsEnum,
  IsOptional,
  IsInt,
  Min,
  Max,
  Length,
  IsISO8601,
  IsArray,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CouponType } from '../../common/enums/index.js';

/**
 * DTO for creating a new coupon code.
 * Admin-only operation.
 */
export class CreateCouponDto {
  @ApiProperty({ description: 'Coupon code (3-50 chars)', example: 'SUMMER2026' })
  @IsString()
  @Length(3, 50)
  code!: string;

  @ApiProperty({
    description: 'Type of discount',
    enum: CouponType,
    example: CouponType.PERCENTAGE,
  })
  @IsEnum(CouponType)
  type!: CouponType;

  @ApiPropertyOptional({
    description: 'Percentage off (1-100) - required for PERCENTAGE type',
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  percentageOff?: number;

  @ApiPropertyOptional({
    description: 'Fixed amount off in COP - required for FIXED_AMOUNT type',
    example: 50000,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  amountOff?: number;

  @ApiPropertyOptional({
    description: 'Number of free months (1-12) - required for FREE_MONTHS type',
    example: 3,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  freeMonths?: number;

  @ApiProperty({
    description: 'Valid from date (ISO8601)',
    example: '2026-02-01T00:00:00Z',
  })
  @IsISO8601()
  validFrom!: string;

  @ApiProperty({
    description: 'Valid until date (ISO8601)',
    example: '2026-12-31T23:59:59Z',
  })
  @IsISO8601()
  validUntil!: string;

  @ApiPropertyOptional({
    description: 'Maximum number of uses (null = unlimited)',
    example: 100,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;

  @ApiPropertyOptional({
    description:
      'Applicable plan keys (e.g. ["TENANT_PRO", "LANDLORD_BUSINESS"]) - empty = all plans',
    example: ['TENANT_PRO'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicablePlans?: string[];

  @ApiPropertyOptional({
    description: 'Admin description/notes',
    example: 'Summer 2026 promotion for tenant PRO plan',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
