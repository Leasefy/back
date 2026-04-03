import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Prisma } from '@prisma/client';
import type { Request } from 'express';
import { AgencyMemberRole } from '../../../common/enums/agency-member-role.enum.js';
import {
  AGENCY_PERMISSION_KEY,
  type AgencyPermissionMeta,
} from '../decorators/require-permission.decorator.js';
import { AGENCY_ROLE_DEFAULTS } from '../permissions/role-defaults.js';
import type {
  AgencyPermissions,
  AgencyModule,
  AgencyAction,
} from '../permissions/agency-permissions.js';

/**
 * Guard that enforces granular module+action permissions for agency members.
 *
 * Must be applied AFTER AgencyMemberGuard (which sets agencyMemberRole and agencyPermissions).
 *
 * Logic:
 * 1. If no @RequirePermission metadata on handler → pass (open to any agency member)
 * 2. ADMIN role → always pass
 * 3. Look up effective permissions: custom (agencyPermissions) or role defaults
 * 4. Check that the required module includes the required action
 * 5. If not → ForbiddenException
 *
 * @example
 * ```ts
 * @UseGuards(AgencyMemberGuard, AgencyPermissionGuard)
 * @Controller('inmobiliaria/propietarios')
 * export class PropietariosController {
 *   @RequirePermission('propietarios', 'create')
 *   @Post()
 *   async create(...) {}
 * }
 * ```
 */
@Injectable()
export class AgencyPermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Step 1: Read required permission metadata from handler
    const required = this.reflector.get<AgencyPermissionMeta | undefined>(
      AGENCY_PERMISSION_KEY,
      context.getHandler(),
    );

    // No permission required for this endpoint → pass
    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<
        Request & {
          agencyMemberRole?: string;
          agencyPermissions?: Prisma.JsonValue | null;
        }
      >();

    const role = request.agencyMemberRole as AgencyMemberRole | undefined;

    // Step 2: ADMIN bypasses all permission checks
    if (role === AgencyMemberRole.ADMIN) {
      return true;
    }

    if (!role) {
      throw new ForbiddenException('No agency role found on request');
    }

    // Step 3: Determine effective permissions
    const customPermissions = request.agencyPermissions as AgencyPermissions | null | undefined;
    const effectivePermissions: AgencyPermissions =
      customPermissions != null
        ? customPermissions
        : (AGENCY_ROLE_DEFAULTS[
            role as Exclude<AgencyMemberRole, AgencyMemberRole.ADMIN>
          ] ?? {});

    // Step 4: Check module + action
    const { module, action } = required;
    const allowedActions: AgencyAction[] =
      (effectivePermissions[module as AgencyModule] as AgencyAction[] | undefined) ?? [];

    if (!allowedActions.includes(action)) {
      throw new ForbiddenException(
        `No tienes permiso para ${action} en ${module}`,
      );
    }

    return true;
  }
}
