import { Module } from '@nestjs/common';
import { LandlordDashboardController } from './landlord-dashboard.controller.js';
import { TenantDashboardController } from './tenant-dashboard.controller.js';
import { LandlordDashboardService } from './services/landlord-dashboard.service.js';
import { TenantDashboardService } from './services/tenant-dashboard.service.js';

@Module({
  controllers: [LandlordDashboardController, TenantDashboardController],
  providers: [LandlordDashboardService, TenantDashboardService],
})
export class DashboardModule {}
