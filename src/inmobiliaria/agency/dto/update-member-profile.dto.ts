import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for updating a member's display profile fields.
 * These are cosmetic fields that do not affect permissions or role.
 */
export class UpdateMemberProfileDto {
  @ApiPropertyOptional({
    example: 'Administrador General',
    description: 'Display title/position (free-form, independent of role)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}
