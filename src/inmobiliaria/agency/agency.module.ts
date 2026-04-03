import { Module } from '@nestjs/common';
import { AgencyController } from './agency.controller.js';
import { AgencyService } from './agency.service.js';
import { AgencyMemberGuard } from './guards/agency-member.guard.js';
import { AgencyPermissionGuard } from './guards/agency-permission.guard.js';
import { NotificationsModule } from '../../notifications/notifications.module.js';

@Module({
  imports: [NotificationsModule],
  controllers: [AgencyController],
  providers: [AgencyService, AgencyMemberGuard, AgencyPermissionGuard],
  exports: [AgencyService, AgencyMemberGuard, AgencyPermissionGuard],
})
export class AgencyModule {}
