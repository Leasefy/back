import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller.js';
import { EmailService } from './services/email.service.js';
import { PushService } from './services/push.service.js';
import { TemplateService } from './services/template.service.js';
import { NotificationsService } from './services/notifications.service.js';
import { NotificationsProcessor } from './processors/notifications.processor.js';
import {
  ApplicationNotificationListener,
  PaymentNotificationListener,
  VisitNotificationListener,
  ContractNotificationListener,
} from './listeners/index.js';
import { NotificationsScheduler } from './scheduled/notifications-scheduler.js';

/**
 * NotificationsModule
 *
 * Complete notification infrastructure:
 * - EmailService: Resend API for email delivery
 * - PushService: Firebase FCM for push notifications
 * - TemplateService: Markdown template rendering
 * - NotificationsService: Main interface for queuing notifications
 * - NotificationsProcessor: BullMQ worker for async delivery (polls every 5 min)
 * - Event listeners: Respond to application, payment, visit, contract events
 * - Scheduler: Cron jobs for reminders and overdue checks
 *
 * This is the ONLY module that uses BullMQ/Redis.
 * Scoring and document-analysis process on-demand without queues.
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
    // Redis connection for BullMQ (only used by notifications)
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.getOrThrow<string>('REDIS_URL'),
        },
      }),
    }),
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
  controllers: [NotificationsController],
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
    // Event listeners
    ApplicationNotificationListener,
    PaymentNotificationListener,
    VisitNotificationListener,
    ContractNotificationListener,
    // Scheduler
    NotificationsScheduler,
  ],
  exports: [NotificationsService, EmailService, PushService, TemplateService],
})
export class NotificationsModule {}
