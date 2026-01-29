import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsBoolean } from 'class-validator';

/**
 * DTO for responding to landlord's info request.
 */
export class RespondInfoRequestDto {
  @ApiProperty({
    description: 'Response message with requested information',
    example: 'Here is the additional information you requested...',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    description: 'Whether to mark as ready for review again',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  readyForReview?: boolean;
}
