import { Module } from '@nestjs/common';
import { EmailService } from './services/email.service.js';
import { PushService } from './services/push.service.js';

/**
 * NotificationsModule
 *
 * Provides notification delivery services:
 * - EmailService: Resend API for email delivery
 * - PushService: Firebase FCM for push notifications
 *
 * This module handles the delivery layer only.
 * Template rendering and orchestration are added in Plan 03.
 *
 * Usage:
 * 1. Import NotificationsModule in your module
 * 2. Inject EmailService/PushService
 * 3. Call send() with payload
 *
 * Both services handle errors gracefully and return
 * success/failure status for logging to NotificationLog.
 */
@Module({
  providers: [EmailService, PushService],
  exports: [EmailService, PushService],
})
export class NotificationsModule {}
