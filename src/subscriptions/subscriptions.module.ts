import { Module } from '@nestjs/common';
import { TenantPaymentsModule } from '../tenant-payments/tenant-payments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SubscriptionPlansService } from './services/subscription-plans.service.js';
import { SubscriptionsService } from './services/subscriptions.service.js';
import { PlanEnforcementService } from './services/plan-enforcement.service.js';

/**
 * SubscriptionsModule
 *
 * Core subscription system:
 * - SubscriptionPlansService: CRUD for plan configs, admin pricing
 * - SubscriptionsService: Subscribe, cancel, change plan, trial, expiry handling
 * - PlanEnforcementService: Check limits (properties, scoring views)
 *
 * Imports:
 * - TenantPaymentsModule: For PseMockService (payment processing)
 * - NotificationsModule: For trial/expiry notifications
 *
 * Note: PrismaModule is global, so no need to import.
 *
 * Exports all 3 services so other modules (Properties, Scoring)
 * can import SubscriptionsModule and use PlanEnforcementService.
 */
@Module({
  imports: [
    TenantPaymentsModule,
    NotificationsModule,
  ],
  providers: [
    SubscriptionPlansService,
    SubscriptionsService,
    PlanEnforcementService,
  ],
  exports: [
    SubscriptionPlansService,
    SubscriptionsService,
    PlanEnforcementService,
  ],
})
export class SubscriptionsModule {}
