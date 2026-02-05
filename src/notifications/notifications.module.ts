import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
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
 * - NotificationsProcessor: BullMQ worker for async delivery
 * - Event listeners: Respond to application, payment, visit, contract events
 * - Scheduler: Cron jobs for reminders and overdue checks
 *
 * Events handled:
 * - application.submitted, application.statusChanged
 * - payment.receiptUploaded, payment.validated, payment.disputeOpened
 * - visit.requested, visit.statusChanged
 * - contract.ready, contract.signed
 *
 * Scheduled tasks:
 * - Visit reminders (24h before, hourly check)
 * - Payment reminders (3 days before, daily at 9 AM)
 * - Overdue payment checks (daily at 10 AM)
 * - Lease expiring checks (30 days before, daily at 8 AM)
 * - Lease expired checks (daily at 8 AM)
 */
@Module({
  imports: [
    ScheduleModule.forRoot(),
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
