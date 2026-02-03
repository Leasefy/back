import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { EmailService } from './services/email.service.js';
import { PushService } from './services/push.service.js';
import { TemplateService } from './services/template.service.js';
import { NotificationsService } from './services/notifications.service.js';
import { NotificationsProcessor } from './processors/notifications.processor.js';

/**
 * NotificationsModule
 *
 * Provides the complete notification infrastructure:
 * - EmailService: Resend API for email delivery
 * - PushService: Firebase FCM for push notifications
 * - TemplateService: Markdown template rendering
 * - NotificationsService: Main interface for queuing notifications
 * - NotificationsProcessor: BullMQ worker for async delivery
 *
 * Queue: 'notifications'
 * - Jobs processed asynchronously
 * - 2 retry attempts with exponential backoff
 * - Results logged to NotificationLog table
 *
 * Usage:
 * ```typescript
 * // In event listener or service
 * await this.notificationsService.send({
 *   userId: landlordId,
 *   templateCode: 'APPLICATION_RECEIVED',
 *   variables: { propertyTitle, otherPartyName },
 * });
 * ```
 */
@Module({
  imports: [
    // Register the 'notifications' queue
    // Note: BullMQ root config is already in ScoringModule,
    // we just register an additional queue here
    BullModule.registerQueue({
      name: 'notifications',
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    }),
  ],
  providers: [
    // Delivery services
    EmailService,
    PushService,
    // Template rendering
    TemplateService,
    // Orchestration
    NotificationsService,
    // Queue processor
    NotificationsProcessor,
  ],
  exports: [
    // Export NotificationsService as main interface
    NotificationsService,
    // Also export individual services for direct use if needed
    EmailService,
    PushService,
    TemplateService,
  ],
})
export class NotificationsModule {}
