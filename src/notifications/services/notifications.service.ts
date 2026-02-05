import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { NotificationJobData } from '../dto/notification-job.dto.js';
import type { TemplateVariables } from './template.service.js';

/**
 * NotificationsService
 *
 * Main interface for sending notifications.
 * Queues notification jobs for async processing by NotificationsProcessor.
 *
 * Usage:
 * ```typescript
 * await notificationsService.send({
 *   userId: '...',
 *   templateCode: 'APPLICATION_RECEIVED',
 *   variables: {
 *     propertyTitle: 'Apartamento en Chapinero',
 *     otherPartyName: 'Juan Perez',
 *   },
 * });
 * ```
 *
 * The processor will:
 * 1. Load user and check preferences
 * 2. Render template with variables
 * 3. Send email and/or push based on preferences
 * 4. Log results to NotificationLog table
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('notifications')
    private readonly queue: Queue<NotificationJobData>,
  ) {}

  /**
   * Queue a notification for async delivery.
   *
   * @param data - Notification job data
   * @returns Job ID
   */
  async send(data: {
    userId: string;
    templateCode: string;
    variables?: TemplateVariables;
    triggeredBy?: string;
  }): Promise<string> {
    const jobId = `notif-${data.templateCode}-${data.userId}-${Date.now()}`;

    await this.queue.add(
      data.templateCode, // Job name
      {
        userId: data.userId,
        templateCode: data.templateCode,
        variables: data.variables || {},
        triggeredBy: data.triggeredBy,
      },
      {
        jobId,
        // Don't retry too aggressively for notifications
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000, // 10s, then 20s
        },
      },
    );

    this.logger.log(
      `Queued notification ${jobId}: ${data.templateCode} for user ${data.userId}`,
    );

    return jobId;
  }

  /**
   * Send notification to multiple users.
   *
   * @param userIds - Array of user IDs
   * @param templateCode - Template code
   * @param variables - Shared variables (per-user variables can override)
   * @returns Array of job IDs
   */
  async sendBulk(
    userIds: string[],
    templateCode: string,
    variables?: TemplateVariables,
    triggeredBy?: string,
  ): Promise<string[]> {
    const jobIds = await Promise.all(
      userIds.map((userId) =>
        this.send({
          userId,
          templateCode,
          variables,
          triggeredBy,
        }),
      ),
    );

    this.logger.log(
      `Queued ${jobIds.length} notifications for ${templateCode}`,
    );
    return jobIds;
  }
}
