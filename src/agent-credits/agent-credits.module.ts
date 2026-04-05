import { Module } from '@nestjs/common';
import { TenantPaymentsModule } from '../tenant-payments/tenant-payments.module.js';
import { AgentCreditsController } from './agent-credits.controller.js';
import { AgentCreditsService } from './agent-credits.service.js';

@Module({
  imports: [TenantPaymentsModule],
  controllers: [AgentCreditsController],
  providers: [AgentCreditsService],
  exports: [AgentCreditsService],
})
export class AgentCreditsModule {}
