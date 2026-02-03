import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service.js';
import { NotificationChannel, NotificationStatus } from '../../common/enums/index.js';
import { EmailService } from '../services/email.service.js';
import { PushService } from '../services/push.service.js';
import { TemplateService } from '../services/template.service.js';
import type { NotificationJobData } from '../dto/notification-job.dto.js';

/**
 * NotificationsProcessor
 *
 * BullMQ worker that processes notification jobs asynchronously.
 *
 * Workflow:
 * 1. Load user and check preferences
 * 2. Render template with variables
 * 3. Send email (if enabled)
 * 4. Send push (if enabled and FCM token exists)
 * 5. Log results to NotificationLog
 *
 * User preferences respected:
 * - emailNotificationsEnabled: Skip email if false
 * - pushNotificationsEnabled: Skip push if false
 * - fcmToken: Skip push if null
 */
@Processor('notifications')
export class NotificationsProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
    private readonly templateService: TemplateService,
  ) {
    super();
  }

  /**
   * Process a notification job.
   */
  async process(job: Job<NotificationJobData>): Promise<void> {
    const { userId, templateCode, variables, triggeredBy } = job.data;
    this.logger.log(
      `Processing notification job ${job.id}: ${templateCode} for user ${userId}`,
    );

    // 1. Load user with preferences
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        fcmToken: true,
      },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping notification`);
      return;
    }

    // 2. Render template
    let rendered;
    try {
      rendered = await this.templateService.render(templateCode, {
        userName: [user.firstName, user.lastName].filter(Boolean).join(' ') || 'Usuario',
        userEmail: user.email,
        ...variables,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to render template ${templateCode}: ${message}`);
      // Log failed attempt for email
      await this.logNotification({
        userId,
        templateCode,
        channel: NotificationChannel.EMAIL,
        status: NotificationStatus.FAILED,
        recipient: user.email,
        errorMessage: `Template error: ${message}`,
      });
      return;
    }

    // 3. Send email if enabled
    if (user.emailNotificationsEnabled) {
      const emailResult = await this.emailService.send({
        to: user.email,
        subject: rendered.emailSubject,
        html: rendered.emailHtml,
      });

      await this.logNotification({
        userId,
        templateCode,
        channel: NotificationChannel.EMAIL,
        status: emailResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        recipient: user.email,
        subject: rendered.emailSubject,
        errorMessage: emailResult.error,
        sentAt: emailResult.success ? new Date() : undefined,
      });
    } else {
      this.logger.debug(`Email disabled for user ${userId}, skipping`);
    }

    // 4. Send push if enabled and token exists
    if (user.pushNotificationsEnabled && user.fcmToken) {
      const pushResult = await this.pushService.send({
        token: user.fcmToken,
        title: rendered.pushTitle,
        body: rendered.pushBody,
        data: {
          templateCode,
          triggeredBy: triggeredBy || 'system',
        },
      });

      await this.logNotification({
        userId,
        templateCode,
        channel: NotificationChannel.PUSH,
        status: pushResult.success ? NotificationStatus.SENT : NotificationStatus.FAILED,
        recipient: user.fcmToken,
        errorMessage: pushResult.error,
        sentAt: pushResult.success ? new Date() : undefined,
      });
    } else {
      this.logger.debug(
        `Push skipped for user ${userId}: enabled=${user.pushNotificationsEnabled}, token=${!!user.fcmToken}`,
      );
    }

    this.logger.log(`Notification job ${job.id} completed for ${templateCode}`);
  }

  /**
   * Log notification attempt to database.
   */
  private async logNotification(data: {
    userId: string;
    templateCode: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    recipient: string;
    subject?: string;
    errorMessage?: string;
    sentAt?: Date;
  }): Promise<void> {
    try {
      await this.prisma.notificationLog.create({
        data: {
          userId: data.userId,
          templateCode: data.templateCode,
          channel: data.channel,
          status: data.status,
          recipient: data.recipient,
          subject: data.subject,
          errorMessage: data.errorMessage,
          sentAt: data.sentAt,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log notification: ${error}`);
    }
  }

  /**
   * Handle failed jobs.
   */
  @OnWorkerEvent('failed')
  onFailed(job: Job<NotificationJobData>, error: Error): void {
    this.logger.error(
      `Notification job ${job.id} failed for ${job.data.templateCode}: ${error.message}`,
      error.stack,
    );
  }
}
