import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Parameter decorator that extracts the teamOwnerId set by TeamAccessGuard.
 *
 * teamOwnerId is the effective landlord owner for the current request:
 * - For direct landlord owners: user.id
 * - For team members: the ownerId of the landlord who invited them
 * - For agents: user.id (agent manages as self)
 *
 * Use this instead of @CurrentUser('id') in landlord controllers where
 * team member context scoping is needed.
 *
 * Requires TeamAccessGuard to have run (even without @RequireTeamPermission,
 * the guard sets teamOwnerId when it passes through).
 *
 * @example
 * ```ts
 * @UseGuards(TeamAccessGuard)
 * @RequireTeamPermission('properties', 'view')
 * @Get('properties')
 * async getProperties(@TeamOwner() ownerId: string) {
 *   return this.service.findByLandlord(ownerId);
 * }
 * ```
 */
export const TeamOwner = createParamDecorator(
  (_data: undefined, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request & { teamOwnerId?: string }>();
    return request.teamOwnerId;
  },
);
