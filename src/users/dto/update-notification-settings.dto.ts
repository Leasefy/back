import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating granular notification settings.
 * All fields optional — only provided fields are updated.
 */
export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional({ description: 'Email on new application received' })
  @IsOptional()
  @IsBoolean()
  emailApplications?: boolean;

  @ApiPropertyOptional({ description: 'Email on visit scheduled/completed' })
  @IsOptional()
  @IsBoolean()
  emailVisits?: boolean;

  @ApiPropertyOptional({ description: 'Email on contract events' })
  @IsOptional()
  @IsBoolean()
  emailContracts?: boolean;

  @ApiPropertyOptional({ description: 'Email on payment received' })
  @IsOptional()
  @IsBoolean()
  emailPayments?: boolean;

  @ApiPropertyOptional({ description: 'Email on new messages' })
  @IsOptional()
  @IsBoolean()
  emailMessages?: boolean;

  @ApiPropertyOptional({ description: 'Marketing/promotional emails' })
  @IsOptional()
  @IsBoolean()
  emailMarketing?: boolean;

  @ApiPropertyOptional({ description: 'Push notifications enabled' })
  @IsOptional()
  @IsBoolean()
  pushAll?: boolean;

  @ApiPropertyOptional({ description: 'Push only for urgent events' })
  @IsOptional()
  @IsBoolean()
  pushUrgent?: boolean;
}
