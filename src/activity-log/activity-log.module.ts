import { Module } from '@nestjs/common';
import { ActivityLogController } from './activity-log.controller.js';
import { ActivityLogService } from './activity-log.service.js';

/**
 * ActivityLogModule
 *
 * Provides unified activity logging infrastructure:
 * - ActivityLogService.create() for event listeners to record activities
 * - GET /activities endpoint for querying the user's activity feed
 *
 * Exports ActivityLogService for use by Plan 18-03 event listeners.
 */
@Module({
  controllers: [ActivityLogController],
  providers: [ActivityLogService],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
