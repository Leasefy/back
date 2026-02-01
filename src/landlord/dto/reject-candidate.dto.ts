import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

/**
 * DTO for rejecting a candidate.
 * Reason is required for transparency and legal compliance.
 */
export class RejectCandidateDto {
  @ApiProperty({
    description: 'Reason for rejection (required)',
    example: 'We found a candidate whose profile better matches our requirements.',
    maxLength: 1000,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
