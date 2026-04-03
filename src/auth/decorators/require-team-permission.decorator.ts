import { SetMetadata } from '@nestjs/common';
import type { TeamResource, TeamAction } from '../permissions/team-role-permissions.js';

/**
 * Metadata key used by TeamAccessGuard to read the required permission.
 */
export const TEAM_PERMISSION_KEY = 'team_permission';

/**
 * Metadata shape for @RequireTeamPermission decorator.
 */
export interface TeamPermissionMeta {
  resource: TeamResource;
  action: TeamAction;
}

/**
 * Decorator that declares the minimum team permission required to access an endpoint.
 *
 * Use together with @UseGuards(TeamAccessGuard).
 * TeamAccessGuard reads this metadata and checks the authenticated user's
 * team role permissions against TEAM_ROLE_PERMISSIONS.
 *
 * For LANDLORD owners (direct, with own properties), access is always granted.
 * For team members (invited via email, accepted status), the role matrix is enforced.
 *
 * @param resource - The resource category (e.g. 'properties', 'contracts')
 * @param action   - The action attempted (e.g. 'view', 'create', 'edit', 'delete')
 *
 * @example
 * ```ts
 * @UseGuards(TeamAccessGuard)
 * @RequireTeamPermission('properties', 'delete')
 * @Delete(':id')
 * async delete(@TeamOwner() ownerId: string, @Param('id') id: string) { ... }
 * ```
 */
export const RequireTeamPermission = (resource: TeamResource, action: TeamAction) =>
  SetMetadata(TEAM_PERMISSION_KEY, { resource, action } satisfies TeamPermissionMeta);
