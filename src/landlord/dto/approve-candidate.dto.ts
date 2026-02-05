import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for approving a candidate.
 * Approval means tenant is accepted and can proceed to contract.
 */
export class ApproveCandidateDto {
  @ApiPropertyOptional({
    description: 'Optional message to tenant',
    example:
      'Congratulations! Your application has been approved. We will send the contract shortly.',
    maxLength: 1000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
