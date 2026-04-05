import { Module } from '@nestjs/common';
import { AgentCreditsModule } from '../agent-credits/agent-credits.module.js';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module.js';
import { EvaluationsController } from './evaluations.controller.js';
import { EvaluationsService } from './evaluations.service.js';
import { AgentMicroClient } from './agent-micro.client.js';

@Module({
  imports: [AgentCreditsModule, SubscriptionsModule],
  controllers: [EvaluationsController],
  providers: [EvaluationsService, AgentMicroClient],
  exports: [EvaluationsService],
})
export class EvaluationsModule {}
