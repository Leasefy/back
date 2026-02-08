import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for validating a coupon code.
 * Used by authenticated users when applying a coupon to subscription.
 */
export class ValidateCouponDto {
  @ApiProperty({ description: 'Coupon code', example: 'SUMMER2026' })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Plan ID to check applicability',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  planId!: string;
}
