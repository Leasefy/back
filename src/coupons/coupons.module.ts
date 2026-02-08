import { Module } from '@nestjs/common';
import { CouponsService } from './coupons.service.js';
import { CouponValidationService } from './coupon-validation.service.js';
import { CouponApplicationService } from './coupon-application.service.js';
import {
  CouponsAdminController,
  CouponsPublicController,
} from './coupons.controller.js';

/**
 * CouponsModule
 *
 * Provides coupon management infrastructure:
 * - Admin CRUD operations
 * - Public validation endpoint
 * - Discount calculation service
 *
 * All three services are exported for use by SubscriptionsModule in phase 17-02.
 */
@Module({
  controllers: [CouponsAdminController, CouponsPublicController],
  providers: [
    CouponsService,
    CouponValidationService,
    CouponApplicationService,
  ],
  exports: [CouponsService, CouponValidationService, CouponApplicationService],
})
export class CouponsModule {}
