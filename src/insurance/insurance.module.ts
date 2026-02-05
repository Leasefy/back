import { Module } from '@nestjs/common';
import { InsuranceService } from './insurance.service.js';

/**
 * InsuranceModule
 *
 * Provides insurance tier management.
 * Exports InsuranceService for use by ContractsModule.
 *
 * Note: No controller here - the InsuranceController is added in Plan 02.
 */
@Module({
  providers: [InsuranceService],
  exports: [InsuranceService],
})
export class InsuranceModule {}
