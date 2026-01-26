import { SetMetadata } from '@nestjs/common';
import { Role } from '../../common/enums/role.enum.js';

/**
 * Metadata key for role-based access control.
 * Used by RolesGuard to check user permissions.
 */
export const ROLES_KEY = 'roles';

/**
 * Restricts route access to users with specific roles.
 * Users with BOTH role can access any role-restricted route.
 *
 * @param roles - Array of roles that can access this route
 *
 * @example
 * ```ts
 * @Roles(Role.LANDLORD)
 * @Get('properties')
 * getProperties() { ... }
 * ```
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
