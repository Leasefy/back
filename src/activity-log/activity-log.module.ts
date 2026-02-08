import { Module } from '@nestjs/common';
import { ActivityLogController } from './activity-log.controller.js';
import { ActivityLogService } from './activity-log.service.js';
import { ApplicationActivityListener } from './listeners/application-activity.listener.js';
import { PaymentActivityListener } from './listeners/payment-activity.listener.js';
import { VisitActivityListener } from './listeners/visit-activity.listener.js';
import { ContractActivityListener } from './listeners/contract-activity.listener.js';

/**
 * ActivityLogModule
 *
 * Provides unified activity logging infrastructure:
 * - ActivityLogService.create() for event listeners to record activities
 * - GET /activities endpoint for querying the user's activity feed
 * - Event listeners that capture domain events into the activity feed:
 *   - ApplicationActivityListener: application.submitted, application.statusChanged
 *   - PaymentActivityListener: payment.receiptUploaded, payment.validated, payment.disputeOpened
 *   - VisitActivityListener: visit.requested, visit.statusChanged
 *   - ContractActivityListener: contract.ready, contract.signed, contract.activated
 *
 * Exports ActivityLogService for use by other modules.
 */
@Module({
  controllers: [ActivityLogController],
  providers: [
    ActivityLogService,
    ApplicationActivityListener,
    PaymentActivityListener,
    VisitActivityListener,
    ContractActivityListener,
  ],
  exports: [ActivityLogService],
})
export class ActivityLogModule {}
