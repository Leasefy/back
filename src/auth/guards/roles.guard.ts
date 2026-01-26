import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { User } from '@prisma/client';
import type { Request } from 'express';
import { Role } from '../../common/enums/role.enum.js';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Guard that enforces role-based access control.
 *
 * Checks if the authenticated user has one of the required roles.
 * Users with BOTH role can access any role-restricted route.
 *
 * Must be applied AFTER SupabaseAuthGuard to ensure user is authenticated.
 *
 * @example
 * ```ts
 * @Roles(Role.LANDLORD)
 * @Get('properties')
 * getProperties() { ... }
 *
 * // Users with BOTH role can access TENANT or LANDLORD routes
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Checks if the user has permission to access the route.
   *
   * @param context - Execution context with handler and class metadata
   * @returns true if access allowed
   * @throws ForbiddenException if user lacks required role
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No roles required - allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: User }>();
    const user = request.user;

    // No user (shouldn't happen if auth guard ran first)
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Users with BOTH role can access any role-restricted route
    if (user.role === Role.BOTH) {
      return true;
    }

    // Check if user's role is in required roles
    const hasRole = requiredRoles.includes(user.role as Role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required role: ${requiredRoles.join(' or ')}. Your role: ${user.role}`,
      );
    }

    return true;
  }
}
