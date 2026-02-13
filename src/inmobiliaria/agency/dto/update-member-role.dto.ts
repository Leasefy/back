import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AgencyMemberRole } from '../../../common/enums/agency-member-role.enum.js';

/**
 * DTO for updating a member's role within the agency.
 */
export class UpdateMemberRoleDto {
  @ApiProperty({
    enum: AgencyMemberRole,
    example: AgencyMemberRole.AGENTE,
    description: 'New role for the member',
  })
  @IsEnum(AgencyMemberRole)
  role!: AgencyMemberRole;
}
