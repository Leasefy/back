import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a payment request.
 * Requires a reason explaining why the payment was rejected.
 *
 * Requirement: TPAY-10
 */
export class RejectPaymentDto {
  @ApiProperty({
    description: 'Reason for rejection',
    example: 'El comprobante no coincide con el monto reportado. Por favor verifique y reenvie.',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(500, { message: 'Rejection reason must not exceed 500 characters' })
  reason!: string;
}
