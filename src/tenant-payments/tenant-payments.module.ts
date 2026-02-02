import { Module } from '@nestjs/common';
import { LandlordPaymentMethodsController } from './landlord-payment-methods/landlord-payment-methods.controller.js';
import { LandlordPaymentMethodsService } from './landlord-payment-methods/landlord-payment-methods.service.js';
import { TenantPaymentsController } from './tenant-payments.controller.js';
import { TenantPaymentsService } from './tenant-payments.service.js';
import { ReceiptStorageService } from './receipt-storage/receipt-storage.service.js';
import { PseMockService } from './pse-mock/pse-mock.service.js';
import { PseMockController } from './pse-mock/pse-mock.controller.js';
import { LeasesModule } from '../leases/leases.module.js';

/**
 * TenantPaymentsModule
 *
 * Module for tenant-initiated payment simulation.
 * Includes:
 * - Landlord payment method configuration
 * - Tenant payment requests with receipt upload
 * - PSE mock payment processing
 *
 * Note: PrismaModule is global, so no need to import.
 *
 * Requirements: TPAY-01 through TPAY-09
 */
@Module({
  imports: [LeasesModule],
  controllers: [
    LandlordPaymentMethodsController,
    TenantPaymentsController,
    PseMockController,
  ],
  providers: [
    LandlordPaymentMethodsService,
    TenantPaymentsService,
    ReceiptStorageService,
    PseMockService,
  ],
  exports: [LandlordPaymentMethodsService, TenantPaymentsService],
})
export class TenantPaymentsModule {}
