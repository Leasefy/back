import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { FlexBillingModule } from '../../flex-billing/flex-billing.module.js';
import { CobrosController } from './cobros.controller.js';
import { CobrosService } from './cobros.service.js';

@Module({
  imports: [AgencyModule, FlexBillingModule],
  controllers: [CobrosController],
  providers: [CobrosService],
  exports: [CobrosService],
})
export class CobrosModule {}
