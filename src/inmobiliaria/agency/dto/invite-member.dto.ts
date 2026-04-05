import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { AgencyMemberRole } from '../../../common/enums/agency-member-role.enum.js';

/**
 * DTO for inviting a member to the agency.
 * The user must already exist on the platform (found by email).
 */
export class InviteMemberDto {
  @ApiProperty({ example: 'agente@ejemplo.com', description: 'Email of user to invite' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Carlos Agente', description: 'Display name for the member' })
  @IsString()
  name!: string;

  @ApiProperty({
    enum: AgencyMemberRole,
    example: AgencyMemberRole.AGENTE,
    description: 'Role to assign to the member',
  })
  @IsEnum(AgencyMemberRole)
  role!: AgencyMemberRole;

  @ApiPropertyOptional({
    example: 'Agente Senior',
    description: 'Display title/position (free-form, independent of role)',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  position?: string;
}
