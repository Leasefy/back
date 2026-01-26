import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Role } from '../../common/enums/role.enum.js';

/**
 * DTO for switching active role.
 * Only users with BOTH role can use this endpoint.
 * Valid values are TENANT or LANDLORD (not BOTH).
 */
export class SwitchRoleDto {
  @ApiProperty({
    description: 'The role to switch to (TENANT or LANDLORD only)',
    enum: [Role.TENANT, Role.LANDLORD],
    example: Role.TENANT,
  })
  @IsEnum([Role.TENANT, Role.LANDLORD], {
    message: 'activeRole must be either TENANT or LANDLORD',
  })
  activeRole!: Role.TENANT | Role.LANDLORD;
}
