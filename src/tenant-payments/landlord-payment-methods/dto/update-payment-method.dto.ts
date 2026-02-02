import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateLandlordPaymentMethodDto } from './create-payment-method.dto.js';

/**
 * DTO for updating a landlord payment method.
 * All fields from CreateLandlordPaymentMethodDto are optional.
 * Adds isActive field for deactivation.
 */
export class UpdateLandlordPaymentMethodDto extends PartialType(
  CreateLandlordPaymentMethodDto,
) {
  @ApiPropertyOptional({
    description: 'Whether the payment method is active',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
