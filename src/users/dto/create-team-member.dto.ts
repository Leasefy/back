import { IsEmail, IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for inviting a new team member.
 */
export class CreateTeamMemberDto {
  @ApiProperty({ description: 'Email of the person to invite' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ description: 'Role: admin, manager, accountant, viewer', default: 'viewer' })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'manager', 'accountant', 'viewer'])
  role?: string;

  @ApiPropertyOptional({ description: 'Name of the team member' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;
}
