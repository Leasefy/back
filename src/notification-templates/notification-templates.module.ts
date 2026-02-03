import { Module } from '@nestjs/common';
import { NotificationTemplatesController } from './notification-templates.controller.js';
import { NotificationTemplatesService } from './notification-templates.service.js';

/**
 * NotificationTemplatesModule
 *
 * Admin module for managing notification templates.
 * All endpoints require ADMIN role.
 *
 * Endpoints:
 * - POST   /admin/notification-templates     - Create template
 * - GET    /admin/notification-templates     - List all templates
 * - GET    /admin/notification-templates/:id - Get template by ID
 * - GET    /admin/notification-templates/code/:code - Get template by code
 * - PUT    /admin/notification-templates/:id - Update template
 * - PATCH  /admin/notification-templates/:id/toggle-active - Toggle active
 * - DELETE /admin/notification-templates/:id - Delete template
 */
@Module({
  controllers: [NotificationTemplatesController],
  providers: [NotificationTemplatesService],
  exports: [NotificationTemplatesService],
})
export class NotificationTemplatesModule {}
