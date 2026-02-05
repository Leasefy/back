import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';
import { InsuranceController } from './insurance.controller.js';

/**
 * InsuranceModule
 *
 * Provides insurance tier management.
 * Exports InsuranceService for use by ContractsModule.
 * InsuranceController provides public endpoints for tier listing.
 */
@Module({
  controllers: [InsuranceController],
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
