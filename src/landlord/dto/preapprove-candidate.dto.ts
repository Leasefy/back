import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for pre-approving a candidate.
 * Pre-approval indicates interest but requires final steps (contract, etc).
 */
export class PreapproveCandidateDto {
  @ApiPropertyOptional({
    description: 'Optional message to tenant',
    example:
      'Your application looks promising. We will contact you soon for next steps.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
