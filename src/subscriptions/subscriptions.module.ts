import { Module } from '@nestjs/common';
import { TenantPaymentsModule } from '../tenant-payments/tenant-payments.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { SubscriptionPlansController } from './controllers/subscription-plans.controller.js';
import { SubscriptionsController } from './controllers/subscriptions.controller.js';
import { SubscriptionPlansService } from './services/subscription-plans.service.js';
import { SubscriptionsService } from './services/subscriptions.service.js';
import { PlanEnforcementService } from './services/plan-enforcement.service.js';
import { SubscriptionScheduler } from './scheduled/subscription-scheduler.js';

@Module({
  imports: [TenantPaymentsModule, NotificationsModule],
  controllers: [SubscriptionPlansController, SubscriptionsController],
  providers: [
    SubscriptionPlansService,
    SubscriptionsService,
    PlanEnforcementService,
    SubscriptionScheduler,
  ],
  exports: [
    SubscriptionPlansService,
    SubscriptionsService,
    PlanEnforcementService,
  ],
})
export class SubscriptionsModule {}
