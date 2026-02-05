import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for canceling a visit.
 * Reason is required for record-keeping.
 */
export class CancelVisitDto {
  @ApiProperty({
    example: 'Ya no estoy interesado en esta propiedad',
    description: 'Reason for cancellation (required)',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, {
    message: 'Cancellation reason must be at least 10 characters',
  })
  @MaxLength(500)
  reason!: string;
}
