import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import type { Prisma, User } from '@prisma/client';
import type { Request } from 'express';
import { PrismaService } from '../../../database/prisma.service.js';
import { AgencyMemberStatus } from '../../../common/enums/agency-member-status.enum.js';

/**
 * Guard that checks if the current user is an active member of an agency.
 *
 * Sets `request.agencyId`, `request.agencyMemberRole`, and `request.agencyPermissions`
 * for downstream handlers and decorators.
 *
 * `request.agencyPermissions` is null when the member has no custom permissions override,
 * meaning the AgencyPermissionGuard will fall back to AGENCY_ROLE_DEFAULTS.
 *
 * Must be applied AFTER SupabaseAuthGuard to ensure user is authenticated.
 *
 * @example
 * ```ts
 * @UseGuards(AgencyMemberGuard)
 * @Get('dashboard')
 * getDashboard(@CurrentAgency('agencyId') agencyId: string) { ... }
 * ```
 */
@Injectable()
export class AgencyMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<
        Request & {
          user?: User;
          agencyId?: string;
          agencyMemberRole?: string;
          agencyPermissions?: Prisma.JsonValue | null;
        }
      >();

    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    const member = await this.prisma.agencyMember.findFirst({
      where: {
        userId: user.id,
        status: AgencyMemberStatus.ACTIVE,
      },
      select: {
        agencyId: true,
        role: true,
        permissions: true,
      },
    });

    if (!member) {
      throw new ForbiddenException(
        'You are not an active member of any agency',
      );
    }

    request.agencyId = member.agencyId;
    request.agencyMemberRole = member.role;
    request.agencyPermissions = member.permissions;

    return true;
  }
}
