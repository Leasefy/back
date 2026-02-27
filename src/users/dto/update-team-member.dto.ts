import { IsOptional, IsString, MaxLength, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for updating a team member's name or role.
 */
export class UpdateTeamMemberDto {
  @ApiPropertyOptional({ description: 'Updated name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ description: 'Updated role: admin, manager, accountant, viewer' })
  @IsOptional()
  @IsString()
  @IsIn(['admin', 'manager', 'accountant', 'viewer'])
  role?: string;
}
