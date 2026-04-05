import { Module } from '@nestjs/common';
import { AgencyModule } from '../inmobiliaria/agency/agency.module.js';
import { FlexBillingController } from './flex-billing.controller.js';
import { FlexBillingService } from './flex-billing.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [FlexBillingController],
  providers: [FlexBillingService],
  exports: [FlexBillingService],
})
export class FlexBillingModule {}
