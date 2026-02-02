import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * CreateDisputeDto
 *
 * DTO for creating a dispute on a rejected payment request.
 * Tenant must provide a reason explaining why they believe
 * the rejection was incorrect.
 *
 * Additional evidence (if any) is uploaded via multipart form,
 * not included in this DTO.
 *
 * Requirements: TPAY-11
 */
export class CreateDisputeDto {
  @ApiProperty({
    description: 'Reason for disputing the rejection',
    example: 'El comprobante muestra claramente el pago realizado el dia correcto',
    minLength: 20,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(20, { message: 'Reason must be at least 20 characters' })
  @MaxLength(2000, { message: 'Reason must be at most 2000 characters' })
  reason!: string;
}
