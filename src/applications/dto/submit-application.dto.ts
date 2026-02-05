import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for application submission (step 6).
 * No required fields - just optional notes/message.
 */
export class SubmitApplicationDto {
  @ApiPropertyOptional({
    description: 'Optional message to landlord',
    example:
      'I am very interested in this property and can move in immediately.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
