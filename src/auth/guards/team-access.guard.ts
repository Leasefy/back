import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../database/prisma.service.js';
import { Role } from '../../common/enums/role.enum.js';
import {
  TEAM_PERMISSION_KEY,
  type TeamPermissionMeta,
} from '../decorators/require-team-permission.decorator.js';
import {
  TEAM_ROLE_PERMISSIONS,
  type TeamAction,
} from '../permissions/team-role-permissions.js';

/**
 * Guard that enforces role-based access control for landlord team members.
 *
 * Must run AFTER SupabaseAuthGuard (which sets request.user).
 *
 * Logic:
 * 1. If no @RequireTeamPermission metadata on handler → pass
 * 2. If user.role === TENANT → pass (different flow entirely)
 * 3. If user.role === AGENT → pass, set teamOwnerId = user.id (agent manages as self)
 * 4. If user.role === LANDLORD:
 *    a. Treat as direct owner by default → set teamOwnerId = user.id and pass
 *    b. BUT if user was INVITED as a team member (TeamMember entry by email + status=accepted)
 *       and does NOT have their own landlord account (no properties) → enforce team permissions
 *    c. For MVP: any LANDLORD user is treated as a direct owner. Team member context
 *       (restricting a landlord to another landlord's data) is a future switching feature.
 *
 * Sets request.teamOwnerId for downstream controllers/services to use for data scoping.
 *
 * @example
 * ```ts
 * @UseGuards(TeamAccessGuard)
 * @Controller('landlord')
 * export class LandlordController {
 *   @RequireTeamPermission('properties', 'view')
 *   @Get('properties')
 *   async getProperties(@TeamOwner() ownerId: string) { ... }
 * }
 * ```
 */
@Injectable()
export class TeamAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Step 1: Read required permission from handler metadata
    const required = this.reflector.get<TeamPermissionMeta | undefined>(
      TEAM_PERMISSION_KEY,
      context.getHandler(),
    );

    // No permission required on this endpoint → pass
    if (!required) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: User; teamOwnerId?: string }>();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Step 2: TENANT users are not subject to team permissions (different flow)
    if (user.role === Role.TENANT) {
      return true;
    }

    // Step 3: AGENT users pass through — they operate under their own agency flow
    if (user.role === Role.AGENT) {
      request.teamOwnerId = user.id;
      return true;
    }

    // Step 4: LANDLORD users
    // For MVP: a LANDLORD user is always treated as a direct owner of their own resources.
    // Team member enforcement (limiting a landlord-role user to another owner's data subset)
    // requires an explicit context-switch feature not yet implemented.
    // Setting teamOwnerId = user.id allows downstream services to filter by owner.
    request.teamOwnerId = user.id;

    // Check if this user is ALSO a team member of another landlord (invited via email).
    // If they have NO own properties, they might be a pure team member.
    // In that case we enforce the team role permissions from TEAM_ROLE_PERMISSIONS.
    const ownPropertyCount = await this.prisma.property.count({
      where: { landlordId: user.id },
    });

    if (ownPropertyCount > 0) {
      // User has their own properties — they're a direct landlord owner, pass.
      return true;
    }

    // No own properties: check if they're an accepted team member of another landlord
    const teamMembership = await this.prisma.teamMember.findFirst({
      where: {
        email: user.email,
        status: 'accepted',
      },
      select: {
        ownerId: true,
        role: true,
      },
    });

    if (!teamMembership) {
      // Not a team member of anyone — still a valid landlord (just no properties yet)
      return true;
    }

    // User is a team member of another landlord: enforce team role permissions
    const { resource, action } = required;
    const permissions = TEAM_ROLE_PERMISSIONS[teamMembership.role] ?? {};
    const allowedActions: TeamAction[] =
      (permissions[resource as keyof typeof permissions] as TeamAction[] | undefined) ?? [];

    if (!allowedActions.includes(action)) {
      throw new ForbiddenException(
        `No tienes permiso para ${action} en ${resource}. Rol de equipo: ${teamMembership.role}`,
      );
    }

    // Scope context to the owner who invited this team member
    request.teamOwnerId = teamMembership.ownerId;

    return true;
  }
}
