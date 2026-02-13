import { Module } from '@nestjs/common';
import { AgencyModule } from '../agency/agency.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [AgencyModule],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class InmobiliariaDashboardModule {}
