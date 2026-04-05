import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { AiInsightsController } from './ai-insights.controller.js';
import { AiInsightsService } from './ai-insights.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [AiInsightsController],
  providers: [AiInsightsService],
})
export class AiInsightsModule {}
