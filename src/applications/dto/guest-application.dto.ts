import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { CreateCompleteApplicationDto } from './create-complete-application.dto.js';

/**
 * DTO for guest (unauthenticated) application submission.
 * Extends the complete application DTO — email is already required there.
 * The backend uses the email to invite the user via Supabase.
 */
export class GuestApplicationDto extends CreateCompleteApplicationDto {
  @ApiPropertyOptional({ description: 'Agent referral code from shareable link' })
  @IsOptional()
  @IsString()
  declare agentCode?: string;

  @ApiPropertyOptional({ description: 'Shareable link tracking code' })
  @IsOptional()
  @IsString()
  declare linkCode?: string;
}
