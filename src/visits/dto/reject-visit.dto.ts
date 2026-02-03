import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a visit request.
 * Reason is required for transparency.
 */
export class RejectVisitDto {
  @ApiProperty({
    example: 'La propiedad ya no esta disponible para visitas esta semana',
    description: 'Reason for rejection (required)',
    minLength: 10,
    maxLength: 500,
  })
  @IsString()
  @MinLength(10, { message: 'Rejection reason must be at least 10 characters' })
  @MaxLength(500)
  reason!: string;
}
