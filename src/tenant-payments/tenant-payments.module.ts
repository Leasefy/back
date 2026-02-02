import { Module } from '@nestjs/common';
import { LandlordPaymentMethodsController } from './landlord-payment-methods/landlord-payment-methods.controller.js';
import { LandlordPaymentMethodsService } from './landlord-payment-methods/landlord-payment-methods.service.js';

/**
 * TenantPaymentsModule
 *
 * Module for tenant-initiated payment simulation.
 * Includes landlord payment method configuration and tenant payment requests.
 *
 * Note: PrismaModule is global, so no need to import.
 */
@Module({
  controllers: [LandlordPaymentMethodsController],
  providers: [LandlordPaymentMethodsService],
  exports: [LandlordPaymentMethodsService],
})
export class TenantPaymentsModule {}
