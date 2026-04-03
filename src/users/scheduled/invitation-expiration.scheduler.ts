import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * InvitationExpirationScheduler
 *
 * Automatically expires pending invitations:
 * - Agency invitations: expired when invitationExpiresAt < now()
 * - Team invitations: expired after 7 days from invitedAt
 *
 * Runs every hour.
 */
@Injectable()
export class InvitationExpirationScheduler {
  private readonly logger = new Logger(InvitationExpirationScheduler.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Expire agency member invitations past their expiration date.
   * Marks INVITED members as INACTIVE when invitationExpiresAt < now().
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireAgencyInvitations(): Promise<void> {
    const expired = await this.prisma.agencyMember.updateMany({
      where: {
        status: 'INVITED',
        invitationExpiresAt: { lt: new Date() },
      },
      data: { status: 'INACTIVE' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} agency invitations`);
    }
  }

  /**
   * Expire team member invitations older than 7 days.
   * Marks pending members as expired after 7 days from invitedAt.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireTeamInvitations(): Promise<void> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const expired = await this.prisma.teamMember.updateMany({
      where: {
        status: 'pending',
        invitedAt: { lt: sevenDaysAgo },
      },
      data: { status: 'expired' },
    });

    if (expired.count > 0) {
      this.logger.log(`Expired ${expired.count} team invitations`);
    }
  }
}
