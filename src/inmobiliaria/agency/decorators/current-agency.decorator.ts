import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

interface AgencyInfo {
  agencyId: string;
  memberRole: string;
}

/**
 * Parameter decorator to extract the current agency context from the request.
 *
 * The AgencyMemberGuard must run before this decorator to populate
 * `request.agencyId` and `request.agencyMemberRole`.
 *
 * @param data - Optional property name ('agencyId' | 'memberRole')
 * @returns The full agency info object, or a specific property if data is provided
 *
 * @example
 * ```ts
 * // Get full agency info
 * @Get('dashboard')
 * getDashboard(@CurrentAgency() agency: AgencyInfo) {
 *   console.log(agency.agencyId, agency.memberRole);
 * }
 *
 * // Get specific field
 * @Get('members')
 * getMembers(@CurrentAgency('agencyId') agencyId: string) {
 *   return this.service.getMembers(agencyId);
 * }
 * ```
 */
export const CurrentAgency = createParamDecorator(
  (data: keyof AgencyInfo | undefined, ctx: ExecutionContext) => {
    const request = ctx
      .switchToHttp()
      .getRequest<Request & { agencyId?: string; agencyMemberRole?: string }>();

    const agencyInfo: AgencyInfo = {
      agencyId: request.agencyId ?? '',
      memberRole: request.agencyMemberRole ?? '',
    };

    if (!request.agencyId) {
      return undefined;
    }

    return data ? agencyInfo[data] : agencyInfo;
  },
);
