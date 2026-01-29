import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for withdrawing an application.
 */
export class WithdrawApplicationDto {
  @ApiPropertyOptional({
    description: 'Reason for withdrawal',
    example: 'Found another property',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
