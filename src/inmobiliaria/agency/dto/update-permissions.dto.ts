import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AGENCY_MODULES, AGENCY_ACTIONS } from '../permissions/agency-permissions.js';
import type { AgencyPermissions } from '../permissions/agency-permissions.js';

/**
 * DTO for updating granular permissions of an agency member.
 *
 * `permissions` is a map of module -> allowed actions.
 * Pass null or omit to reset to role defaults.
 */
export class UpdatePermissionsDto {
  @ApiProperty({
    description:
      'Custom permission map. Each key is a module, value is an array of allowed actions. ' +
      `Modules: ${AGENCY_MODULES.join(', ')}. Actions: ${AGENCY_ACTIONS.join(', ')}. ` +
      'Pass null to reset to role defaults.',
    required: false,
    nullable: true,
    example: {
      dashboard: ['view'],
      propietarios: ['view', 'create', 'edit'],
      reportes: ['view', 'export'],
    },
  })
  @IsOptional()
  @IsObject()
  permissions!: AgencyPermissions | null;
}
